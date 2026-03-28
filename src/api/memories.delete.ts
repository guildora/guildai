// DELETE /api/apps/guildai/memories
// Delete a saved memory
// Access: requiredRoles: ["moderator"] (enforced by host)

import type { Memory } from '../utils/memoryTypes'

export default defineEventHandler(async (event) => {
  const { db } = event.context.guildora

  const body = await readBody(event)

  if (!body.id || typeof body.id !== 'string') {
    throw createError({ statusCode: 400, message: 'Memory ID is required.' })
  }

  const memories = (await db.get('memories:all') as Memory[]) || []
  const filtered = memories.filter(m => m.id !== body.id)

  if (filtered.length === memories.length) {
    throw createError({ statusCode: 404, message: 'Memory not found.' })
  }

  await db.set('memories:all', filtered)

  return { ok: true }
})
