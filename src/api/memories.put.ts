// PUT /api/apps/guildai/memories
// Update an existing memory
// Access: requiredRoles: ["moderator"] (enforced by host)

import type { Memory } from '../utils/memoryTypes'

export default defineEventHandler(async (event) => {
  const { db } = event.context.guildora

  const body = await readBody(event)

  if (!body.id || typeof body.id !== 'string') {
    throw createError({ statusCode: 400, message: 'Memory ID is required.' })
  }

  const memories = (await db.get('memories:all') as Memory[]) || []
  const index = memories.findIndex(m => m.id === body.id)

  if (index === -1) {
    throw createError({ statusCode: 404, message: 'Memory not found.' })
  }

  // Partial update: only update provided fields
  const mem = memories[index]

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length === 0) {
      throw createError({ statusCode: 400, message: 'Title must be a non-empty string.' })
    }
    if (body.title.trim().length > 100) {
      throw createError({ statusCode: 400, message: 'Title must be at most 100 characters.' })
    }
    mem.title = body.title.trim()
  }

  if (body.content !== undefined) {
    if (typeof body.content !== 'string' || body.content.trim().length === 0) {
      throw createError({ statusCode: 400, message: 'Content must be a non-empty string.' })
    }
    if (body.content.trim().length > 1000) {
      throw createError({ statusCode: 400, message: 'Content must be at most 1000 characters.' })
    }
    mem.content = body.content.trim()
  }

  if (body.summary !== undefined) {
    if (typeof body.summary !== 'string' || body.summary.trim().length === 0) {
      throw createError({ statusCode: 400, message: 'Summary must be a non-empty string.' })
    }
    if (body.summary.trim().length > 300) {
      throw createError({ statusCode: 400, message: 'Summary must be at most 300 characters.' })
    }
    mem.summary = body.summary.trim()
  }

  if (body.keywords !== undefined) {
    if (typeof body.keywords !== 'string' || body.keywords.trim().length === 0) {
      throw createError({ statusCode: 400, message: 'Keywords must be a non-empty string.' })
    }
    if (body.keywords.trim().length > 100) {
      throw createError({ statusCode: 400, message: 'Keywords must be at most 100 characters.' })
    }
    mem.keywords = body.keywords.trim()
  }

  if (body.pinned !== undefined) {
    mem.pinned = body.pinned === true
  }

  mem.updatedAt = Date.now()
  memories[index] = mem

  await db.set('memories:all', memories)

  return { ok: true, memory: mem }
})
