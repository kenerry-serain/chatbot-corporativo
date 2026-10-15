function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

interface UserMessageContext {
  customerId?: string
  conversationId: string
  messageId: string
}

/**
 * Mantém o texto do usuário separado do prompt de sistema e escapa delimitadores.
 * Isso reduz ambiguidades de prompt injection, mas não substitui validação e Guardrails.
 */
export function buildUserMessage(content: string, context: UserMessageContext) {
  return [
    `<request_context customer_id="${escapeXml(context.customerId || 'unknown')}" conversation_id="${escapeXml(context.conversationId)}" message_id="${escapeXml(context.messageId)}" />`,
    '<untrusted_user_message>',
    escapeXml(content),
    '</untrusted_user_message>',
  ].join('\n')
}
