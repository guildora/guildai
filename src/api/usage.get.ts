// GET /api/apps/guildai/usage
// Returns usage/token stats (daily aggregates)
// Access: admin or superadmin only (enforced by host via manifest requiredRoles)

export default defineEventHandler(async (event) => {
  const { db } = event.context.guildora

  const entries = await db.list('usage-daily:')

  const days = entries
    .map((e: any) => e.value)
    .filter(Boolean)
    .sort((a: any, b: any) => b.date.localeCompare(a.date))
    .slice(0, 30) // Last 30 days

  // Compute totals
  let totalInputTokens = 0
  let totalOutputTokens = 0
  let totalRequests = 0
  const bySource: Record<string, { inputTokens: number; outputTokens: number; requests: number }> = {}
  const byModel: Record<string, { inputTokens: number; outputTokens: number; requests: number }> = {}

  for (const day of days) {
    totalInputTokens += day.totalInputTokens || 0
    totalOutputTokens += day.totalOutputTokens || 0
    totalRequests += day.totalRequests || 0

    if (day.bySource) {
      for (const [source, stats] of Object.entries(day.bySource) as any) {
        if (!bySource[source]) bySource[source] = { inputTokens: 0, outputTokens: 0, requests: 0 }
        bySource[source].inputTokens += stats.inputTokens || 0
        bySource[source].outputTokens += stats.outputTokens || 0
        bySource[source].requests += stats.requests || 0
      }
    }

    if (day.byModel) {
      for (const [model, stats] of Object.entries(day.byModel) as any) {
        if (!byModel[model]) byModel[model] = { inputTokens: 0, outputTokens: 0, requests: 0 }
        byModel[model].inputTokens += stats.inputTokens || 0
        byModel[model].outputTokens += stats.outputTokens || 0
        byModel[model].requests += stats.requests || 0
      }
    }
  }

  return {
    totals: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens, requests: totalRequests },
    bySource,
    byModel,
    days
  }
})
