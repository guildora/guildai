// DELETE /api/apps/guildai/skills
// Delete a custom skill
// Access: controlled by allowedSkillManageRoles config

import type { Skill } from '../utils/skillTypes'

export default defineEventHandler(async (event) => {
  const { userRoles, config, db } = event.context.guildora

  // Check skill manage roles (superadmin always has access)
  if (!userRoles.includes('superadmin')) {
    const allowedRoles = (config.allowedSkillManageRoles as string ?? 'admin,superadmin').split(',').map((s: string) => s.trim()).filter(Boolean)
    if (!userRoles.some((r: string) => allowedRoles.includes(r))) {
      throw createError({ statusCode: 403, message: 'You do not have permission to delete skills.' })
    }
  }

  const body = await readBody(event)

  if (!body.id || typeof body.id !== 'string') {
    throw createError({ statusCode: 400, message: 'Skill ID is required.' })
  }

  const skills = (await db.get('skills:all') as Skill[]) || []
  const filtered = skills.filter(s => s.id !== body.id)

  if (filtered.length === skills.length) {
    throw createError({ statusCode: 404, message: 'Skill not found.' })
  }

  await db.set('skills:all', filtered)

  return { ok: true }
})
