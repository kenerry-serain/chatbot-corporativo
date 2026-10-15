import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ContentBlock,
  type ConverseCommandOutput,
  type Message,
} from '@aws-sdk/client-bedrock-runtime'
import { config } from '../config.js'
import { SYSTEM_PROMPT } from './prompts/system-prompt.js'
import { buildUserMessage } from './prompts/user-message.js'
import { executeToolUse, extractToolUses, toolDefinitions, type ToolCallLog } from './tools/index.js'
import type { ConversationHistoryMessage } from './conversation-history.js'

const bedrock = new BedrockRuntimeClient({})
type ConverseSender = (command: ConverseCommand) => Promise<ConverseCommandOutput>
const defaultConverseSender: ConverseSender = (command) => bedrock.send(command)

export interface BedrockConversationInput {
  content: string
  history?: ConversationHistoryMessage[]
  customerId?: string
  conversationId: string
  messageId: string
}

export interface BedrockConversationResult {
  text: string
  modelId: string
  durationMs: number
  inputTokens: number
  outputTokens: number
  cacheReadInputTokens: number
  cacheWriteInputTokens: number
  toolCalls: ToolCallLog[]
}

function textFrom(content: ContentBlock[] | undefined) {
  return (content || []).flatMap((block) => block.text ? [block.text] : []).join('\n').trim()
}

function guardrailConfig() {
  if (!config.bedrockGuardrailId && !config.bedrockGuardrailVersion) return undefined
  if (!config.bedrockGuardrailId || !config.bedrockGuardrailVersion) {
    throw new Error('BEDROCK_GUARDRAIL_ID e BEDROCK_GUARDRAIL_VERSION devem ser configurados juntos.')
  }
  return {
    guardrailIdentifier: config.bedrockGuardrailId,
    guardrailVersion: config.bedrockGuardrailVersion,
    trace: 'enabled' as const,
  }
}

function conversationMessages(input: BedrockConversationInput): Message[] {
  const history = input.history?.length
    ? input.history
    : [{ role: 'user' as const, content: input.content, messageId: input.messageId }]

  return history.reduce<Message[]>((messages, item) => {
    const text = item.role === 'user'
      ? buildUserMessage(item.content, {
          customerId: input.customerId,
          conversationId: input.conversationId,
          messageId: item.messageId,
        })
      : item.content
    const previous = messages.at(-1)

    // Alguns modelos exigem alternancia de papeis. Mensagens consecutivas do
    // mesmo papel permanecem no contexto como blocos separados no mesmo turno.
    if (previous?.role === item.role) {
      previous.content = [...(previous.content || []), { text }]
    } else {
      messages.push({ role: item.role, content: [{ text }] })
    }
    return messages
  }, [])
}

export async function runBedrockConversation(
  input: BedrockConversationInput,
  sendConverse: ConverseSender = defaultConverseSender,
): Promise<BedrockConversationResult> {
  const startedAt = Date.now()
  const messages = conversationMessages(input)
  const toolCalls: ToolCallLog[] = []
  let inputTokens = 0
  let outputTokens = 0
  let cacheReadInputTokens = 0
  let cacheWriteInputTokens = 0

  for (let round = 1; round <= config.bedrockMaxToolRounds + 1; round += 1) {
    const callStartedAt = Date.now()
    const response = await sendConverse(new ConverseCommand({
      modelId: config.bedrockModelId,
      system: [{ text: SYSTEM_PROMPT }],
      messages,
      inferenceConfig: {
        maxTokens: config.bedrockMaxTokens,
        temperature: config.bedrockTemperature,
      },
      toolConfig: { tools: toolDefinitions },
      guardrailConfig: guardrailConfig(),
      requestMetadata: {
        application: 'autoatende',
        conversationId: input.conversationId,
        messageId: input.messageId,
      },
    }))

    inputTokens += response.usage?.inputTokens || 0
    outputTokens += response.usage?.outputTokens || 0
    cacheReadInputTokens += response.usage?.cacheReadInputTokens || 0
    cacheWriteInputTokens += response.usage?.cacheWriteInputTokens || 0
    console.info('Bedrock Converse completed', {
      modelId: config.bedrockModelId,
      conversationId: input.conversationId,
      messageId: input.messageId,
      round,
      stopReason: response.stopReason,
      durationMs: Date.now() - callStartedAt,
      modelLatencyMs: response.metrics?.latencyMs,
      inputTokens: response.usage?.inputTokens,
      outputTokens: response.usage?.outputTokens,
      totalTokens: response.usage?.totalTokens,
      cacheReadInputTokens: response.usage?.cacheReadInputTokens,
      cacheWriteInputTokens: response.usage?.cacheWriteInputTokens,
    })

    const assistantMessage = response.output?.message
    if (!assistantMessage?.content) throw new Error('O Bedrock não retornou conteúdo na resposta.')
    messages.push(assistantMessage)

    if (response.stopReason !== 'tool_use') {
      const text = textFrom(assistantMessage.content)
      if (!text) throw new Error(`O Bedrock encerrou com stopReason=${response.stopReason} sem texto.`)
      return {
        text,
        modelId: config.bedrockModelId,
        durationMs: Date.now() - startedAt,
        inputTokens,
        outputTokens,
        cacheReadInputTokens,
        cacheWriteInputTokens,
        toolCalls,
      }
    }

    if (round > config.bedrockMaxToolRounds) {
      throw new Error(`O Bedrock excedeu o limite de ${config.bedrockMaxToolRounds} rodadas de tools.`)
    }

    const toolUses = extractToolUses(assistantMessage.content)
    if (!toolUses.length) throw new Error('O Bedrock retornou tool_use sem fornecer uma tool.')
    const results = await Promise.all(toolUses.map((toolUse) => executeToolUse(toolUse, {
      authenticatedCustomerId: input.customerId,
    })))
    toolCalls.push(...results.map((result) => result.log))
    messages.push({ role: 'user', content: results.map((result) => result.content) })
  }

  throw new Error('O loop do Bedrock terminou sem produzir uma resposta.')
}
