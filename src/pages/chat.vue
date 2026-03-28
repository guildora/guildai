<template>
  <section class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold md:text-3xl">{{ t('chat.title') }}</h1>
        <p class="mt-2 text-sm text-[var(--color-text-secondary)]">{{ t('chat.subtitle') }}</p>
      </div>
      <button @click="startNewConversation" class="btn btn-ghost btn-sm">
        {{ t('chat.newConversation') }}
      </button>
    </div>

    <!-- Read-only warning -->
    <div v-if="configData?.readOnlyMode" class="alert alert-warning text-sm">
      {{ t('chat.readOnlyWarning') }}
    </div>

    <!-- Chat container -->
    <div class="card">
        <!-- Messages -->
        <div ref="messagesEl" class="space-y-4 overflow-y-auto" style="max-height: 60vh; min-height: 200px;">
          <div v-if="messages.length === 0" class="flex items-center justify-center opacity-60" style="min-height: 200px;">
            <p class="text-sm">{{ t('chat.inputPlaceholder') }}</p>
          </div>

          <div v-for="msg in messages" :key="msg.id">
            <!-- User message -->
            <div v-if="msg.role === 'user'" class="flex justify-end">
              <div class="max-w-[80%] rounded-xl p-3" style="background: var(--color-surface-3);">
                <p class="text-sm whitespace-pre-wrap">{{ msg.content }}</p>
              </div>
            </div>

            <!-- Assistant message -->
            <div v-else class="flex justify-start">
              <div class="max-w-[80%] rounded-xl p-3" style="background: var(--color-surface-3);">
                <div class="text-sm prose-sm" v-html="renderMarkdown(msg.content)" />
              </div>
            </div>
          </div>

          <!-- Streaming indicator -->
          <div v-if="streaming" class="flex justify-start">
            <div class="max-w-[80%] rounded-xl p-3" style="background: var(--color-surface-3);">
              <div class="text-sm prose-sm" v-html="renderMarkdown(streamingContent)" />
              <span class="inline-block w-2 h-4 animate-pulse" style="background: var(--color-accent);" />
            </div>
          </div>
        </div>

        <!-- Pending actions confirmation -->
        <div v-if="pendingActions.length > 0" class="mt-4 rounded-lg p-4" style="background: var(--color-surface-3);">
          <p class="text-sm font-semibold" style="color: var(--color-warning);">
            {{ t('chat.actionProposed') }} ({{ pendingActions.length }})
          </p>
          <div v-for="(action, idx) in pendingActions" :key="action.actionId" class="mt-2 rounded p-2 font-mono text-xs" style="background: var(--color-surface-4);">
            <p class="mb-1 text-xs font-semibold uppercase tracking-wider opacity-60">
              {{ idx + 1 }}. {{ t(`actions.${action.actionType}`) || action.actionType }}
            </p>
            <pre class="whitespace-pre-wrap">{{ JSON.stringify(action.params, null, 2) }}</pre>
          </div>
          <div class="mt-3 flex items-center gap-3">
            <button @click="confirmAllActions(true)" :disabled="confirming" class="btn btn-primary btn-sm">
              {{ confirming ? t('chat.executing') : t('chat.confirmAction') }} ({{ pendingActions.length }})
            </button>
            <button @click="confirmAllActions(false)" :disabled="confirming" class="btn btn-ghost btn-sm">
              {{ t('chat.rejectAction') }}
            </button>
            <span class="text-xs opacity-60">
              {{ t('chat.confirmationCountdown', { seconds: remainingSeconds }) }}
            </span>
          </div>
        </div>

        <!-- Action results feedback -->
        <div v-if="actionResults.length > 0" class="mt-4 space-y-2">
          <div v-for="(ar, idx) in actionResults" :key="idx">
            <div v-if="!ar.approved" class="alert alert-error text-sm">{{ t('chat.actionRejected') }}</div>
            <div v-else-if="ar.result?.result?.success" class="alert alert-success text-sm">
              {{ ar.result.result.message || t('chat.actionConfirmed') }}
            </div>
            <div v-else-if="ar.result?.result?.error" class="alert alert-error text-sm">
              {{ ar.result.result.error }}
            </div>
            <div v-else class="alert alert-success text-sm">{{ t('chat.actionConfirmed') }}</div>
          </div>
        </div>

        <!-- Error -->
        <div v-if="chatError" class="mt-4 alert alert-error text-sm">{{ chatError }}</div>

        <!-- Input area -->
        <div class="mt-8 border-t border-[var(--color-line)] pt-6">
          <div class="flex items-end gap-3">
            <div class="field field--textarea flex-1" style="margin: 0; min-height: auto;">
              <div class="field__control field__control--textarea" style="min-height: auto;">
                <textarea
                  ref="inputEl"
                  v-model="input"
                  class="field__textarea"
                  :placeholder="t('chat.inputPlaceholder')"
                  rows="1"
                  style="resize: none; overflow-y: auto; max-height: 200px; min-height: auto; padding-block: 0.6rem;"
                  @keydown.enter.exact.prevent="send"
                  @input="autoResize"
                />
              </div>
            </div>
            <button @click="send" :disabled="streaming || !input.trim()" class="btn btn-primary btn-sm shrink-0">
              {{ t('chat.send') }}
            </button>
          </div>
        </div>
    </div>
  </section>
