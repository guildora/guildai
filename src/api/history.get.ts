// GET /api/apps/guildai/history
// List chat conversations for the current user
// Access: requiredRoles: ["moderator"] (enforced by host)

export default defineEventHandler(async (event) => {
  const { userId, db } = event.context.guildora

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Not authenticated.' })
  }

  const entries = await db.list('conv:')

  const conversations = entries
    .filter(e => e.value?.userId === userId)
    .map(e => {
      const conv = e.value
      const msgs = conv.messages || []
      const firstUserMsg = msgs.find((m: any) => m.role === 'user')

      return {
        id: e.key,
        title: firstUserMsg?.content?.slice(0, 100) || 'Untitled',
        messageCount: msgs.length,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt || conv.createdAt,
        messages: msgs
      }
    })
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))

  return { conversations }
})
