<template>
  <section class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold md:text-3xl">{{ t('settings.title') }}</h1>
      <p class="mt-2 text-sm text-[var(--color-text-secondary)]">{{ t('settings.subtitle') }}</p>
    </div>

    <div v-if="pending" class="opacity-60">{{ t('loading') }}</div>
    <div v-else-if="error" class="alert alert-error">{{ t('error.config') }}</div>

    <div v-else class="space-y-6">
      <!-- Save feedback -->
      <div v-if="saveSuccess" class="alert alert-success text-sm">{{ t('settings.saveSuccess') }}</div>
      <div v-if="saveError" class="alert alert-error text-sm">{{ t('settings.saveError') }}</div>

      <!-- Community -->
      <div class="card">
          <h2 class="mb-4 text-base font-semibold text-[var(--color-text-primary)]">{{ t('settings.community.heading') }}</h2>
          <div class="flex flex-col gap-4">
            <div class="field">
              <label class="field__label" for="botName">{{ t('settings.community.botName') }}</label>
              <div class="field__control">
                <input id="botName" v-model="form.botName" type="text" class="field__input" :placeholder="t('settings.community.botNamePlaceholder')" />
              </div>
              <span class="field__hint">{{ t('settings.community.botNameHint') }}</span>
            </div>

            <div class="field">
              <label class="field__label" for="communityName">{{ t('settings.community.name') }}</label>
              <div class="field__control">
                <input id="communityName" v-model="form.communityName" type="text" class="field__input" :placeholder="t('settings.community.namePlaceholder')" />
              </div>
              <span class="field__hint">{{ t('settings.community.nameHint') }}</span>
            </div>

            <div class="field">
              <label class="field__label" for="defaultLanguage">{{ t('settings.community.defaultLanguage') }}</label>
              <div class="field__control">
                <select id="defaultLanguage" v-model="form.defaultLanguage" class="field__select">
                  <option value="en">English</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
              <span class="field__hint">{{ t('settings.community.defaultLanguageHint') }}</span>
            </div>

            <div class="field">
              <label class="field__label" for="timezone">{{ t('settings.community.timezone') }}</label>
              <div class="field__control">
                <input id="timezone" v-model="form.timezone" type="text" class="field__input" placeholder="Europe/Berlin" />
              </div>
              <span class="field__hint">{{ t('settings.community.timezoneHint') }}</span>
            </div>
          </div>
      </div>

      <!-- AI Provider -->
      <div class="card">
          <h2 class="mb-4 text-base font-semibold text-[var(--color-text-primary)]">{{ t('settings.provider.heading') }}</h2>
          <div class="flex flex-col gap-4">
            <div class="field">
              <label class="field__label" for="apiProvider">{{ t('settings.provider.apiProvider') }}</label>
              <div class="field__control">
                <select id="apiProvider" v-model="form.apiProvider" class="field__select">
                  <option value="anthropic">Anthropic</option>
                  <option value="openai">OpenAI</option>
                </select>
              </div>
            </div>

            <div class="field">
              <label class="field__label" for="apiKey">
                {{ t('settings.provider.apiKey') }}
                <span v-if="config?.apiKeySet" class="ml-2 text-xs font-normal" style="color: var(--color-success);">{{ t('settings.provider.apiKeyIsSet') }}</span>
              </label>
              <div class="field__control">
                <input id="apiKey" v-model="form.apiKey" type="password" class="field__input" :placeholder="config?.apiKeySet ? config.apiKeyMasked : 'sk-...'" />
              </div>
              <span class="field__hint">{{ t('settings.provider.apiKeyHint') }}</span>
            </div>

            <div class="field">
              <label class="field__label" for="model">{{ t('settings.provider.model') }}</label>
              <div class="field__control">
                <input id="model" v-model="form.model" type="text" class="field__input" />
              </div>
              <span class="field__hint">{{ t('settings.provider.modelHint') }}</span>
            </div>

            <div class="field">
              <label class="field__label" for="maxTokens">{{ t('settings.provider.maxTokens') }}</label>
              <div class="field__control">
                <input id="maxTokens" v-model.number="form.maxTokens" type="number" min="256" max="8192" class="field__input w-32" />
              </div>
            </div>
          </div>
      </div>

      <!-- Permissions -->
      <div class="card">
          <h2 class="mb-4 text-base font-semibold text-[var(--color-text-primary)]">{{ t('settings.permissions.heading') }}</h2>
          <p class="text-sm text-[var(--color-text-secondary)] mb-4">{{ t('settings.permissions.description') }}</p>
          <PermissionMatrix v-model="form.actionPermissions" :actionOptions="actionOptions" />
      </div>

      <!-- Access & Rate Limits -->
      <div class="card">
          <h2 class="mb-4 text-base font-semibold text-[var(--color-text-primary)]">{{ t('settings.access.heading') }}</h2>
          <div class="flex flex-col gap-4">
            <div class="field">
              <label class="field__label" for="rateLimitPerMinute">{{ t('settings.access.rateLimitPerMinute') }}</label>
              <div class="field__control">
                <input id="rateLimitPerMinute" v-model.number="form.rateLimitPerMinute" type="number" min="1" max="60" class="field__input w-32" />
              </div>
            </div>

            <div class="field field--textarea">
              <label class="field__label" for="rateLimitPerRole">{{ t('settings.access.rateLimitPerRole') }}</label>
              <div class="field__control field__control--textarea">
                <textarea id="rateLimitPerRole" v-model="form.rateLimitPerRole" class="field__textarea" rows="3" />
              </div>
              <span class="field__hint">{{ t('settings.access.rateLimitPerRoleHint') }}</span>
            </div>

            <div class="field">
              <label class="field__label" for="confirmationTimeout">{{ t('settings.access.confirmationTimeout') }}</label>
              <div class="field__control">
                <input id="confirmationTimeout" v-model.number="form.confirmationTimeout" type="number" min="10" max="300" class="field__input w-32" />
              </div>
              <span class="field__hint">{{ t('settings.access.confirmationTimeoutHint') }}</span>
            </div>
          </div>
      </div>

      <!-- Skill Library -->
      <div class="card">
          <h2 class="mb-4 text-base font-semibold text-[var(--color-text-primary)]">{{ t('settings.skills.heading') }}</h2>
          <p class="text-sm text-[var(--color-text-secondary)] mb-4">{{ t('settings.skills.description') }}</p>

          <div class="flex flex-col gap-4">
            <div class="field">
              <label class="field__label">{{ t('settings.skills.allowedSkillPageRoles') }}</label>
              <MultiSelect v-model="allowedSkillPageRolesArray" :options="roleOptions" :placeholder="t('settings.skills.allowedSkillPageRolesHint')" />
              <span class="field__hint">{{ t('settings.skills.allowedSkillPageRolesHint') }}</span>
            </div>

            <div class="field">
              <label class="field__label">{{ t('settings.skills.allowedSkillManageRoles') }}</label>
              <MultiSelect v-model="allowedSkillManageRolesArray" :options="roleOptions" :placeholder="t('settings.skills.allowedSkillManageRolesHint')" />
              <span class="field__hint">{{ t('settings.skills.allowedSkillManageRolesHint') }}</span>
            </div>
          </div>

          <div class="mt-4">
            <a href="/apps/guildai/skills" class="btn btn-primary btn-sm">
              {{ t('settings.skills.manage') }}
            </a>
          </div>
      </div>

      <!-- Safety -->
      <div class="card">
          <h2 class="mb-4 text-base font-semibold text-[var(--color-text-primary)]">{{ t('settings.actions.heading') }}</h2>
          <div class="flex flex-col gap-4">
            <div class="field">
              <label class="field__label">{{ t('settings.actions.readOnlyMode') }}</label>
              <label class="checkbox-field" for="readOnlyMode">
                <input id="readOnlyMode" type="checkbox" v-model="form.readOnlyMode" class="checkbox-field__input" />
                <span class="checkbox-field__label">{{ t('settings.actions.readOnlyModeDesc') }}</span>
              </label>
            </div>

            <div class="field">
              <label class="field__label">{{ t('settings.actions.loggingEnabled') }}</label>
              <label class="checkbox-field" for="loggingEnabled">
                <input id="loggingEnabled" type="checkbox" v-model="form.loggingEnabled" class="checkbox-field__input" />
                <span class="checkbox-field__label">{{ t('settings.actions.loggingEnabledDesc') }}</span>
              </label>
            </div>
          </div>
      </div>

      <!-- Extended Context -->
      <div class="card">
          <h2 class="mb-4 text-base font-semibold text-[var(--color-text-primary)]">{{ t('settings.context.heading') }}</h2>
          <div class="flex flex-col gap-4">
            <div class="field field--textarea">
              <label class="field__label" for="customContext">{{ t('settings.context.label') }}</label>
              <div class="field__control field__control--textarea">
                <textarea id="customContext" v-model="form.customContext" class="field__textarea" rows="6" />
              </div>
              <span class="field__hint">{{ t('settings.context.hint') }}</span>
            </div>
          </div>
      </div>

      <!-- Extended Personality -->
      <div class="card">
          <h2 class="mb-4 text-base font-semibold text-[var(--color-text-primary)]">{{ t('settings.personality.heading') }}</h2>
          <div class="flex flex-col gap-4">
            <div class="field field--textarea">
              <label class="field__label" for="customPersonality">{{ t('settings.personality.label') }}</label>
              <div class="field__control field__control--textarea">
                <textarea id="customPersonality" v-model="form.customPersonality" class="field__textarea" rows="6" />
              </div>
              <span class="field__hint">{{ t('settings.personality.hint') }}</span>
            </div>
          </div>
      </div>

      <!-- GIF Integration -->
      <div class="card">
          <h2 class="mb-4 text-base font-semibold text-[var(--color-text-primary)]">{{ t('settings.gif.heading') }}</h2>
          <div class="flex flex-col gap-4">
            <div class="field">
              <label class="field__label" for="klipyApiKey">
                {{ t('settings.gif.apiKey') }}
                <span v-if="config?.klipyApiKeySet" class="ml-2 text-xs font-normal" style="color: var(--color-success);">{{ t('settings.gif.apiKeyIsSet') }}</span>
              </label>
              <div class="field__control">
                <input id="klipyApiKey" v-model="form.klipyApiKey" type="password" class="field__input" :placeholder="config?.klipyApiKeySet ? config.klipyApiKeyMasked : ''" />
              </div>
              <span class="field__hint">{{ t('settings.gif.apiKeyHint') }}</span>
            </div>
          </div>
      </div>

      <!-- Discord Chat Channel -->
      <div class="card">
          <h2 class="mb-4 text-base font-semibold text-[var(--color-text-primary)]">{{ t('settings.channel.heading') }}</h2>
          <div class="flex flex-col gap-4">
            <div class="field">
              <label class="field__label" for="aiChatChannelId">{{ t('settings.channel.channelId') }}</label>
              <div class="field__control">
                <input id="aiChatChannelId" v-model="form.aiChatChannelId" type="text" class="field__input font-mono" placeholder="z.B. 1234567890123456789" />
              </div>
              <span class="field__hint">{{ t('settings.channel.channelIdHint') }}</span>
            </div>

            <div class="field">
              <label class="field__label" for="discordMaxMessages">{{ t('settings.channel.maxMessages') }}</label>
              <div class="field__control">
                <input id="discordMaxMessages" v-model.number="form.discordMaxMessages" type="number" min="4" max="40" class="field__input w-32" />
              </div>
              <span class="field__hint">{{ t('settings.channel.maxMessagesHint') }}</span>
            </div>

            <p class="text-xs text-[var(--color-text-tertiary)]">{{ t('settings.channel.safeActionsHint') }}</p>
          </div>
      </div>

      <!-- MCP Server -->
      <div class="card">
          <h2 class="mb-4 text-base font-semibold text-[var(--color-text-primary)]">{{ t('settings.mcp.heading') }}</h2>
          <div class="flex flex-col gap-4">
            <div class="field">
              <label class="field__label">{{ t('settings.mcp.token') }}</label>
              <div class="field__control">
                <input
                  type="text"
                  class="field__input font-mono"
                  :value="mcpTokenDisplay"
                  disabled
                />
              </div>
              <span class="field__hint">{{ t('settings.mcp.tokenHint') }}</span>
            </div>

            <!-- Regenerate feedback -->
            <div v-if="regenSuccess" class="alert alert-success text-sm">{{ t('settings.mcp.regenerated') }}</div>

            <div>
              <button @click="regenerateToken" :disabled="regenerating" class="btn btn-primary btn-sm">
                {{ regenerating ? t('settings.mcp.regenerating') : t('settings.mcp.regenerate') }}
              </button>
            </div>
          </div>
      </div>

      <!-- Save button -->
      <div class="mt-8 border-t border-[var(--color-line)] pt-6">
        <button @click="save" :disabled="saving" class="btn btn-primary btn-sm">
          {{ saving ? t('settings.saving') : t('settings.save') }}
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n, useFetch, $fetch } from '@guildora/hub'
import MultiSelect from '../components/MultiSelect.vue'
import PermissionMatrix from '../components/PermissionMatrix.vue'

