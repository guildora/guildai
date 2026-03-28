// POST /api/apps/guildai/chat/stream
// SSE streaming chat endpoint
// Access: requiredRoles: ["moderator"] (enforced by host)

import { buildSystemPrompt } from '../../utils/systemPrompt'
import { callAI } from '../../utils/aiCaller'
import { extractActions } from '../../utils/actionExtractor'
import { checkRateLimit } from '../../utils/rateLimiter'
import { trackUsage } from '../../utils/usageTracker'
import { resolvePermissions, canChat, getAllowedActions } from '../../utils/permissions'
import { buildCommunityRoster } from '../../utils/communityRoster'
import { botRequest } from '../../utils/botBridge'

export default defineEventHandler(async (event) => {
  const { guildId, userId, userRoles, config, db } = event.context.guildora

  if (!userId) {
    throw createError({ statusCode: 401, message: 'Not authenticated.' })
  }

  // Check permissions (blocked users can't chat)
  const permissions = resolvePermissions(config)
  if (!canChat(permissions, userRoles)) {
    throw createError({ statusCode: 403, message: 'Access denied.' })
  }

  // Resolve allowed actions for this user on the hub platform
  const userAllowedActions = getAllowedActions(permissions, userRoles, 'hub')

  // Check API key (stored separately in KV store)
  const apiKey = await db.get('secrets:apiKey')
  if (!apiKey) {
    throw createError({ statusCode: 422, message: 'No API key configured. Ask an admin to set one in Settings.' })
  }

  // Read body
  const body = await readBody(event)
  const message = body?.message?.trim()
  if (!message || typeof message !== 'string') {
    throw createError({ statusCode: 400, message: 'Message is required.' })
  }

  const conversationId = body.conversationId || `conv:${userId}:${Date.now()}`

  // Rate limit
  const rateResult = await checkRateLimit(db, userId, userRoles, config)
  if (!rateResult.allowed) {
    throw createError({
      statusCode: 429,
      message: `Rate limit exceeded. Retry in ${rateResult.retryAfterSeconds}s.`
    })
  }

  // Load conversation history
  const conversation = await db.get(conversationId) || { messages: [], createdAt: Date.now() }
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = conversation.messages || []

  // Append user message
  messages.push({ role: 'user', content: message })

  // Build system prompt
  const klipyApiKey = await db.get('secrets:klipyApiKey')
  const skills = (await db.get('skills:all') as any[]) || []
  const communityRoster = await buildCommunityRoster(db, botRequest)
  const systemPrompt = buildSystemPrompt(config, guildId, { hasGifApi: !!klipyApiKey, skills, allowedActions: userAllowedActions, communityRoster })

  // Set SSE headers
  setResponseHeader(event, 'Content-Type', 'text/event-stream')
  setResponseHeader(event, 'Cache-Control', 'no-cache')
  setResponseHeader(event, 'Connection', 'keep-alive')

  const encoder = new TextEncoder()
  let fullResponse = ''
  const aiProvider = (config.apiProvider as 'anthropic' | 'openai') || 'anthropic'
  const aiModel = (config.model as string) || 'claude-sonnet-4-20250514'

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const aiStream = callAI({
          provider: aiProvider,
          apiKey,
          model: aiModel,
          maxTokens: (config.maxTokens as number) || 2048,
          systemPrompt,
          messages,
          promptCaching: config.promptCachingEnabled !== false
        })

        let usageData: { inputTokens: number; outputTokens: number; cacheCreationInputTokens: number; cacheReadInputTokens: number } | undefined

        for await (const chunk of aiStream) {
          if (chunk.type === 'text' && chunk.text) {
            fullResponse += chunk.text
            const sseData = JSON.stringify({ type: 'text', text: chunk.text })
            controller.enqueue(encoder.encode(`data: ${sseData}\n\n`))
          } else if (chunk.type === 'error') {
            const sseData = JSON.stringify({ type: 'error', message: chunk.error })
            controller.enqueue(encoder.encode(`data: ${sseData}\n\n`))
          } else if (chunk.type === 'done' && chunk.usage) {
            usageData = chunk.usage
          }
        }

        // Track token usage
        if (usageData) {
          try {
            await trackUsage(db, 'hub', aiProvider, aiModel, usageData.inputTokens, usageData.outputTokens, usageData.cacheCreationInputTokens, usageData.cacheReadInputTokens)
          } catch {
            // Non-critical — don't fail the response
          }
        }

        // Save assistant response
        messages.push({ role: 'assistant', content: fullResponse })

        // Extract actions from response
        const actions = extractActions(fullResponse)

        if (actions.length > 0) {
          for (const action of actions) {
            const actionId = `action:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`
            const timeout = (config.confirmationTimeout as number) || 60

            // Store pending action
            await db.set(`pending:${actionId}`, {
              actionId,
              conversationId,
              userId,
              action: { type: action.type, params: action.params },
              createdAt: Date.now(),
              expiresAt: Date.now() + (timeout * 1000)
            })

            const sseData = JSON.stringify({
              type: 'action',
              actionId,
              actionType: action.type,
              params: action.params,
              timeout
            })
            controller.enqueue(encoder.encode(`data: ${sseData}\n\n`))
          }
        }

        // Save conversation
        await db.set(conversationId, {
          messages,
          userId,
          createdAt: conversation.createdAt,
          updatedAt: Date.now()
        })

        // Send done event
        const doneData = JSON.stringify({ type: 'done', conversationId })
        controller.enqueue(encoder.encode(`data: ${doneData}\n\n`))

      } catch (err: any) {
        const sseData = JSON.stringify({ type: 'error', message: err.message || 'Internal error' })
        controller.enqueue(encoder.encode(`data: ${sseData}\n\n`))
      } finally {
        controller.close()
      }
    }
  })

  return stream
})
