import type { ContentBlock, ToolUseBlock } from '@aws-sdk/client-bedrock-runtime'
import { inventoryTool } from './inventory.js'
import { leadTool } from './lead.js'
import type { LocalTool, ToolExecutionContext } from './types.js'

const tools = new Map<string, LocalTool>([
  ['lookup_lead', leadTool],
  ['search_inventory', inventoryTool],
])

export const toolDefinitions = [...tools.values()].map((tool) => tool.definition)

export interface ToolCallLog {
  name: string
  durationMs: number
  succeeded: boolean
}

export function extractToolUses(content: ContentBlock[] | undefined) {
  return (content || []).flatMap((block) => block.toolUse ? [block.toolUse] : [])
}

export async function executeToolUse(toolUse: ToolUseBlock, context: ToolExecutionContext) {
  const startedAt = Date.now()
  const name = toolUse.name || 'unknown'
  const tool = tools.get(name)

  try {
    if (!tool) throw new Error(`Tool não suportada: ${name}`)
    const result = await tool.execute(toolUse.input, context)
    const durationMs = Date.now() - startedAt
    console.info('Bedrock tool invoked', {
      toolName: name,
      toolUseId: toolUse.toolUseId,
      durationMs,
      succeeded: true,
      resultFound: result.found,
      resultCount: result.count,
    })
    return {
      content: {
        toolResult: {
          toolUseId: toolUse.toolUseId,
          content: [{ json: result }],
          status: 'success' as const,
        },
      } as unknown as ContentBlock,
      log: { name, durationMs, succeeded: true } satisfies ToolCallLog,
    }
  } catch (error) {
    const durationMs = Date.now() - startedAt
    const message = error instanceof Error ? error.message : 'Falha desconhecida na tool.'
    console.warn('Bedrock tool invocation failed', {
      toolName: name,
      toolUseId: toolUse.toolUseId,
      durationMs,
      errorName: error instanceof Error ? error.name : 'UnknownError',
      message,
    })
    return {
      content: {
        toolResult: {
          toolUseId: toolUse.toolUseId,
          content: [{ json: { error: message } }],
          status: 'error' as const,
        },
      } as unknown as ContentBlock,
      log: { name, durationMs, succeeded: false } satisfies ToolCallLog,
    }
  }
}
