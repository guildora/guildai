interface AppDb {
  get(key: string): Promise<any | null>
  set(key: string, value: any): Promise<void>
}

interface DailyAggregate {
  date: string
  totalInputTokens: number
  totalOutputTokens: number
  totalRequests: number
  bySource: Record<string, { inputTokens: number; outputTokens: number; requests: number }>
  byModel: Record<string, { inputTokens: number; outputTokens: number; requests: number }>
}

export async function trackUsage(
  db: AppDb,
  source: string,
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number
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
    totalRequests: 0,
    bySource: {},
    byModel: {}
  }

  daily.totalInputTokens += inputTokens
  daily.totalOutputTokens += outputTokens
  daily.totalRequests += 1

  // By source
  if (!daily.bySource[source]) {
    daily.bySource[source] = { inputTokens: 0, outputTokens: 0, requests: 0 }
  }
  daily.bySource[source].inputTokens += inputTokens
  daily.bySource[source].outputTokens += outputTokens
  daily.bySource[source].requests += 1

  // By model
  if (!daily.byModel[model]) {
    daily.byModel[model] = { inputTokens: 0, outputTokens: 0, requests: 0 }
  }
  daily.byModel[model].inputTokens += inputTokens
  daily.byModel[model].outputTokens += outputTokens
  daily.byModel[model].requests += 1

  await db.set(dailyKey, daily)
}
