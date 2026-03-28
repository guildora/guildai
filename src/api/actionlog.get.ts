// GET /api/apps/guildai/actionlog
// List action audit log entries
// Access: admin or superadmin only (enforced by host via manifest requiredRoles)

export default defineEventHandler(async (event) => {
  const { db } = event.context.guildora

  const query = getQuery(event)
  const sourceFilter = (query.source as string) || ''

  const entries = await db.list('actionlog:')
  const now = Date.now()

  const logs = entries
    .map((e: any) => ({ key: e.key, ...e.value }))
    .filter((log: any) => {
      // Filter expired
      if (log.expiresAt && log.expiresAt < now) return false
      // Filter by source if specified
      if (sourceFilter && log.source !== sourceFilter) return false
      return true
    })
    .sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0))
    .slice(0, 200) // Limit to 200 entries

  return { logs }
})
