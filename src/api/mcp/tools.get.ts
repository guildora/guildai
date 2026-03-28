// GET /api/apps/guildai/mcp/tools
// List available MCP tools based on enabled actions
// Access: token-based (validated in handler)

import { ACTION_TYPES, isValidActionType } from '../../utils/actionTypes'

export default defineEventHandler(async (event) => {
  const { config, db } = event.context.guildora

  // Validate MCP token
  const authHeader = getRequestHeader(event, 'authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const validToken = await db.get('mcp:token')

  if (!validToken || token !== validToken) {
    throw createError({ statusCode: 401, message: 'Invalid or missing MCP token.' })
  }

  const enabledActions = (config.enabledActions as string || '').split(',').map((s: string) => s.trim()).filter(Boolean)

  const tools = enabledActions
    .filter(a => isValidActionType(a))
    .map(actionType => {
      const def = ACTION_TYPES[actionType]
      const properties: Record<string, any> = {}
      const required: string[] = []

      for (const param of def.params) {
        properties[param] = { type: 'string', description: `The ${param} for this action` }
        required.push(param)
      }

      return {
        name: actionType,
        description: def.description,
        inputSchema: {
          type: 'object',
          properties,
          required
        }
      }
    })

  return { tools }
})
