<template>
  <section class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold md:text-3xl">{{ t('actionlog.title') }}</h1>
      <p class="mt-2 text-sm text-[var(--color-text-secondary)]">{{ t('actionlog.subtitle') }}</p>
    </div>

    <div v-if="pending" class="opacity-60">{{ t('loading') }}</div>
    <div v-else-if="error" class="alert alert-error">{{ t('error.load') }}</div>

    <div v-else class="space-y-4">
      <!-- Filter -->
      <div class="flex items-center gap-3">
        <label class="text-sm font-medium text-[var(--color-text-secondary)]">{{ t('actionlog.filterSource') }}:</label>
        <select v-model="sourceFilter" class="field__select" style="width: auto; min-width: 8rem;">
          <option value="">{{ t('actionlog.sourceAll') }}</option>
          <option value="hub">Hub</option>
          <option value="discord">Discord</option>
          <option value="mcp">MCP</option>
        </select>
      </div>

      <div v-if="filteredLogs.length === 0" class="card">
        <p class="text-sm text-[var(--color-text-tertiary)]">{{ t('actionlog.empty') }}</p>
      </div>

      <div v-for="log in filteredLogs" :key="log.key" class="card">
        <div class="flex items-start justify-between gap-4">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-sm">{{ t('actions.' + log.action?.type) || log.action?.type }}</span>
              <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                :class="sourceBadgeClass(log.source)">
                {{ sourceLabel(log.source) }}
              </span>
              <span v-if="log.approved === false" class="inline-flex items-center rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-2 py-0.5 text-xs font-medium">
                {{ t('actionlog.rejected') }}
              </span>
              <span v-else-if="log.result?.success" class="inline-flex items-center rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-0.5 text-xs font-medium">
                {{ t('actionlog.success') }}
              </span>
              <span v-else class="inline-flex items-center rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-2 py-0.5 text-xs font-medium">
                {{ t('actionlog.failed') }}
              </span>
            </div>
            <div class="mt-1 text-xs text-[var(--color-text-tertiary)]">
              <span>{{ formatDate(log.timestamp) }}</span>
              <span class="ml-3">{{ t('actionlog.user') }}: {{ log.userId }}</span>
            </div>
            <div v-if="log.action?.params" class="mt-2 rounded bg-[var(--color-bg-secondary)] p-2 text-xs font-mono">
              {{ JSON.stringify(log.action.params, null, 2) }}
            </div>
            <div v-if="log.result?.error" class="mt-1 text-xs text-red-500">
              {{ log.result.error }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n, useFetch } from '@guildora/hub'

const { t } = useI18n()

const { data, pending, error } = await useFetch('/api/apps/guildai/actionlog')

const sourceFilter = ref('')

const filteredLogs = computed(() => {
  const logs = data.value?.logs || []
  if (!sourceFilter.value) return logs
  return logs.filter(l => l.source === sourceFilter.value)
})

function sourceLabel(source) {
  if (source === 'hub') return 'Hub'
  if (source === 'discord') return 'Discord'
  if (source === 'mcp') return 'MCP'
  return source || 'Hub'
}

function sourceBadgeClass(source) {
  if (source === 'discord') return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
  if (source === 'mcp') return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
  return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
}

function formatDate(timestamp) {
  if (!timestamp) return '—'
  return new Date(timestamp).toLocaleString()
}
</script>
