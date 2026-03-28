interface AppDb {
  get(key: string): Promise<any | null>
  set(key: string, value: any): Promise<void>
}

interface DailyAggregate {
  date: string
  totalInputTokens: number
  totalOutputTokens: number
  totalCacheCreationTokens: number
  totalCacheReadTokens: number
  totalRequests: number
  bySource: Record<string, { inputTokens: number; outputTokens: number; cacheCreationTokens: number; cacheReadTokens: number; requests: number }>
  byModel: Record<string, { inputTokens: number; outputTokens: number; cacheCreationTokens: number; cacheReadTokens: number; requests: number }>
}

export async function trackUsage(
  db: AppDb,
  source: string,
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  cacheCreationInputTokens: number = 0,
  cacheReadInputTokens: number = 0
): Promise<void> {
  if (!inputTokens && !outputTokens) return

  const now = new Date()
  const date = now.toISOString().slice(0, 10) // YYYY-MM-DD
  const requestId = `${Date.now()}:${Math.random().toString(36).slice(2, 8)}`

  // Store individual record
  await db.set(`usage:${date}:${requestId}`, {
    source,
    provider,
    model,
    inputTokens,
    outputTokens,
    cacheCreationInputTokens,
    cacheReadInputTokens,
    timestamp: Date.now(),
    expiresAt: Date.now() + (90 * 24 * 60 * 60 * 1000)
  })

  // Update daily aggregate
  const dailyKey = `usage-daily:${date}`
  const existing = (await db.get(dailyKey)) as DailyAggregate | null

  const daily: DailyAggregate = existing || {
    date,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCacheCreationTokens: 0,
    totalCacheReadTokens: 0,
    totalRequests: 0,
    bySource: {},
    byModel: {}
  }

  daily.totalInputTokens += inputTokens
  daily.totalOutputTokens += outputTokens
  daily.totalCacheCreationTokens = (daily.totalCacheCreationTokens || 0) + cacheCreationInputTokens
  daily.totalCacheReadTokens = (daily.totalCacheReadTokens || 0) + cacheReadInputTokens
  daily.totalRequests += 1

  // By source
  if (!daily.bySource[source]) {
    daily.bySource[source] = { inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, requests: 0 }
  }
  daily.bySource[source].inputTokens += inputTokens
  daily.bySource[source].outputTokens += outputTokens
  daily.bySource[source].cacheCreationTokens = (daily.bySource[source].cacheCreationTokens || 0) + cacheCreationInputTokens
  daily.bySource[source].cacheReadTokens = (daily.bySource[source].cacheReadTokens || 0) + cacheReadInputTokens
  daily.bySource[source].requests += 1

  // By model
  if (!daily.byModel[model]) {
    daily.byModel[model] = { inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, requests: 0 }
  }
  daily.byModel[model].inputTokens += inputTokens
  daily.byModel[model].outputTokens += outputTokens
  daily.byModel[model].cacheCreationTokens = (daily.byModel[model].cacheCreationTokens || 0) + cacheCreationInputTokens
  daily.byModel[model].cacheReadTokens = (daily.byModel[model].cacheReadTokens || 0) + cacheReadInputTokens
  daily.byModel[model].requests += 1

  await db.set(dailyKey, daily)
}
