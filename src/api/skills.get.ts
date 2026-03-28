// GET /api/apps/guildai/skills
// Returns all custom skills
// Access: controlled by allowedSkillPageRoles config

import type { Skill } from '../utils/skillTypes'

export default defineEventHandler(async (event) => {
  const { userRoles, config, db } = event.context.guildora

  // Check skill page access roles (superadmin always has access)
  if (!userRoles.includes('superadmin')) {
    const allowedRoles = (config.allowedSkillPageRoles as string ?? 'moderator,admin,superadmin').split(',').map((s: string) => s.trim()).filter(Boolean)
    if (!userRoles.some((r: string) => allowedRoles.includes(r))) {
      throw createError({ statusCode: 403, message: 'You do not have permission to view skills.' })
    }
  }

  const skills = (await db.get('skills:all') as Skill[]) || []

  return { skills }
})
