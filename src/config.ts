import { Amplify } from 'aws-amplify'

const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID?.trim() || ''
const userPoolClientId = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID?.trim() || ''
const websocketUrl = import.meta.env.VITE_WEBSOCKET_URL?.trim() || ''
const cognitoConfigured = Boolean(userPoolId && userPoolClientId)

export const appConfig = {
  name: import.meta.env.VITE_APP_NAME?.trim() || 'AutoAtende',
  demoEnabled: import.meta.env.VITE_ENABLE_DEMO_MODE !== 'false',
  cognito: {
    isConfigured: cognitoConfigured,
    region: import.meta.env.VITE_AWS_REGION?.trim() || 'us-east-1',
    userPoolId,
    userPoolClientId,
  },
  websocket: {
    isConfigured: /^wss?:\/\//.test(websocketUrl),
    url: websocketUrl,
    action: import.meta.env.VITE_WEBSOCKET_ACTION?.trim() || 'sendMessage',
    authQueryParam: import.meta.env.VITE_WEBSOCKET_AUTH_QUERY_PARAM?.trim() || 'token',
  },
} as const

if (cognitoConfigured) {
  Amplify.configure({
    Auth: { Cognito: { userPoolId, userPoolClientId, loginWith: { email: true } } },
  })
}
