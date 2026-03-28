import { isValidActionType } from './actionTypes'
import type { ExtractedAction } from './actionExtractor'

interface AppDb {
  get(key: string): Promise<any | null>
  set(key: string, value: any): Promise<void>
}

const BOT_URL = process.env.BOT_INTERNAL_URL || 'http://localhost:3050'
const BOT_TOKEN = process.env.BOT_INTERNAL_TOKEN || ''

function normalizeUnicode(str: string): string {
  let normalized = str.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  let result = ''
  for (let i = 0; i < normalized.length; i++) {
    const cp = normalized.codePointAt(i)!
    if (cp > 0xFFFF) i++
    if (cp >= 0x1D400 && cp <= 0x1D419) { result += String.fromCharCode(65 + cp - 0x1D400); continue }
    if (cp >= 0x1D41A && cp <= 0x1D433) { result += String.fromCharCode(97 + cp - 0x1D41A); continue }
    if (cp >= 0x1D434 && cp <= 0x1D44D) { result += String.fromCharCode(65 + cp - 0x1D434); continue }
    if (cp >= 0x1D44E && cp <= 0x1D467) { result += String.fromCharCode(97 + cp - 0x1D44E); continue }
    if (cp >= 0x1D468 && cp <= 0x1D481) { result += String.fromCharCode(65 + cp - 0x1D468); continue }
    if (cp >= 0x1D482 && cp <= 0x1D49B) { result += String.fromCharCode(97 + cp - 0x1D482); continue }
    if (cp >= 0x1D49C && cp <= 0x1D4B5) { result += String.fromCharCode(65 + cp - 0x1D49C); continue }
    if (cp >= 0x1D4B6 && cp <= 0x1D4CF) { result += String.fromCharCode(97 + cp - 0x1D4B6); continue }
    if (cp >= 0x1D4D0 && cp <= 0x1D4E9) { result += String.fromCharCode(65 + cp - 0x1D4D0); continue }
    if (cp >= 0x1D4EA && cp <= 0x1D503) { result += String.fromCharCode(97 + cp - 0x1D4EA); continue }
    if (cp >= 0x1D504 && cp <= 0x1D51D) { result += String.fromCharCode(65 + cp - 0x1D504); continue }
    if (cp >= 0x1D51E && cp <= 0x1D537) { result += String.fromCharCode(97 + cp - 0x1D51E); continue }
    if (cp >= 0x1D56C && cp <= 0x1D585) { result += String.fromCharCode(65 + cp - 0x1D56C); continue }
    if (cp >= 0x1D586 && cp <= 0x1D59F) { result += String.fromCharCode(97 + cp - 0x1D586); continue }
    if (cp >= 0x1D5A0 && cp <= 0x1D5B9) { result += String.fromCharCode(65 + cp - 0x1D5A0); continue }
    if (cp >= 0x1D5BA && cp <= 0x1D5D3) { result += String.fromCharCode(97 + cp - 0x1D5BA); continue }
    if (cp >= 0x1D670 && cp <= 0x1D689) { result += String.fromCharCode(65 + cp - 0x1D670); continue }
    if (cp >= 0x1D68A && cp <= 0x1D6A3) { result += String.fromCharCode(97 + cp - 0x1D68A); continue }
    if (cp >= 0xFF21 && cp <= 0xFF3A) { result += String.fromCharCode(65 + cp - 0xFF21); continue }
    if (cp >= 0xFF41 && cp <= 0xFF5A) { result += String.fromCharCode(97 + cp - 0xFF41); continue }
    result += String.fromCodePoint(cp)
  }
  return result
}

async function resolveChannelId(channelId: string | undefined, channelName: string | undefined): Promise<{ id: string } | { error: string }> {
  if (channelId) return { id: channelId }
  if (!channelName) return { error: 'Missing channelId or channelName.' }

  const data = await botRequest('/internal/guild/channels/list', { method: 'GET' })
  const channels: Array<{ id: string; name: string }> = data.channels || []
  const nameLower = normalizeUnicode(channelName).toLowerCase()

  const exact = channels.filter(c => normalizeUnicode(c.name).toLowerCase() === nameLower)
  if (exact.length === 1) return { id: exact[0].id }

  const fuzzy = channels.filter(c => {
    const n = normalizeUnicode(c.name).toLowerCase()
    return n.includes(nameLower) || nameLower.includes(n)
  })
  if (fuzzy.length === 1) return { id: fuzzy[0].id }
  if (fuzzy.length > 1) return { error: `Multiple channels found matching "${channelName}". Please provide a channelId.` }

  return { error: `Channel "${channelName}" not found.` }
}

async function botRequest(path: string, options: { method?: string; body?: Record<string, any> } = {}): Promise<any> {
  const response = await fetch(`${BOT_URL}${path}`, {
    method: options.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${BOT_TOKEN}`
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Bot error (${response.status}): ${text}`)
  }

  return response.json()
}

