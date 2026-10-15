function required(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value || '', 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function numberBetween(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number.parseFloat(value || '')
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : fallback
}

export const config = {
  get connectionsTable() { return required('CONNECTIONS_TABLE') },
  get messagesTable() { return required('MESSAGES_TABLE') },
  get cognitoUserPoolId() { return required('COGNITO_USER_POOL_ID') },
  get cognitoUserPoolClientId() { return required('COGNITO_USER_POOL_CLIENT_ID') },
  connectionsTtlHours: positiveInteger(process.env.CONNECTIONS_TTL_HOURS, 24),
  callbackEndpoint: process.env.WEBSOCKET_CALLBACK_ENDPOINT?.trim() || '',
  authorizerQueryParam: process.env.AUTH_TOKEN_QUERY_PARAM?.trim() || 'token',
  bedrockModelId: process.env.BEDROCK_MODEL_ID?.trim() || 'us.anthropic.claude-haiku-4-5-20251001-v1:0',
  bedrockMaxTokens: positiveInteger(process.env.BEDROCK_MAX_TOKENS, 600),
  bedrockMaxToolRounds: positiveInteger(process.env.BEDROCK_MAX_TOOL_ROUNDS, 4),
  bedrockTemperature: numberBetween(process.env.BEDROCK_TEMPERATURE, 0.2, 0, 1),
  bedrockGuardrailId: process.env.BEDROCK_GUARDRAIL_ID?.trim() || '',
  bedrockGuardrailVersion: process.env.BEDROCK_GUARDRAIL_VERSION?.trim() || '',
}
