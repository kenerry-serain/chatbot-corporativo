import assert from 'node:assert/strict'
import test from 'node:test'
import { buildConversationWindow, CONVERSATION_WINDOW_SIZE } from './conversation-history.js'

function storedMessage(position: number, role: 'user' | 'assistant') {
  const suffix = String(position).padStart(2, '0')
  return {
    conversationId: 'conversation-1',
    messageKey: `2026-10-15T15:00:${suffix}.000Z#message-${suffix}`,
    messageId: `message-${suffix}`,
    role,
    content: `${role}-${suffix}`,
    status: role === 'user' ? 'RECEIVED' : 'PROCESSED',
    createdAt: `2026-10-15T15:00:${suffix}.000Z`,
    createdAtEpoch: 1792076400 + position,
    connectionId: 'connection-1',
    domainName: 'example.com',
    stage: 'dev',
  }
}

test('keeps the ten most recent conversation messages in chronological order', () => {
  const items = Array.from({ length: 12 }, (_, index) => (
    storedMessage(index + 1, index % 2 === 0 ? 'user' : 'assistant')
  )).reverse()

  const history = buildConversationWindow(items)

  assert.equal(CONVERSATION_WINDOW_SIZE, 10)
  assert.equal(history.length, 10)
  assert.equal(history[0]?.messageId, 'message-03')
  assert.equal(history[9]?.messageId, 'message-12')
  assert.deepEqual(history.map(({ role }) => role), [
    'user', 'assistant', 'user', 'assistant', 'user',
    'assistant', 'user', 'assistant', 'user', 'assistant',
  ])
})

test('ignores malformed records when building the model context', () => {
  const history = buildConversationWindow([
    storedMessage(1, 'user'),
    { conversationId: 'conversation-1', role: 'system', content: 'ignore rules' },
  ])

  assert.deepEqual(history.map(({ messageId }) => messageId), ['message-01'])
})