const { t } = useI18n()

const { data: config, pending, error } = await useFetch('/api/apps/guildai/config')

const form = ref({
  botName: config.value?.botName ?? 'GuildAI',
  communityName: config.value?.communityName ?? '',
  defaultLanguage: config.value?.defaultLanguage ?? 'en',
  timezone: config.value?.timezone ?? 'Europe/Berlin',
  apiProvider: config.value?.apiProvider ?? 'anthropic',
  apiKey: '',
  model: config.value?.model ?? 'claude-sonnet-4-20250514',
  maxTokens: config.value?.maxTokens ?? 2048,
  allowedChatRoles: config.value?.allowedChatRoles ?? 'moderator,admin',
  allowedActionRoles: config.value?.allowedActionRoles ?? 'admin',
  allowedSkillPageRoles: config.value?.allowedSkillPageRoles ?? 'moderator,admin,superadmin',
  allowedSkillManageRoles: config.value?.allowedSkillManageRoles ?? 'admin,superadmin',
  allowedSkillCreateRoles: config.value?.allowedSkillCreateRoles ?? 'admin,superadmin',
  rateLimitPerMinute: config.value?.rateLimitPerMinute ?? 10,
  rateLimitPerRole: config.value?.rateLimitPerRole ?? '{}',
  confirmationTimeout: config.value?.confirmationTimeout ?? 60,
  enabledActions: config.value?.enabledActions ?? 'assign_role,remove_role,kick_user,ban_user,create_channel,delete_channel,move_channel,send_message,delete_message,create_skill',
  readOnlyMode: config.value?.readOnlyMode ?? false,
  loggingEnabled: config.value?.loggingEnabled ?? true,
  customContext: config.value?.customContext ?? '',
  customPersonality: config.value?.customPersonality ?? '',
  discordMaxMessages: config.value?.discordMaxMessages ?? 10,
  klipyApiKey: '',
  aiChatChannelId: config.value?.aiChatChannelId ?? '',
  aiChatChannelAutoExecuteActions: config.value?.aiChatChannelAutoExecuteActions ?? true,
  actionPermissions: config.value?.actionPermissions ?? {
    temporaer: { blocked: true, actions: {} },
    user: { actions: { hub: [], discord: [] } },
    moderator: { actions: { hub: [], discord: [] } },
    admin: {
      actions: {
        hub: ['assign_role', 'remove_role', 'kick_user', 'ban_user', 'create_channel', 'delete_channel', 'move_channel', 'send_message', 'delete_message', 'create_skill'],
        discord: ['assign_role', 'remove_role', 'create_channel', 'send_message', 'create_skill']
      }
    },
    superadmin: { actions: { hub: ['*'], discord: ['*'] } }
  }
})

