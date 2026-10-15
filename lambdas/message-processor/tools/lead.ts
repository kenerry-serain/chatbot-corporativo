import lead from '../data/lead.json' with { type: 'json' }
import type { LocalTool } from './types.js'
import { assertAllowedKeys, objectInput, optionalInputString } from './types.js'

export const leadTool: LocalTool = {
  definition: {
    toolSpec: {
      name: 'lookup_lead',
      description: 'Consulta o cliente/lead autenticado para obter nome, status e preferências. Use antes de personalizar a resposta com dados do cliente.',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            customerId: { type: 'string', description: 'Identificador autenticado presente no request_context.' },
            leadId: { type: 'string', description: 'Identificador do lead, quando já for conhecido.' },
          },
          additionalProperties: false,
        },
      },
    },
  },
  async execute(input, context) {
    const values = objectInput(input)
    assertAllowedKeys(values, ['customerId', 'leadId'])
    const requestedCustomerId = optionalInputString(values, 'customerId')
    const requestedLeadId = optionalInputString(values, 'leadId')
    const authenticatedCustomerId = context.authenticatedCustomerId

    if (requestedCustomerId && authenticatedCustomerId && requestedCustomerId !== authenticatedCustomerId) {
      return { found: false, reason: 'O customerId solicitado não pertence à sessão autenticada.' }
    }

    const matchesLead = !requestedLeadId || requestedLeadId === lead.leadId
    const matchesCustomer = !requestedCustomerId
      || requestedCustomerId === lead.customerId
      || requestedCustomerId === lead.cognitoSub
      || requestedCustomerId === authenticatedCustomerId

    if (!matchesLead || !matchesCustomer) return { found: false }

    return {
      found: true,
      lead: {
        leadId: lead.leadId,
        customerId: authenticatedCustomerId || lead.customerId,
        name: lead.name,
        status: lead.status,
        preferredVehicle: lead.preferredVehicle,
        notes: lead.notes,
      },
    }
  },
}
