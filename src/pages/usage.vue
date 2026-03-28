<template>
  <section class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold md:text-3xl">{{ t('usage.title') }}</h1>
      <p class="mt-2 text-sm text-[var(--color-text-secondary)]">{{ t('usage.subtitle') }}</p>
    </div>

    <div v-if="pending" class="opacity-60">{{ t('loading') }}</div>
    <div v-else-if="error" class="alert alert-error">{{ t('error.load') }}</div>

    <div v-else class="space-y-6">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3" :class="{ 'sm:grid-cols-5': hasCacheData }">
        <div class="card">
          <p class="text-xs font-medium uppercase text-[var(--color-text-tertiary)]">{{ t('usage.totalRequests') }}</p>
          <p class="mt-1 text-2xl font-bold">{{ formatNumber(totals.requests) }}</p>
        </div>
        <div class="card">
          <p class="text-xs font-medium uppercase text-[var(--color-text-tertiary)]">{{ t('usage.inputTokens') }}</p>
          <p class="mt-1 text-2xl font-bold">{{ formatNumber(totals.inputTokens) }}</p>
        </div>
        <div class="card">
          <p class="text-xs font-medium uppercase text-[var(--color-text-tertiary)]">{{ t('usage.outputTokens') }}</p>
          <p class="mt-1 text-2xl font-bold">{{ formatNumber(totals.outputTokens) }}</p>
        </div>
        <div v-if="hasCacheData" class="card">
          <p class="text-xs font-medium uppercase text-[var(--color-text-tertiary)]">{{ t('usage.cacheWriteTokens') }}</p>
          <p class="mt-1 text-2xl font-bold">{{ formatNumber(totals.cacheCreationTokens) }}</p>
        </div>
        <div v-if="hasCacheData" class="card">
          <p class="text-xs font-medium uppercase text-[var(--color-text-tertiary)]">{{ t('usage.cacheReadTokens') }}</p>
          <p class="mt-1 text-2xl font-bold">{{ formatNumber(totals.cacheReadTokens) }}</p>
        </div>
      </div>

      <!-- Breakdown by Source -->
      <div v-if="Object.keys(bySource).length > 0" class="card">
        <h2 class="mb-3 text-base font-semibold text-[var(--color-text-primary)]">{{ t('usage.bySource') }}</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-[var(--color-line)] text-left text-xs text-[var(--color-text-tertiary)]">
                <th class="pb-2 pr-4">{{ t('usage.source') }}</th>
                <th class="pb-2 pr-4 text-right">{{ t('usage.requests') }}</th>
                <th class="pb-2 pr-4 text-right">{{ t('usage.input') }}</th>
                <th class="pb-2 pr-4 text-right">{{ t('usage.output') }}</th>
                <th v-if="hasCacheData" class="pb-2 pr-4 text-right">{{ t('usage.cacheWrite') }}</th>
                <th v-if="hasCacheData" class="pb-2 text-right">{{ t('usage.cacheRead') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(stats, source) in bySource" :key="source" class="border-b border-[var(--color-line)] last:border-0">
                <td class="py-2 pr-4 font-medium">{{ sourceLabel(source) }}</td>
                <td class="py-2 pr-4 text-right font-mono text-xs">{{ formatNumber(stats.requests) }}</td>
                <td class="py-2 pr-4 text-right font-mono text-xs">{{ formatNumber(stats.inputTokens) }}</td>
                <td class="py-2 pr-4 text-right font-mono text-xs">{{ formatNumber(stats.outputTokens) }}</td>
                <td v-if="hasCacheData" class="py-2 pr-4 text-right font-mono text-xs">{{ formatNumber(stats.cacheCreationTokens || 0) }}</td>
                <td v-if="hasCacheData" class="py-2 text-right font-mono text-xs">{{ formatNumber(stats.cacheReadTokens || 0) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Breakdown by Model -->
      <div v-if="Object.keys(byModel).length > 0" class="card">
        <h2 class="mb-3 text-base font-semibold text-[var(--color-text-primary)]">{{ t('usage.byModel') }}</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-[var(--color-line)] text-left text-xs text-[var(--color-text-tertiary)]">
                <th class="pb-2 pr-4">{{ t('usage.model') }}</th>
                <th class="pb-2 pr-4 text-right">{{ t('usage.requests') }}</th>
                <th class="pb-2 pr-4 text-right">{{ t('usage.input') }}</th>
                <th class="pb-2 pr-4 text-right">{{ t('usage.output') }}</th>
                <th v-if="hasCacheData" class="pb-2 pr-4 text-right">{{ t('usage.cacheWrite') }}</th>
                <th v-if="hasCacheData" class="pb-2 text-right">{{ t('usage.cacheRead') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(stats, model) in byModel" :key="model" class="border-b border-[var(--color-line)] last:border-0">
                <td class="py-2 pr-4 font-mono text-xs">{{ model }}</td>
                <td class="py-2 pr-4 text-right font-mono text-xs">{{ formatNumber(stats.requests) }}</td>
                <td class="py-2 pr-4 text-right font-mono text-xs">{{ formatNumber(stats.inputTokens) }}</td>
                <td class="py-2 pr-4 text-right font-mono text-xs">{{ formatNumber(stats.outputTokens) }}</td>
                <td v-if="hasCacheData" class="py-2 pr-4 text-right font-mono text-xs">{{ formatNumber(stats.cacheCreationTokens || 0) }}</td>
                <td v-if="hasCacheData" class="py-2 text-right font-mono text-xs">{{ formatNumber(stats.cacheReadTokens || 0) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Daily Table -->
      <div class="card">
        <h2 class="mb-3 text-base font-semibold text-[var(--color-text-primary)]">{{ t('usage.daily') }}</h2>
        <div v-if="days.length === 0">
          <p class="text-sm text-[var(--color-text-tertiary)]">{{ t('usage.empty') }}</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-[var(--color-line)] text-left text-xs text-[var(--color-text-tertiary)]">
                <th class="pb-2 pr-4">{{ t('usage.date') }}</th>
                <th class="pb-2 pr-4 text-right">{{ t('usage.requests') }}</th>
                <th class="pb-2 pr-4 text-right">{{ t('usage.input') }}</th>
                <th class="pb-2 pr-4 text-right">{{ t('usage.output') }}</th>
                <th v-if="hasCacheData" class="pb-2 pr-4 text-right">{{ t('usage.cacheWrite') }}</th>
                <th v-if="hasCacheData" class="pb-2 text-right">{{ t('usage.cacheRead') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="day in days" :key="day.date" class="border-b border-[var(--color-line)] last:border-0">
                <td class="py-2 pr-4">{{ day.date }}</td>
                <td class="py-2 pr-4 text-right font-mono text-xs">{{ formatNumber(day.totalRequests) }}</td>
                <td class="py-2 pr-4 text-right font-mono text-xs">{{ formatNumber(day.totalInputTokens) }}</td>
                <td class="py-2 pr-4 text-right font-mono text-xs">{{ formatNumber(day.totalOutputTokens) }}</td>
                <td v-if="hasCacheData" class="py-2 pr-4 text-right font-mono text-xs">{{ formatNumber(day.totalCacheCreationTokens || 0) }}</td>
                <td v-if="hasCacheData" class="py-2 text-right font-mono text-xs">{{ formatNumber(day.totalCacheReadTokens || 0) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n, useFetch } from '@guildora/hub'

const { t } = useI18n()

const { data, pending, error } = await useFetch('/api/apps/guildai/usage')

const totals = computed(() => data.value?.totals || { inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, requests: 0 })
const bySource = computed(() => data.value?.bySource || {})
const byModel = computed(() => data.value?.byModel || {})
const days = computed(() => data.value?.days || [])
const hasCacheData = computed(() => (totals.value.cacheCreationTokens || 0) > 0 || (totals.value.cacheReadTokens || 0) > 0)

function sourceLabel(source) {
  if (source === 'hub') return 'Hub'
  if (source === 'discord') return 'Discord'
  if (source === 'mcp') return 'MCP'
  return source
}

function formatNumber(n) {
  if (n == null) return '0'
  return n.toLocaleString()
}
</script>