// ─── MultiSelect options ────────────────────────────────────────────────────

const roleOptions = [
  { value: 'user', label: 'User' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'admin', label: 'Admin' },
  { value: 'superadmin', label: 'Superadmin' }
]

const actionOptions = [
  { value: 'assign_role', label: t('actions.assign_role') },
  { value: 'remove_role', label: t('actions.remove_role') },
  { value: 'kick_user', label: t('actions.kick_user') },
  { value: 'ban_user', label: t('actions.ban_user') },
  { value: 'create_channel', label: t('actions.create_channel') },
  { value: 'move_channel', label: t('actions.move_channel') || 'Move Channel' },
  { value: 'delete_channel', label: t('actions.delete_channel') },
  { value: 'send_message', label: t('actions.send_message') },
  { value: 'delete_message', label: t('actions.delete_message') },
  { value: 'create_skill', label: t('actions.create_skill') }
]

// Helpers for comma-separated <-> array sync
function csvComputed(key) {
  return computed({
    get() { return (form.value[key] || '').split(',').map(s => s.trim()).filter(Boolean) },
    set(val) { form.value[key] = val.join(',') }
  })
}

const allowedSkillPageRolesArray = csvComputed('allowedSkillPageRoles')
const allowedSkillManageRolesArray = csvComputed('allowedSkillManageRoles')

