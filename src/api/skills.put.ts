// PUT /api/apps/guildai/skills
// Update an existing custom skill
// Access: controlled by allowedSkillManageRoles config

import type { Skill } from '../utils/skillTypes'
import { validateSkill } from '../utils/skillTypes'

export default defineEventHandler(async (event) => {
  const { userRoles, config, db } = event.context.guildora

  // Check skill manage roles (superadmin always has access)
  if (!userRoles.includes('superadmin')) {
    const allowedRoles = (config.allowedSkillManageRoles as string ?? 'admin,superadmin').split(',').map((s: string) => s.trim()).filter(Boolean)
    if (!userRoles.some((r: string) => allowedRoles.includes(r))) {
      throw createError({ statusCode: 403, message: 'You do not have permission to edit skills.' })
    }
  }

  const body = await readBody(event)

  if (!body.id || typeof body.id !== 'string') {
    throw createError({ statusCode: 400, message: 'Skill ID is required.' })
  }

  const error = validateSkill(body)
  if (error) {
    throw createError({ statusCode: 400, message: error })
  }

  const skills = (await db.get('skills:all') as Skill[]) || []
  const index = skills.findIndex(s => s.id === body.id)

  if (index === -1) {
    throw createError({ statusCode: 404, message: 'Skill not found.' })
  }

  skills[index] = {
    ...skills[index],
    name: body.name.trim(),
    trigger: body.trigger.trim(),
    content: body.content.trim(),
    updatedAt: Date.now()
  }

  await db.set('skills:all', skills)

  return { ok: true, skill: skills[index] }
})
