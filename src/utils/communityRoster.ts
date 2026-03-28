const ROSTER_CACHE_KEY = 'roster:guild'
const ROSTER_CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const MAX_NAMES_PER_ROLE = 10
const MAX_ROSTER_LENGTH = 2000

interface RosterCache {
  text: string
  expiresAt: number
}

type BotRequestFn = (path: string, opts?: { method?: string }) => Promise<any>

export async function buildCommunityRoster(
  db: { get(key: string): Promise<any>; set(key: string, value: any): Promise<void> },
  botRequest: BotRequestFn
): Promise<string> {
  try {
    // Check cache
    const cached = await db.get(ROSTER_CACHE_KEY) as RosterCache | null
    if (cached && cached.expiresAt > Date.now()) {
      return cached.text
    }

    // Fetch roles (already sorted by position desc, @everyone filtered)
    const rolesResult = await botRequest('/internal/guild/roles', { method: 'GET' })
    const roles: Array<{ id: string; name: string; position: number; managed: boolean }> = rolesResult?.roles || []

    // Filter managed/bot roles
    const humanRoles = roles.filter(r => !r.managed)

    // Fetch members per role
    const lines: string[] = []
    for (const role of humanRoles) {
      const membersResult = await botRequest(`/internal/guild/roles/${encodeURIComponent(role.id)}/members`, { method: 'GET' })
      const members: Array<{ displayName: string }> = membersResult?.members || []
      if (members.length === 0) continue

      const names = members.slice(0, MAX_NAMES_PER_ROLE).map(m => m.displayName)
      const overflow = members.length > MAX_NAMES_PER_ROLE ? ` (and ${members.length - MAX_NAMES_PER_ROLE} more)` : ''
      lines.push(`${role.name}: ${names.join(', ')}${overflow}`)
    }

    if (lines.length === 0) {
      await db.set(ROSTER_CACHE_KEY, { text: '', expiresAt: Date.now() + ROSTER_CACHE_TTL })
      return ''
    }

    // Truncate if too long
    let text = ''
    for (const line of lines) {
      if (text.length + line.length + 1 > MAX_ROSTER_LENGTH) {
        text += '\n(additional roles omitted)'
        break
      }
      text += (text ? '\n' : '') + line
    }

    await db.set(ROSTER_CACHE_KEY, { text, expiresAt: Date.now() + ROSTER_CACHE_TTL })
    return text
  } catch {
    return ''
  }
}
