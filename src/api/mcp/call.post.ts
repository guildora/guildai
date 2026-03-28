// POST /api/apps/guildai/mcp/call
// Execute an MCP tool call
// Access: token-based (validated in handler)

import { isValidActionType } from '../../utils/actionTypes'
import { executeAction, logAction } from '../../utils/botBridge'
import type { ExtractedAction } from '../../utils/actionExtractor'

export default defineEventHandler(async (event) => {
  const { guildId, config, db } = event.context.guildora

  // Validate MCP token
  const authHeader = getRequestHeader(event, 'authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const validToken = await db.get('mcp:token')

  if (!validToken || token !== validToken) {
    throw createError({ statusCode: 401, message: 'Invalid or missing MCP token.' })
  }

  const body = await readBody(event)
  const toolName = body?.tool
  const args = body?.arguments || {}

  if (!toolName || typeof toolName !== 'string') {
    throw createError({ statusCode: 400, message: 'tool is required.' })
  }

  if (!isValidActionType(toolName)) {
    throw createError({ statusCode: 400, message: `Unknown tool: ${toolName}` })
  }

  const action: ExtractedAction = {
    type: toolName,
    params: args,
    rawText: ''
  }

  const result = await executeAction(guildId, action, config)

  // Log if enabled
  if (config.loggingEnabled ?? true) {
    const actionId = `mcp:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`
    await logAction(db, actionId, 'mcp-client', action, result, true, 'mcp')
  }

  return { result }
})
