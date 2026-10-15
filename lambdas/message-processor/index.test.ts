import assert from 'node:assert/strict'
import test from 'node:test'
import { assistantMessagePayload } from '../messages.js'
import { managementEndpoint, parseChatRequest } from '../websocket.js'

test('builds the execute-api management endpoint with the stage', () => {
  assert.equal(
    managementEndpoint('abc.execute-api.us-east-1.amazonaws.com', 'prod'),
    'https://abc.execute-api.us-east-1.amazonaws.com/prod',
  )
})

test('uses an explicit callback endpoint for custom domains', () => {
  assert.equal(managementEndpoint('ignored', 'ignored', 'https://ws.example.com/'), 'https://ws.example.com')
})

test('parses the frontend WebSocket contract', () => {
  assert.deepEqual(parseChatRequest(JSON.stringify({
    action: 'sendMessage',
    conversationId: 'conversation-1',
    message: '  Quero um SUV  ',
  })), {
    action: 'sendMessage',
    conversationId: 'conversation-1',
    message: 'Quero um SUV',
  })
})

test('rejects messages without content', () => {
  assert.throws(() => parseChatRequest('{"action":"sendMessage"}'), /message é obrigatório/)
})

test('creates an assistant payload while preserving the persisted message', () => {
  const payload = assistantMessagePayload({
    conversationId: 'conversation-1',
    messageKey: '2026-10-08T15:00:00.000Z#message-1',
    messageId: 'message-1',
    role: 'user',
    content: 'Quero encontrar um SUV',
    status: 'RECEIVED',
    createdAt: '2026-10-08T15:00:00.000Z',
    createdAtEpoch: 1791471600,
    connectionId: 'connection-1',
    domainName: 'example.com',
    stage: 'dev',
  }, 'Encontrei duas opções para você.', {
    modelId: 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
    durationMs: 850,
    inputTokens: 120,
    outputTokens: 35,
    tools: ['search_inventory'],
  })

  assert.equal(payload.content, 'Encontrei duas opções para você.')
  assert.equal(payload.savedMessage.content, 'Quero encontrar um SUV')
  assert.deepEqual(payload.metadata.tools, ['search_inventory'])
})
