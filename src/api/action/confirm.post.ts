// POST /api/apps/guildai/action/confirm
// Approve or reject AI-proposed actions
// Access: requiredRoles: ["moderator"] (enforced by host)

import { executeAction, logAction } from '../../utils/botBridge'
import type { ExtractedAction } from '../../utils/actionExtractor'
import type { Skill } from '../../utils/skillTypes'
import { generateSkillId, validateSkill } from '../../utils/skillTypes'
import { resolvePermissions, isRoleBlocked, canExecuteAction } from '../../utils/permissions'

export default defineEventHandler(async (event) => {
  const { guildId, userId, userRoles, config, db } = event.context.guildora

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Not authenticated.' })
  }

  // Check permissions
  const permissions = resolvePermissions(config)
  if (isRoleBlocked(permissions, userRoles)) {
    throw createError({ statusCode: 403, message: 'Access denied.' })
  }

  const body = await readBody(event)
  const actionId = body?.actionId
  const approved = body?.approved === true

  if (!actionId || typeof actionId !== 'string') {
    throw createError({ statusCode: 400, message: 'actionId is required.' })
  }

  // Load pending action
  const pending = await db.get(`pending:${actionId}`)
  if (!pending) {
    throw createError({ statusCode: 404, message: 'Action not found or already processed.' })
  }

  // Check expiry
  if (Date.now() > pending.expiresAt) {
    await db.delete(`pending:${actionId}`)
    throw createError({ statusCode: 410, message: 'Action has expired.' })
  }

  // Remove pending action
  await db.delete(`pending:${actionId}`)

  const action: ExtractedAction = {
    type: pending.action.type,
    params: pending.action.params,
    rawText: ''
  }

  if (!approved) {
    // Log rejection if logging enabled
    if (config.loggingEnabled ?? true) {
      await logAction(db, actionId, userId, action, { success: false, message: 'Rejected by user.' }, false, 'hub')
    }
    return { ok: true, approved: false, message: 'Action rejected.' }
  }

  // Check per-action permission
  if (!canExecuteAction(permissions, userRoles, 'hub', action.type)) {
    throw createError({ statusCode: 403, message: 'You do not have permission to execute this action.' })
  }

  // Handle create_skill locally (not via bot bridge)
  if (action.type === 'create_skill') {
    const validationError = validateSkill(action.params)
    if (validationError) {
      const errorResult = { success: false, error: validationError }
      if (config.loggingEnabled ?? true) {
        await logAction(db, actionId, userId, action, errorResult, true, 'hub')
      }
      return { ok: true, approved: true, result: errorResult }
    }

    const skills = (await db.get('skills:all') as Skill[]) || []
    const newSkill: Skill = {
      id: generateSkillId(),
      name: action.params.name.trim(),
      trigger: action.params.trigger.trim(),
      content: action.params.content.trim(),
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    skills.push(newSkill)
    await db.set('skills:all', skills)

    const skillResult = { success: true, message: `Skill "${newSkill.name}" created.` }
    if (config.loggingEnabled ?? true) {
      await logAction(db, actionId, userId, action, skillResult, true, 'hub')
    }
    return { ok: true, approved: true, result: skillResult }
  }

  // Execute action via bot bridge
  const result = await executeAction(guildId, action, config)

  // Log if enabled
  if (config.loggingEnabled ?? true) {
    await logAction(db, actionId, userId, action, result, true, 'hub')
  }

  return {
    ok: true,
    approved: true,
    result
  }
})
