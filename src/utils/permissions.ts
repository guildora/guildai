import { ACTION_TYPES } from './actionTypes'

export interface RolePermissions {
  blocked?: boolean
  actions: {
    hub?: string[]
    discord?: string[]
  }
}

export interface ActionPermissions {
  [role: string]: RolePermissions
}

export type Platform = 'hub' | 'discord'

const ROLE_LEVELS: Record<string, number> = {
  temporaer: 0,
  user: 10,
  moderator: 50,
  admin: 80,
  superadmin: 100
}

const ROLE_HIERARCHY: Record<string, string[]> = {
  superadmin: ['superadmin', 'admin', 'moderator', 'user', 'temporaer'],
  admin: ['admin', 'moderator', 'user', 'temporaer'],
  moderator: ['moderator', 'user', 'temporaer'],
  user: ['user', 'temporaer'],
  temporaer: ['temporaer']
}


function parseCSV(value: string | undefined | null): string[] {
  return (value || '').split(',').map(s => s.trim()).filter(Boolean)
}

/**
 * Get the highest permission role from a list of roles.
 */
export function getHighestRole(roles: string[]): string | null {
  let highest: string | null = null
  let highestLevel = -1
  for (const r of roles) {
    const level = ROLE_LEVELS[r] ?? -1
    if (level > highestLevel) {
      highest = r
      highestLevel = level
    }
  }
  return highest
}

/**
 * Resolve ActionPermissions from config, with legacy fallback.
 */
export function resolvePermissions(config: Record<string, unknown>): ActionPermissions {
  // New config: actionPermissions
  if (config.actionPermissions) {
    try {
      const parsed = typeof config.actionPermissions === 'string'
        ? JSON.parse(config.actionPermissions)
        : config.actionPermissions
      return parsed as ActionPermissions
    } catch {
      // Malformed JSON — fall through to legacy fallback
    }
  }

  // Legacy fallback: build from old config keys
  const allowedChatRoles = parseCSV(config.allowedChatRoles as string ?? 'moderator,admin,superadmin')
  const allowedActionRoles = parseCSV(config.allowedActionRoles as string ?? 'admin,superadmin')
  const allActions = Object.keys(ACTION_TYPES)

  const allRoles = ['temporaer', 'user', 'moderator', 'admin', 'superadmin']

  const result: ActionPermissions = {}
  for (const role of allRoles) {
    if (role === 'superadmin') {
      result[role] = { actions: { hub: ['*'], discord: ['*'] } }
      continue
    }

    if (!allowedChatRoles.includes(role)) {
      result[role] = {
        blocked: role === 'temporaer',
        actions: { hub: [], discord: [] }
      }
    } else if (allowedActionRoles.includes(role)) {
      // Can chat AND confirm actions — all actions on both platforms
      result[role] = {
        actions: {
          hub: allActions,
          discord: allActions
        }
      }
    } else {
      // Can chat but not confirm actions (read-only)
      result[role] = {
        actions: { hub: [], discord: [] }
      }
    }
  }

  return result
}

/**
 * Check if a user is blocked based on their highest role.
 */
export function isRoleBlocked(permissions: ActionPermissions, userRoles: string[]): boolean {
  const highest = getHighestRole(userRoles)
  if (!highest) return true
  // superadmin is never blocked
  if (highest === 'superadmin') return false
  return permissions[highest]?.blocked === true
}

/**
 * Check if a user can chat (not blocked).
 */
export function canChat(permissions: ActionPermissions, userRoles: string[]): boolean {
  if (userRoles.includes('superadmin')) return true
  return !isRoleBlocked(permissions, userRoles)
}

/**
 * Get allowed actions for a user on a platform.
 * Respects role hierarchy: collects actions from the user's highest role
 * and all lower roles in the hierarchy.
 */
export function getAllowedActions(
  permissions: ActionPermissions,
  userRoles: string[],
  platform: Platform
): string[] {
  if (userRoles.includes('superadmin')) return expandWildcard(['*'])

  const highest = getHighestRole(userRoles)
  if (!highest) return []
  if (permissions[highest]?.blocked) return []

  // Collect actions from this role and all inherited roles
  const inheritedRoles = ROLE_HIERARCHY[highest] || [highest]
  const actionSet = new Set<string>()

  for (const role of inheritedRoles) {
    const rolePerms = permissions[role]
    if (!rolePerms || rolePerms.blocked) continue
    const platformActions = rolePerms.actions?.[platform] || []
    for (const action of platformActions) {
      actionSet.add(action)
    }
  }

  return expandWildcard([...actionSet])
}

/**
 * Check if a user can execute a specific action on a platform.
 */
export function canExecuteAction(
  permissions: ActionPermissions,
  userRoles: string[],
  platform: Platform,
  actionType: string
): boolean {
  const allowed = getAllowedActions(permissions, userRoles, platform)
  return allowed.includes(actionType)
}

/**
 * Expand wildcard "*" to all known actions.
 * The permissions matrix is the source of truth — no additional filtering.
 */
function expandWildcard(actions: string[]): string[] {
  if (actions.includes('*')) {
    return Object.keys(ACTION_TYPES)
  }
  return actions
}

/**
 * Get default action permissions structure.
 */
export function getDefaultPermissions(): ActionPermissions {
  return {
    temporaer: { blocked: true, actions: {} },
    user: { actions: { hub: [], discord: [] } },
    moderator: { actions: { hub: [], discord: [] } },
    admin: {
      actions: {
        hub: ['assign_role', 'remove_role', 'kick_user', 'ban_user', 'create_channel', 'rename_channel', 'move_channel', 'delete_channel', 'send_message', 'delete_message', 'create_skill'],
        discord: ['assign_role', 'remove_role', 'create_channel', 'rename_channel', 'move_channel', 'send_message', 'delete_message', 'create_skill']
      }
    },
    superadmin: { actions: { hub: ['*'], discord: ['*'] } }
  }
}

/**
 * Validate actionPermissions structure. Returns error message or null.
 */
export function validateActionPermissions(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return 'actionPermissions must be an object.'
  }

  const validRoles = ['temporaer', 'user', 'moderator', 'admin', 'superadmin']
  const validActions = new Set([...Object.keys(ACTION_TYPES), '*'])
  const obj = value as Record<string, unknown>

  for (const [role, perms] of Object.entries(obj)) {
    if (!validRoles.includes(role)) {
      return `Invalid role: "${role}". Must be one of: ${validRoles.join(', ')}.`
    }

    if (typeof perms !== 'object' || perms === null || Array.isArray(perms)) {
      return `Permission entry for "${role}" must be an object.`
    }

    const entry = perms as Record<string, unknown>

    if (entry.blocked !== undefined && typeof entry.blocked !== 'boolean') {
      return `"blocked" for "${role}" must be a boolean.`
    }

    if (entry.actions !== undefined) {
      if (typeof entry.actions !== 'object' || entry.actions === null || Array.isArray(entry.actions)) {
        return `"actions" for "${role}" must be an object.`
      }

      const actions = entry.actions as Record<string, unknown>
      for (const platform of ['hub', 'discord'] as const) {
        if (actions[platform] !== undefined) {
          if (!Array.isArray(actions[platform])) {
            return `"actions.${platform}" for "${role}" must be an array.`
          }
          for (const action of actions[platform] as unknown[]) {
            if (typeof action !== 'string' || !validActions.has(action)) {
              return `Invalid action "${action}" in "${role}.actions.${platform}". Must be one of: ${[...validActions].join(', ')}.`
            }
          }
        }
      }
    }
  }

  return null
}
