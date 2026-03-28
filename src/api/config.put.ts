// PUT /api/apps/guildai/config
// Update app configuration
// Access: admin or superadmin only (defense in depth)

import { validateActionPermissions } from '../utils/permissions'

const BOT_URL = process.env.BOT_INTERNAL_URL || 'http://localhost:3050'
const BOT_TOKEN = process.env.BOT_INTERNAL_TOKEN || ''

async function sendBotMessage(channelId: string, message: string): Promise<void> {
  await fetch(`${BOT_URL}/internal/guild/channels/${encodeURIComponent(channelId)}/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${BOT_TOKEN}`
    },
    body: JSON.stringify({ message })
  })
}

export default defineEventHandler(async (event) => {
  const { userRoles, config, db } = event.context.guildora

  const privileged = ['admin', 'superadmin']
  if (!userRoles.some((r: string) => privileged.includes(r))) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const body = await readBody(event)

  if (typeof body !== 'object' || body === null) {
    throw createError({ statusCode: 400, message: 'Invalid request body.' })
  }

  // Validate defaultLanguage
  if (body.defaultLanguage && !['en', 'de'].includes(body.defaultLanguage)) {
    throw createError({ statusCode: 400, message: 'defaultLanguage must be "en" or "de".' })
  }

  // Validate apiProvider
  if (body.apiProvider && !['anthropic', 'openai'].includes(body.apiProvider)) {
    throw createError({ statusCode: 400, message: 'apiProvider must be "anthropic" or "openai".' })
  }

  // Validate numeric fields
  if (body.maxTokens !== undefined) {
    const n = Number(body.maxTokens)
    if (isNaN(n) || n < 256 || n > 8192) {
      throw createError({ statusCode: 400, message: 'maxTokens must be between 256 and 8192.' })
    }
  }

  if (body.rateLimitPerMinute !== undefined) {
    const n = Number(body.rateLimitPerMinute)
    if (isNaN(n) || n < 1 || n > 60) {
      throw createError({ statusCode: 400, message: 'rateLimitPerMinute must be between 1 and 60.' })
    }
  }

  if (body.confirmationTimeout !== undefined) {
    const n = Number(body.confirmationTimeout)
    if (isNaN(n) || n < 10 || n > 300) {
      throw createError({ statusCode: 400, message: 'confirmationTimeout must be between 10 and 300.' })
    }
  }

  // Validate rateLimitPerRole is valid JSON
  if (body.rateLimitPerRole !== undefined && typeof body.rateLimitPerRole === 'string') {
    try {
      JSON.parse(body.rateLimitPerRole)
    } catch {
      throw createError({ statusCode: 400, message: 'rateLimitPerRole must be valid JSON.' })
    }
  }

  // Validate aiChatChannelId (must be numeric Discord snowflake or empty)
  if (body.aiChatChannelId !== undefined && body.aiChatChannelId !== '') {
    if (typeof body.aiChatChannelId !== 'string' || !/^\d{17,20}$/.test(body.aiChatChannelId)) {
      throw createError({ statusCode: 400, message: 'aiChatChannelId must be a valid Discord channel ID (numeric).' })
    }
  }

  // Validate actionPermissions
  if (body.actionPermissions !== undefined && body.actionPermissions !== null) {
    const permsValue = typeof body.actionPermissions === 'string'
      ? (() => { try { return JSON.parse(body.actionPermissions) } catch { return null } })()
      : body.actionPermissions
    if (permsValue === null) {
      throw createError({ statusCode: 400, message: 'actionPermissions must be valid JSON.' })
    }
    const validationError = validateActionPermissions(permsValue)
    if (validationError) {
      throw createError({ statusCode: 400, message: validationError })
    }
    // Normalize: always store as object (not string)
    body.actionPermissions = permsValue
  }

  // Save API keys separately in KV store (not in config)
  if (body.apiKey && typeof body.apiKey === 'string' && body.apiKey.trim().length > 0) {
    await db.set('secrets:apiKey', body.apiKey.trim())
  }
  if (body.klipyApiKey && typeof body.klipyApiKey === 'string' && body.klipyApiKey.trim().length > 0) {
    await db.set('secrets:klipyApiKey', body.klipyApiKey.trim())
  }

  // Build config object WITHOUT apiKey (saveConfig does full replacement)
  const configToSave: Record<string, unknown> = {}
  const configKeys = [
    'botName', 'communityName', 'defaultLanguage', 'timezone',
    'apiProvider', 'model', 'maxTokens', 'allowedChatRoles', 'allowedActionRoles',
    'rateLimitPerMinute', 'rateLimitPerRole', 'confirmationTimeout',
    'allowedSkillPageRoles', 'allowedSkillManageRoles', 'allowedSkillCreateRoles',
    'enabledActions', 'actionPermissions', 'readOnlyMode', 'loggingEnabled',
    'customContext', 'customPersonality', 'discordMaxMessages', 'aiChatChannelId'
  ]

  for (const key of configKeys) {
    if (body[key] !== undefined) {
      configToSave[key] = body[key]
    }
  }

  if (body.__roleOverrides) {
    configToSave.__roleOverrides = body.__roleOverrides
  }

  await event.context.guildora.saveConfig(configToSave)

  // Send introduction message if AI chat channel was set or changed
  const newChannelId = body.aiChatChannelId as string | undefined
  const previousChannelId = (config.aiChatChannelId as string) || ''

  if (newChannelId && newChannelId !== previousChannelId) {
    const lang = (body.defaultLanguage ?? config.defaultLanguage ?? 'en') as string
    const introMessage = lang === 'de'
      ? [
          '**GuildAI ist jetzt in diesem Kanal aktiv!** :sparkles:',
          '',
          'Ihr könnt mir hier Fragen zur Server-Administration stellen, genau wie im Hub-Chat. Schreibt einfach eure Frage und ich antworte.',
          '',
          '**Beispiele:**',
          '- „Weise @User die Moderator-Rolle zu"',
          '- „Erstelle einen neuen Kanal namens #ankuendigungen"',
          '- „Wer ist gerade auf dem Server?"',
          '',
          'Ich bin hier, um zu helfen!'
        ].join('\n')
      : [
          '**GuildAI is now active in this channel!** :sparkles:',
          '',
          'You can ask me questions about server administration here, just like in the Hub chat. Simply type your question and I\'ll respond.',
          '',
          '**Examples:**',
          '- "Assign @User the moderator role"',
          '- "Create a new channel called #announcements"',
          '- "Who\'s currently on the server?"',
          '',
          'I\'m here to help!'
        ].join('\n')

    try {
      await sendBotMessage(newChannelId, introMessage)
    } catch {
      // Non-critical — config save still succeeded
    }
  }

  return { ok: true }
})