</template>

<script setup>
import { ref, nextTick, onUnmounted } from 'vue'
import { useI18n, useFetch, $fetch } from '@guildora/hub'

const { t } = useI18n()

// Fetch config to check readOnlyMode
const { data: configData } = await useFetch('/api/apps/guildai/config')

const messages = ref([])
const input = ref('')
const streaming = ref(false)
const streamingContent = ref('')
const conversationId = ref(null)
const chatError = ref('')
const messagesEl = ref(null)
const inputEl = ref(null)

// Action state
const pendingActions = ref([])
const confirming = ref(false)
const actionResults = ref([])
const remainingSeconds = ref(0)
let countdownInterval = null

// Load conversation from URL query if present
const urlParams = new URLSearchParams(window.location.search)
const convParam = urlParams.get('conversation')
if (convParam) {
  conversationId.value = convParam
  loadConversation()
}

async function loadConversation() {
  if (!conversationId.value) return
  try {
    const history = await $fetch('/api/apps/guildai/history')
    const conv = history?.conversations?.find(c => c.id === conversationId.value)
    if (conv?.messages) {
      messages.value = conv.messages.map((m, i) => ({
        id: `loaded-${i}`,
        role: m.role,
        content: m.content
      }))
    }
  } catch {
    // Ignore load errors
  }
}

function startNewConversation() {
  messages.value = []
  conversationId.value = null
  streamingContent.value = ''
  chatError.value = ''
  pendingActions.value = []
  actionResults.value = []
  clearCountdown()
}

async function send() {
  const text = input.value.trim()
  if (!text || streaming.value) return

  input.value = ''
  nextTick(() => autoResize())
  chatError.value = ''
  actionResults.value = []

  const userMsg = { id: `user-${Date.now()}`, role: 'user', content: text }
  messages.value.push(userMsg)
  scrollToBottom()

  streaming.value = true
  streamingContent.value = ''

  try {
    const response = await fetch('/api/apps/guildai/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        conversationId: conversationId.value
      })
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: response.statusText }))
      chatError.value = err.message || t('error.stream')
      streaming.value = false
      return
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (!raw) continue

        try {
          const data = JSON.parse(raw)

          if (data.type === 'text') {
            streamingContent.value += data.text
            scrollToBottom()
          } else if (data.type === 'action') {
            pendingActions.value.push(data)
            // Start/reset countdown on first action
            if (pendingActions.value.length === 1) {
              startCountdown(data.timeout || 60)
            }
          } else if (data.type === 'done') {
            if (data.conversationId) {
              conversationId.value = data.conversationId
            }
          } else if (data.type === 'error') {
            chatError.value = data.message || t('error.stream')
          }
        } catch {
          // Skip unparseable SSE data
        }
      }
    }

    // Finalize streaming message
    if (streamingContent.value) {
      messages.value.push({
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: streamingContent.value
      })
    }
  } catch (err) {
    chatError.value = t('error.stream')
  } finally {
    streaming.value = false
    streamingContent.value = ''
    scrollToBottom()
  }
}

async function confirmAllActions(approved) {
  if (pendingActions.value.length === 0) return
  confirming.value = true
  actionResults.value = []
  clearCountdown()

  const actions = [...pendingActions.value]
  pendingActions.value = []

  for (const action of actions) {
    try {
      const result = await $fetch('/api/apps/guildai/action/confirm', {
        method: 'POST',
        body: {
          actionId: action.actionId,
          approved
        }
      })
      actionResults.value.push({ approved, result })
    } catch {
      actionResults.value.push({ approved, result: { result: { success: false, error: t('error.action') } } })
    }
  }

  confirming.value = false
}

function startCountdown(seconds) {
  clearCountdown()
  remainingSeconds.value = seconds
  countdownInterval = setInterval(() => {
    remainingSeconds.value--
    if (remainingSeconds.value <= 0) {
      clearCountdown()
      pendingActions.value = []
      actionResults.value = [{ approved: false }]
      chatError.value = t('chat.actionExpired')
    }
  }, 1000)
}

function clearCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval)
    countdownInterval = null
  }
}

onUnmounted(() => {
  clearCountdown()
})

function scrollToBottom() {
  nextTick(() => {
    if (messagesEl.value) {
      messagesEl.value.scrollTop = messagesEl.value.scrollHeight
    }
  })
}

function autoResize() {
  const el = inputEl.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

function renderMarkdown(text) {
  if (!text) return ''
  // Strip [ACTION: ...] lines before rendering
  text = text.replace(/\[ACTION:\s*\w+\]\s*\{[^}]*\}\n?/g, '').trim()
  // Basic markdown rendering: bold, italic, code, line breaks
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background: var(--color-surface-4); padding: 0.125rem 0.25rem; border-radius: 0.25rem;">$1</code>')
    .replace(/\n/g, '<br>')
}
</script>
