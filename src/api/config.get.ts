// GET /api/apps/guildai/config
// Returns current app configuration with masked API key
// Access: admin or superadmin only (enforced by host via manifest requiredRoles)

export default defineEventHandler(async (event) => {
  const { config, db } = event.context.guildora

  // API key is stored separately in KV store
  const apiKey = (await db.get('secrets:apiKey')) || ''
  const maskedKey = apiKey.length > 4
    ? '*'.repeat(apiKey.length - 4) + apiKey.slice(-4)
    : apiKey ? '****' : ''

  const klipyApiKey = (await db.get('secrets:klipyApiKey')) || ''
  const maskedKlipyKey = klipyApiKey.length > 4
    ? '*'.repeat(klipyApiKey.length - 4) + klipyApiKey.slice(-4)
    : klipyApiKey ? '****' : ''

  const mcpToken = await db.get('mcp:token')

  return {
    botName: config.botName ?? 'GuildAI',
    communityName: config.communityName ?? '',
    defaultLanguage: config.defaultLanguage ?? 'en',
    timezone: config.timezone ?? 'Europe/Berlin',
    apiProvider: config.apiProvider ?? 'anthropic',
    apiKeySet: !!apiKey,
    apiKeyMasked: maskedKey,
    model: config.model ?? 'claude-sonnet-4-20250514',
    maxTokens: config.maxTokens ?? 2048,
    allowedChatRoles: config.allowedChatRoles ?? 'moderator,admin,superadmin',
    allowedActionRoles: config.allowedActionRoles ?? 'admin,superadmin',
    rateLimitPerMinute: config.rateLimitPerMinute ?? 10,
    rateLimitPerRole: config.rateLimitPerRole ?? '{}',
    confirmationTimeout: config.confirmationTimeout ?? 60,
    allowedSkillPageRoles: config.allowedSkillPageRoles ?? 'moderator,admin,superadmin',
    allowedSkillManageRoles: config.allowedSkillManageRoles ?? 'admin,superadmin',
    allowedSkillCreateRoles: config.allowedSkillCreateRoles ?? 'admin,superadmin',
    actionPermissions: config.actionPermissions ?? null,
    readOnlyMode: config.readOnlyMode ?? false,
    promptCachingEnabled: config.promptCachingEnabled ?? true,
    loggingEnabled: config.loggingEnabled ?? true,
    customContext: config.customContext ?? '',
    customPersonality: config.customPersonality ?? '',
    discordMaxMessages: config.discordMaxMessages ?? 10,
    imageRecognitionEnabled: config.imageRecognitionEnabled ?? true,
    aiChatChannelId: config.aiChatChannelId ?? '',
    klipyApiKeySet: !!klipyApiKey,
    klipyApiKeyMasked: maskedKlipyKey,
    mcpTokenSet: !!mcpToken,
    mcpTokenMasked: mcpToken
      ? '*'.repeat(Math.max(0, mcpToken.length - 8)) + mcpToken.slice(-8)
      : ''
  }
})
