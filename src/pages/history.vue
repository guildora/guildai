<template>
  <section class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold md:text-3xl">{{ t('history.title') }}</h1>
        <p class="mt-2 text-sm text-[var(--color-text-secondary)]">{{ t('history.subtitle') }}</p>
      </div>
      <button
        v-if="conversations.length > 0"
        @click="showDeleteModal('all')"
        :disabled="deleting"
        class="btn btn-error btn-outline btn-sm"
      >
        {{ t('history.deleteAll') }}
      </button>
    </div>

    <div v-if="pending" class="opacity-60">{{ t('loading') }}</div>
    <div v-else-if="error" class="alert alert-error">{{ t('error.load') }}</div>

    <div v-else-if="conversations.length === 0" class="card">
        <p class="text-sm text-[var(--color-text-tertiary)]">{{ t('history.empty') }}</p>
    </div>

    <div v-else class="space-y-4">
      <!-- Feedback -->
      <div v-if="deleteSuccess" class="alert alert-success text-sm">{{ deleteSuccess }}</div>

      <div v-for="conv in conversations" :key="conv.id" class="card">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0 flex-1">
              <p class="truncate font-semibold text-sm">{{ conv.title }}</p>
              <div class="mt-1 flex items-center gap-3 text-xs text-[var(--color-text-tertiary)]">
                <span>{{ t('history.messages', { count: conv.messageCount }) }}</span>
                <span>{{ t('history.lastActive') }}: {{ formatDate(conv.updatedAt) }}</span>
              </div>
            </div>
            <div class="flex gap-2">
              <RouterLink :to="`/apps/guildai/chat?conversation=${encodeURIComponent(conv.id)}`" class="btn btn-primary btn-sm">
                {{ t('history.open') }}
              </RouterLink>
              <button
                @click="showDeleteModal('single', conv.id)"
                :disabled="deleting"
                class="btn btn-error btn-outline btn-sm"
              >
                {{ t('history.delete') }}
              </button>
            </div>
          </div>
      </div>
    </div>

    <!-- Delete confirmation modal -->
    <dialog ref="modalEl" class="modal">
      <div class="modal-box" style="max-width: 28rem; padding: 1.5rem;">
        <h3 class="text-lg font-semibold">
          {{ deleteTarget === 'all' ? t('history.deleteConfirmTitleAll') : t('history.deleteConfirmTitle') }}
        </h3>
        <p class="mt-2 text-sm opacity-80">{{ t('history.deleteConfirm') }}</p>
        <div class="modal-action">
          <button @click="closeModal" class="btn btn-ghost btn-sm">{{ t('cancel') }}</button>
          <button @click="confirmDelete" :disabled="deleting" class="btn btn-error btn-sm">
            {{ t('history.delete') }}
          </button>
        </div>
      </div>
      <div class="modal-backdrop">
        <button @click="closeModal" />
      </div>
    </dialog>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n, useFetch, $fetch } from '@guildora/hub'

const { t } = useI18n()

const { data, pending, error, refresh } = await useFetch('/api/apps/guildai/history')

const conversations = computed(() => data.value?.conversations || [])

const deleting = ref(false)
const deleteSuccess = ref('')

// Modal state
const modalEl = ref(null)
const deleteTarget = ref('single')
const deleteConversationId = ref(null)

function showDeleteModal(target, conversationId = null) {
  deleteTarget.value = target
  deleteConversationId.value = conversationId
  modalEl.value?.showModal()
}

function closeModal() {
  modalEl.value?.close()
}

async function confirmDelete() {
  closeModal()
  if (deleteTarget.value === 'all') {
    await deleteAll()
  } else {
    await deleteSingle(deleteConversationId.value)
  }
}

async function deleteSingle(conversationId) {
  deleting.value = true
  deleteSuccess.value = ''
  try {
    await $fetch('/api/apps/guildai/history', {
      method: 'DELETE',
      body: { conversationId }
    })
    deleteSuccess.value = t('history.deleted')
    await refresh()
  } catch {
    // Silently fail
  } finally {
    deleting.value = false
  }
}

async function deleteAll() {
  deleting.value = true
  deleteSuccess.value = ''
  try {
    await $fetch('/api/apps/guildai/history', {
      method: 'DELETE',
      body: {}
    })
    deleteSuccess.value = t('history.allDeleted')
    await refresh()
  } catch {
    // Silently fail
  } finally {
    deleting.value = false
  }
}

function formatDate(timestamp) {
  if (!timestamp) return '—'
  return new Date(timestamp).toLocaleString()
}
</script>