export async function executeAction(
  guildId: string,
  action: ExtractedAction,
  config: Record<string, any>
): Promise<{ success: boolean; message: string; error?: string }> {
  if (!isValidActionType(action.type)) {
    return { success: false, message: '', error: `Unknown action type: ${action.type}` }
  }

  // Whitelist check
  const enabledActions = (config.enabledActions as string || '').split(',').map(s => s.trim()).filter(Boolean)
  if (!enabledActions.includes(action.type)) {
    return { success: false, message: '', error: 'Action not enabled in settings.' }
  }

  // Read-only mode
  if (config.readOnlyMode) {
    return {
      success: true,
      message: `[READ-ONLY] Would execute: ${action.type} with ${JSON.stringify(action.params)}`
    }
  }

  try {
    switch (action.type) {
      case 'assign_role': {
        const { userId, roleId } = action.params
        if (!userId || !roleId) return { success: false, message: '', error: 'Missing userId or roleId.' }
        await botRequest(`/internal/guild/members/${encodeURIComponent(userId)}/add-roles`, {
          body: { roleIds: [roleId] }
        })
        return { success: true, message: `Role assigned to user ${userId}.` }
      }

      case 'remove_role': {
        const { userId, roleId } = action.params
        if (!userId || !roleId) return { success: false, message: '', error: 'Missing userId or roleId.' }
        await botRequest(`/internal/guild/members/${encodeURIComponent(userId)}/remove-roles`, {
          body: { roleIds: [roleId] }
        })
        return { success: true, message: `Role removed from user ${userId}.` }
      }

      case 'kick_user': {
        const { userId, reason } = action.params
        if (!userId) return { success: false, message: '', error: 'Missing userId.' }
        await botRequest(`/internal/guild/members/${encodeURIComponent(userId)}/kick`, {
          body: { reason: reason || 'Kicked via GuildAI' }
        })
        return { success: true, message: `User ${userId} kicked.` }
      }

      case 'ban_user': {
        const { userId, reason } = action.params
        if (!userId) return { success: false, message: '', error: 'Missing userId.' }
        await botRequest(`/internal/guild/members/${encodeURIComponent(userId)}/ban`, {
          body: { reason: reason || 'Banned via GuildAI' }
        })
        return { success: true, message: `User ${userId} banned.` }
      }

      case 'create_channel': {
        const { name, type } = action.params
        if (!name) return { success: false, message: '', error: 'Missing channel name.' }
        const result = await botRequest('/internal/guild/channels/create', {
          body: { name, type: type || 'text' }
        })
        return { success: true, message: `Channel "${result.channelName}" created (ID: ${result.channelId}).` }
      }

      case 'rename_channel': {
        const { name } = action.params
        if (!name) return { success: false, message: '', error: 'Missing name.' }
        const renameResolved = await resolveChannelId(action.params.channelId, action.params.channelName)
        if ('error' in renameResolved) return { success: false, message: '', error: renameResolved.error }
        await botRequest(`/internal/guild/channels/${encodeURIComponent(renameResolved.id)}`, {
          method: 'PATCH',
          body: { name }
        })
        return { success: true, message: `Channel ${renameResolved.id} renamed to "${name}".` }
      }

      case 'delete_channel': {
        const deleteResolved = await resolveChannelId(action.params.channelId, action.params.channelName)
        if ('error' in deleteResolved) return { success: false, message: '', error: deleteResolved.error }
        await botRequest(`/internal/guild/channels/${encodeURIComponent(deleteResolved.id)}`, {
          method: 'DELETE'
        })
        return { success: true, message: `Channel ${deleteResolved.id} deleted.` }
      }

      case 'delete_message': {
        const { messageId } = action.params
        const dmResolved = await resolveChannelId(action.params.channelId, action.params.channelName)
        if ('error' in dmResolved) return { success: false, message: '', error: dmResolved.error }
        if (!messageId) return { success: false, message: '', error: 'Missing messageId.' }
        await botRequest(`/internal/guild/channels/${encodeURIComponent(dmResolved.id)}/messages/${encodeURIComponent(messageId)}`, {
          method: 'DELETE'
        })
        return { success: true, message: `Message ${messageId} deleted.` }
      }

      case 'move_channel': {
        let { parentId } = action.params
        const moveResolved = await resolveChannelId(action.params.channelId, action.params.channelName)
        if ('error' in moveResolved) return { success: false, message: '', error: moveResolved.error }
        if (!parentId && action.params.categoryName) {
          const catResolved = await resolveChannelId(undefined, action.params.categoryName)
          if ('error' in catResolved) return { success: false, message: '', error: catResolved.error }
          parentId = catResolved.id
        }
        if (!parentId) return { success: false, message: '', error: 'Missing parentId or categoryName.' }
        await botRequest(`/internal/guild/channels/${encodeURIComponent(moveResolved.id)}`, {
          method: 'PATCH',
          body: { parentId }
        })
        return { success: true, message: `Channel ${moveResolved.id} moved to category ${parentId}.` }
      }

      case 'send_message': {
        const { content } = action.params
        const sendResolved = await resolveChannelId(action.params.channelId, action.params.channelName)
        if ('error' in sendResolved) return { success: false, message: '', error: sendResolved.error }
        if (!content) return { success: false, message: '', error: 'Missing content.' }
        await botRequest(`/internal/guild/channels/${encodeURIComponent(sendResolved.id)}/send`, {
          body: { message: content }
        })
        return { success: true, message: `Message sent to channel ${sendResolved.id}.` }
      }

      default:
        return { success: false, message: '', error: `Unknown action: ${action.type}` }
    }
  } catch (err: any) {
    return {
      success: false,
      message: '',
      error: `Bot Bridge error: ${err.message}`
    }
  }
}

export async function logAction(
  db: AppDb,
  actionId: string,
  userId: string,
  action: ExtractedAction,
  result: { success: boolean; message: string; error?: string },
  approved: boolean,
  source: string = 'hub'
): Promise<void> {
  await db.set(`actionlog:${Date.now()}:${actionId}`, {
    userId,
    action: { type: action.type, params: action.params },
    result,
    approved,
    source,
    timestamp: Date.now(),
    expiresAt: Date.now() + (90 * 24 * 60 * 60 * 1000)
  })
}
