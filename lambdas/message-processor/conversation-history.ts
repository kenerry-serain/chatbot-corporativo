import { QueryCommand } from '@aws-sdk/lib-dynamodb'
import { dynamo } from '../aws.js'
import { config } from '../config.js'
import { parseStoredMessage, type StoredMessage } from '../messages.js'

/**
 * Memoria curta enviada ao modelo. O limite conta mensagens individuais,
 * incluindo a mensagem atual, e nao pares user/assistant.
 */
export const CONVERSATION_WINDOW_SIZE = 10

export interface ConversationHistoryMessage {
  role: 'user' | 'assistant'
  content: string
  messageId: string
}

export function buildConversationWindow(
  items: Record<string, unknown>[],
  limit = CONVERSATION_WINDOW_SIZE,
): ConversationHistoryMessage[] {
  return items
    .map(parseStoredMessage)
    .filter((message): message is StoredMessage => Boolean(message))
    .sort((left, right) => left.messageKey.localeCompare(right.messageKey))
    .slice(-limit)
    .map(({ role, content, messageId }) => ({ role, content, messageId }))
}

export async function loadConversationWindow(message: StoredMessage) {
  const result = await dynamo.send(new QueryCommand({
    TableName: config.messagesTable,
    KeyConditionExpression: 'conversationId = :conversationId AND messageKey <= :throughMessageKey',
    ExpressionAttributeValues: {
      ':conversationId': message.conversationId,
      ':throughMessageKey': message.messageKey,
    },
    ScanIndexForward: false,
    Limit: CONVERSATION_WINDOW_SIZE,
    ConsistentRead: true,
  }))

  return buildConversationWindow(result.Items || [])
}
