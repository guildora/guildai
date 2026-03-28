// POST /api/apps/guildai/memories
// Create a new memory manually
// Access: requiredRoles: ["moderator"] (enforced by host)

import type { Memory } from '../utils/memoryTypes'
import { generateMemoryId, validateMemory } from '../utils/memoryTypes'

export default defineEventHandler(async (event) => {
  const { userId, db } = event.context.guildora

  const body = await readBody(event)
  const error = validateMemory(body)
  if (error) {
    throw createError({ statusCode: 400, message: error })
  }

  const memories = (await db.get('memories:all') as Memory[]) || []

  // Enforce max 50 memories: remove oldest non-pinned
  if (memories.length >= 50) {
    const oldestNonPinned = memories
      .map((m, i) => ({ pinned: m.pinned, createdAt: m.createdAt, idx: i }))
      .filter(m => !m.pinned)
      .sort((a, b) => a.createdAt - b.createdAt)
    if (oldestNonPinned.length > 0) {
      memories.splice(oldestNonPinned[0].idx, 1)
    }
  }

  const newMemory: Memory = {
    id: generateMemoryId(),
    title: body.title.trim(),
    content: body.content.trim(),
    summary: body.summary.trim(),
    keywords: body.keywords.trim(),
    pinned: body.pinned === true,
    createdBy: userId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    source: 'manual'
  }

  memories.push(newMemory)
  await db.set('memories:all', memories)

  return { ok: true, memory: newMemory }
})
