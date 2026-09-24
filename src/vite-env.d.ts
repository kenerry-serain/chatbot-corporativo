/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string
  readonly VITE_AWS_REGION?: string
  readonly VITE_COGNITO_USER_POOL_ID?: string
  readonly VITE_COGNITO_USER_POOL_CLIENT_ID?: string
  readonly VITE_WEBSOCKET_URL?: string
  readonly VITE_WEBSOCKET_ACTION?: string
  readonly VITE_WEBSOCKET_TOKEN_QUERY_PARAM?: string
  readonly VITE_ENABLE_DEMO_MODE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface ModelContextTool {
  name: string
  title?: string
  description: string
  inputSchema: object
  annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean }
  execute(input: unknown): unknown | Promise<unknown>
}

interface Document {
  readonly modelContext?: {
    registerTool(tool: ModelContextTool, options?: { signal?: AbortSignal }): void | Promise<void>
  }
}
