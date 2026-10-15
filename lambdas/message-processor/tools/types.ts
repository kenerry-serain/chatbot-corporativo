import type { Tool } from '@aws-sdk/client-bedrock-runtime'

export interface ToolExecutionContext {
  authenticatedCustomerId?: string
}

export interface LocalTool {
  definition: Tool
  execute(input: unknown, context: ToolExecutionContext): Promise<Record<string, unknown>>
}

export class ToolInputError extends Error {
  override name = 'ToolInputError'
}

export function objectInput(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ToolInputError('Os argumentos da tool devem ser um objeto JSON.')
  }
  return input as Record<string, unknown>
}

export function optionalInputString(input: Record<string, unknown>, key: string) {
  const value = input[key]
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string') throw new ToolInputError(`${key} deve ser uma string.`)
  const normalized = value.trim()
  if (!normalized || normalized.length > 120) throw new ToolInputError(`${key} deve ter entre 1 e 120 caracteres.`)
  return normalized
}

export function assertAllowedKeys(input: Record<string, unknown>, allowedKeys: string[]) {
  const unexpected = Object.keys(input).filter((key) => !allowedKeys.includes(key))
  if (unexpected.length) throw new ToolInputError(`Argumentos não permitidos: ${unexpected.join(', ')}.`)
}
