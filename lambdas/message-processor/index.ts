import { GoneException, PostToConnectionCommand } from '@aws-sdk/client-apigatewaymanagementapi'
import type { AttributeValue } from '@aws-sdk/client-dynamodb'
import { DeleteCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import { unmarshall } from '@aws-sdk/util-dynamodb'
import type { DynamoDBBatchResponse, DynamoDBRecord, DynamoDBStreamEvent, Handler } from 'aws-lambda'
import { createManagementClient, dynamo } from '../aws.js'
import { config } from '../config.js'
import { assistantMessagePayload, createAssistantMessageItem, parseStoredMessage } from '../messages.js'
import { managementEndpoint } from '../websocket.js'
import { runBedrockConversation } from './bedrock.js'
import { loadConversationWindow } from './conversation-history.js'

async function processRecord(record: DynamoDBRecord) {
  if (record.eventName !== 'INSERT' || !record.dynamodb?.NewImage) return

  const image = unmarshall(record.dynamodb.NewImage as Record<string, AttributeValue>)
  const message = parseStoredMessage(image)
  if (!message) {
    console.warn('DynamoDB stream record ignored because required message fields are missing', {
      eventId: record.eventID,
    })
    return
  }
  if (message.role !== 'user') {
    console.info('DynamoDB stream record ignored because it is not a user message', {
      eventId: record.eventID,
      messageId: message.messageId,
      role: message.role,
    })
    return
  }

  const management = createManagementClient(
    managementEndpoint(message.domainName, message.stage, config.callbackEndpoint),
  )
  const interactionStartedAt = Date.now()

  try {
    const history = await loadConversationWindow(message)
    const bedrockResponse = await runBedrockConversation({
      content: message.content,
      history,
      customerId: message.userId,
      conversationId: message.conversationId,
      messageId: message.messageId,
    })

    const assistantMessage = createAssistantMessageItem({
      userMessage: message,
      content: bedrockResponse.text,
      modelId: bedrockResponse.modelId,
    })
    await dynamo.send(new PutCommand({
      TableName: config.messagesTable,
      Item: assistantMessage,
      ConditionExpression: 'attribute_not_exists(conversationId) AND attribute_not_exists(messageKey)',
    }))

    await management.send(new PostToConnectionCommand({
      ConnectionId: message.connectionId,
      Data: Buffer.from(JSON.stringify(assistantMessagePayload(message, bedrockResponse.text, {
        modelId: bedrockResponse.modelId,
        durationMs: bedrockResponse.durationMs,
        inputTokens: bedrockResponse.inputTokens,
        outputTokens: bedrockResponse.outputTokens,
        cacheReadInputTokens: bedrockResponse.cacheReadInputTokens,
        cacheWriteInputTokens: bedrockResponse.cacheWriteInputTokens,
        tools: bedrockResponse.toolCalls.map((tool) => tool.name),
      }))),
    }))
    console.info('Bedrock response sent to WebSocket connection', {
      messageId: message.messageId,
      conversationId: message.conversationId,
      connectionId: message.connectionId,
      modelId: bedrockResponse.modelId,
      tools: bedrockResponse.toolCalls.map((tool) => tool.name),
      toolDurationMs: bedrockResponse.toolCalls.reduce((sum, tool) => sum + tool.durationMs, 0),
      bedrockDurationMs: bedrockResponse.durationMs,
      interactionDurationMs: Date.now() - interactionStartedAt,
      inputTokens: bedrockResponse.inputTokens,
      outputTokens: bedrockResponse.outputTokens,
      cacheReadInputTokens: bedrockResponse.cacheReadInputTokens,
      cacheWriteInputTokens: bedrockResponse.cacheWriteInputTokens,
      historyMessageCount: history.length,
    })
  } catch (error) {
    if (error instanceof GoneException || (error as { name?: string })?.name === 'GoneException') {
      await dynamo.send(new DeleteCommand({
        TableName: config.connectionsTable,
        Key: { connectionId: message.connectionId },
      }))
      console.info('Stale WebSocket connection removed while processing stream record', {
        connectionId: message.connectionId,
        messageId: message.messageId,
      })
      return
    }
    throw error
  }
}

export const handler: Handler<DynamoDBStreamEvent, DynamoDBBatchResponse> = async (event) => {
  const batchItemFailures: DynamoDBBatchResponse['batchItemFailures'] = []

  for (const record of event.Records) {
    try {
      await processRecord(record)
    } catch (error) {
      console.error('Failed to process DynamoDB stream record', {
        eventId: record.eventID,
        sequenceNumber: record.dynamodb?.SequenceNumber,
        error,
      })
      if (record.dynamodb?.SequenceNumber) {
        batchItemFailures.push({ itemIdentifier: record.dynamodb.SequenceNumber })
      }
    }
  }

  return { batchItemFailures }
}
