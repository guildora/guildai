// POST /api/apps/guildai/config/regenerate-token
// Regenerate MCP authentication token
// Access: admin or superadmin only (defense in depth)

export default defineEventHandler(async (event) => {
  const { db, userRoles } = event.context.guildora

  const privileged = ['admin', 'superadmin']
  if (!userRoles.some((r: string) => privileged.includes(r))) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const token = crypto.randomUUID() + '-' + crypto.randomUUID()
  await db.set('mcp:token', token)

  return { token }
})
