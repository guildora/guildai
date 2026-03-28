// POST /api/apps/guildai/config/regenerate-token
// Regenerate MCP authentication token
// Access: admin or superadmin only (enforced by host via manifest requiredRoles)

export default defineEventHandler(async (event) => {
  const { db } = event.context.guildora

  const token = crypto.randomUUID() + '-' + crypto.randomUUID()
  await db.set('mcp:token', token)

  return { token }
})
