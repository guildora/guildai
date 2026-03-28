interface AppDb {
  get(key: string): Promise<any | null>
  set(key: string, value: any): Promise<void>
  delete(key: string): Promise<void>
  list(prefix: string): Promise<{ key: string; value: any }[]>
}

export async function checkRateLimit(
  db: AppDb,
  userId: string,
  userRoles: string[],
  config: Record<string, any>
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const limit = getRateLimitForRole(userRoles, config)
  const minute = Math.floor(Date.now() / 60000)
  const key = `ratelimit:${userId}:${minute}`

  const count = (await db.get(key)) || 0

  if (count >= limit) {
    const secondsIntoMinute = Math.floor((Date.now() % 60000) / 1000)
    return { allowed: false, retryAfterSeconds: 60 - secondsIntoMinute }
  }

  await db.set(key, count + 1)

  // Cleanup old rate limit entries (best effort)
  cleanupOldEntries(db, userId, minute).catch(() => {})

  return { allowed: true }
}

function getRateLimitForRole(userRoles: string[], config: Record<string, any>): number {
  try {
    const roleLimits = JSON.parse(config.rateLimitPerRole || '{}')
    const roleOrder = ['superadmin', 'admin', 'moderator', 'user']
    for (const role of roleOrder) {
      if (userRoles.includes(role) && roleLimits[role]) {
        return roleLimits[role]
      }
    }
  } catch {
    // Invalid JSON, fall through to default
  }
  return config.rateLimitPerMinute ?? 10
}

async function cleanupOldEntries(db: AppDb, userId: string, currentMinute: number): Promise<void> {
  const entries = await db.list(`ratelimit:${userId}:`)
  for (const entry of entries) {
    const parts = entry.key.split(':')
    const entryMinute = parseInt(parts[2], 10)
    if (entryMinute < currentMinute - 2) {
      await db.delete(entry.key)
    }
  }
}