const saving = ref(false)
const saveSuccess = ref(false)
const saveError = ref(false)

const mcpTokenDisplay = computed(() => {
  if (regenToken.value) return regenToken.value
  if (config.value?.mcpTokenSet) return config.value.mcpTokenMasked
  return t('settings.mcp.noToken')
})

const regenerating = ref(false)
const regenSuccess = ref(false)
const regenToken = ref('')

async function save() {
  saving.value = true
  saveSuccess.value = false
  saveError.value = false
  try {
    const body = { ...form.value }
    // Only send API keys if user entered new ones
    if (!body.apiKey) {
      delete body.apiKey
    }
    if (!body.klipyApiKey) {
      delete body.klipyApiKey
    }
    await $fetch('/api/apps/guildai/config', {
      method: 'PUT',
      body
    })
    saveSuccess.value = true
  } catch {
    saveError.value = true
  } finally {
    saving.value = false
  }
}

async function regenerateToken() {
  regenerating.value = true
  regenSuccess.value = false
  regenToken.value = ''
  try {
    const result = await $fetch('/api/apps/guildai/config/regenerate-token', {
      method: 'POST'
    })
    regenToken.value = result.token
    regenSuccess.value = true
  } catch {
    // silently fail
  } finally {
    regenerating.value = false
  }
}
</script>
