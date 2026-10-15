import { randomUUID } from 'node:crypto'
import type { ChatRequest } from './websocket.js'
import { ValidationError } from './websocket.js'

export interface StoredMessage {
  conversationId: string
  messageKey: string
  messageId: string
  role: 'user' | 'assistant'
  content: string
  status: 'RECEIVED' | 'PROCESSED'
  createdAt: string
  createdAtEpoch: number
  connectionId: string
  domainName: string
  stage: string
  requestId?: string
  userId?: string
  inReplyToMessageId?: string
  modelId?: string
}

interface CreateMessageInput {
  request: ChatRequest
  connection: Record<string, unknown>
  connectionId: string
  domainName: string
  stage: string
  requestId?: string
  now?: Date
  messageId?: string
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value ? value : undefined
}

export function createMessageItem({
  request,
  connection,
  connectionId,
  domainName,
  stage,
  requestId,
  now = new Date(),
  messageId = randomUUID(),
}: CreateMessageInput): StoredMessage {
  const registeredConversationId = optionalString(connection.conversationId)
  if (registeredConversationId && request.conversationId && registeredConversationId !== request.conversationId) {
    throw new ValidationError('O conversationId não corresponde à conexão atual.')
  }

  const conversationId = registeredConversationId || request.conversationId
  if (!conversationId) throw new ValidationError('O conversationId é obrigatório.')

  const createdAt = now.toISOString()
  return {
    conversationId,
    messageKey: `${createdAt}#${messageId}`,
    messageId,
    role: 'user',
    content: request.message,
    status: 'RECEIVED',
    createdAt,
    createdAtEpoch: Math.floor(now.getTime() / 1_000),
    connectionId,
    domainName,
    stage,
    requestId,
    userId: optionalString(connection.userId),
  }
}

export function parseStoredMessage(value: Record<string, unknown>): StoredMessage | null {
  const required = ['conversationId', 'messageKey', 'messageId', 'content', 'createdAt', 'connectionId', 'domainName', 'stage'] as const
  if (required.some((key) => typeof value[key] !== 'string' || !value[key])) return null
  if (value.role !== 'user' && value.role !== 'assistant') return null

  return value as unknown as StoredMessage
}

interface CreateAssistantMessageInput {
  userMessage: StoredMessage
  content: string
  modelId: string
  now?: Date
  messageId?: string
}

export function createAssistantMessageItem({
  userMessage,
  content,
  modelId,
  now = new Date(),
  messageId = randomUUID(),
}: CreateAssistantMessageInput): StoredMessage {
  const createdAt = now.toISOString()
  return {
    conversationId: userMessage.conversationId,
    messageKey: `${createdAt}#${messageId}`,
    messageId,
    role: 'assistant',
    content,
    status: 'PROCESSED',
    createdAt,
    createdAtEpoch: Math.floor(now.getTime() / 1_000),
    connectionId: userMessage.connectionId,
    domainName: userMessage.domainName,
    stage: userMessage.stage,
    requestId: userMessage.requestId,
    userId: userMessage.userId,
    inReplyToMessageId: userMessage.messageId,
    modelId,
  }
}

interface AssistantMetadata {
  modelId: string
  durationMs: number
  inputTokens: number
  outputTokens: number
  cacheReadInputTokens?: number
  cacheWriteInputTokens?: number
  tools: string[]
}

export function assistantMessagePayload(message: StoredMessage, content: string, metadata: AssistantMetadata) {
  return {
    type: 'assistant.message',
    content,
    conversationId: message.conversationId,
    requestId: message.requestId || message.messageId,
    metadata,
    savedMessage: {
      messageId: message.messageId,
      conversationId: message.conversationId,
      role: message.role,
      content: message.content,
      status: message.status,
      createdAt: message.createdAt,
    },
  }
}
