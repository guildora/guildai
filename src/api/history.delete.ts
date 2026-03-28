// DELETE /api/apps/guildai/history
// Delete chat conversations
// Access: requiredRoles: ["moderator"] (enforced by host)

export default defineEventHandler(async (event) => {
  const { userId, db } = event.context.guildora

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Not authenticated.' })
  }

  const body = await readBody(event)
  const conversationId = body?.conversationId

  if (conversationId) {
    // Delete single conversation - verify ownership
    const conv = await db.get(conversationId)
    if (!conv || conv.userId !== userId) {
      throw createError({ statusCode: 404, message: 'Conversation not found.' })
    }
    await db.delete(conversationId)
    return { ok: true, deleted: 1 }
  }

  // Delete all conversations for user
  const entries = await db.list('conv:')
  let deleted = 0
  for (const entry of entries) {
    if (entry.value?.userId === userId) {
      await db.delete(entry.key)
      deleted++
    }
  }

  return { ok: true, deleted }
})
