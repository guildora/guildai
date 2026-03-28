// POST /api/apps/guildai/skills
// Create a new custom skill
// Access: controlled by allowedSkillManageRoles config

import type { Skill } from '../utils/skillTypes'
import { generateSkillId, validateSkill } from '../utils/skillTypes'

export default defineEventHandler(async (event) => {
  const { userId, userRoles, config, db } = event.context.guildora

  // Check skill manage roles (superadmin always has access)
  if (!userRoles.includes('superadmin')) {
    const allowedRoles = (config.allowedSkillManageRoles as string ?? 'admin,superadmin').split(',').map((s: string) => s.trim()).filter(Boolean)
    if (!userRoles.some((r: string) => allowedRoles.includes(r))) {
      throw createError({ statusCode: 403, message: 'You do not have permission to create skills.' })
    }
  }

  const body = await readBody(event)
  const error = validateSkill(body)
  if (error) {
    throw createError({ statusCode: 400, message: error })
  }

  const skills = (await db.get('skills:all') as Skill[]) || []

  const newSkill: Skill = {
    id: generateSkillId(),
    name: body.name.trim(),
    trigger: body.trigger.trim(),
    content: body.content.trim(),
    createdBy: userId,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }

  skills.push(newSkill)
  await db.set('skills:all', skills)

  return { ok: true, skill: newSkill }
})
