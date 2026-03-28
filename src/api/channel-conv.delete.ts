// DELETE /api/apps/guildai/channel-conv
// Reset the Discord channel conversation context
// Access: admin or superadmin only

export default defineEventHandler(async (event) => {
  const { config, db } = event.context.guildora

  const channelId = (config.aiChatChannelId as string) || ''
  if (!channelId) {
    throw createError({ statusCode: 400, message: 'No AI chat channel configured.' })
  }

  await db.delete(`channel-conv:${channelId}`)

  return { ok: true }
})
