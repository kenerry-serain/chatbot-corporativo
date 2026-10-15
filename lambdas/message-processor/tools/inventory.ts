import inventory from '../data/inventory.json' with { type: 'json' }
import type { LocalTool } from './types.js'
import { assertAllowedKeys, objectInput, optionalInputString } from './types.js'

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
}

function includesFilter(value: string, filter?: string) {
  return !filter || normalize(value).includes(normalize(filter))
}

export const inventoryTool: LocalTool = {
  definition: {
    toolSpec: {
      name: 'search_inventory',
      description: 'Consulta o inventário local de veículos por marca, modelo, cor e status para responder sobre preço e disponibilidade.',
      inputSchema: {
        json: {
          type: 'object',
          properties: {
            make: { type: 'string', description: 'Marca do veículo.' },
            model: { type: 'string', description: 'Modelo do veículo, por exemplo Captur.' },
            color: { type: 'string', description: 'Cor desejada.' },
            status: { type: 'string', enum: ['AVAILABLE', 'RESERVED'], description: 'Status opcional do estoque.' },
          },
          additionalProperties: false,
        },
      },
    },
  },
  async execute(input) {
    const values = objectInput(input)
    assertAllowedKeys(values, ['make', 'model', 'color', 'status'])
    const make = optionalInputString(values, 'make')
    const model = optionalInputString(values, 'model')
    const color = optionalInputString(values, 'color')
    const status = optionalInputString(values, 'status')

    if (status && status !== 'AVAILABLE' && status !== 'RESERVED') {
      return { found: false, reason: 'status deve ser AVAILABLE ou RESERVED.' }
    }

    const vehicles = inventory.filter((vehicle) => (
      includesFilter(vehicle.make, make)
      && includesFilter(vehicle.model, model)
      && includesFilter(vehicle.color, color)
      && (!status || vehicle.status === status)
    ))

    return {
      found: vehicles.length > 0,
      count: vehicles.length,
      vehicles,
      dataSource: 'demo-local-json',
    }
  },
}
