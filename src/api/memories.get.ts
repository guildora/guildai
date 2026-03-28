// GET /api/apps/guildai/memories
// Returns all saved memories
// Access: requiredRoles: ["moderator"] (enforced by host)

import type { Memory } from '../utils/memoryTypes'

export default defineEventHandler(async (event) => {
  const { db } = event.context.guildora

  const memories = (await db.get('memories:all') as Memory[]) || []

  // Sort: pinned first, then by createdAt desc
  memories.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return b.createdAt - a.createdAt
  })

  return { memories }
})
