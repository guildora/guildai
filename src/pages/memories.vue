<template>
  <section class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold md:text-3xl">{{ t('memories.title') }}</h1>
        <p class="mt-2 text-sm text-[var(--color-text-secondary)]">{{ t('memories.subtitle') }}</p>
      </div>
      <button v-if="isAdmin" @click="openCreateModal" class="btn btn-primary btn-sm">
        {{ t('memories.add') }}
      </button>
    </div>

    <div v-if="pending" class="opacity-60">{{ t('loading') }}</div>
    <div v-else-if="error" class="alert alert-error">{{ t('error.load') }}</div>

    <div v-else>
      <!-- Feedback -->
      <div v-if="feedback.success" class="alert alert-success text-sm mb-4">{{ feedback.success }}</div>
      <div v-if="feedback.error" class="alert alert-error text-sm mb-4">{{ feedback.error }}</div>

      <!-- Empty state -->
      <div v-if="memories.length === 0" class="card">
        <p class="text-sm opacity-60 text-center py-8">{{ t('memories.empty') }}</p>
      </div>

      <!-- Memory list -->
      <div v-else class="space-y-4">
        <div v-for="memory in memories" :key="memory.id" class="card">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <h3 class="text-base font-semibold text-[var(--color-text-primary)]">{{ memory.title }}</h3>
                <span v-if="memory.pinned" class="inline-block rounded-full px-2 py-0.5 text-xs font-medium" style="background: var(--color-warning-bg, #fef3c7); color: var(--color-warning-text, #92400e);">
                  {{ t('memories.pinned') }}
                </span>
                <span class="inline-block rounded-full px-2 py-0.5 text-xs font-medium" style="background: var(--color-surface-3); color: var(--color-text-secondary);">
                  {{ memory.source }}
                </span>
              </div>
              <p class="mt-1 text-sm text-[var(--color-text-secondary)]">{{ memory.content }}</p>
              <div class="mt-2 flex flex-wrap gap-1">
                <span v-for="kw in memory.keywords.split(',')" :key="kw" class="inline-block rounded px-1.5 py-0.5 text-xs" style="background: var(--color-surface-3); color: var(--color-text-tertiary);">
                  {{ kw.trim() }}
                </span>
              </div>
              <p class="mt-2 text-xs text-[var(--color-text-tertiary)]">
                {{ t('memories.created') }}: {{ formatDate(memory.createdAt) }}
                <template v-if="memory.updatedAt !== memory.createdAt"> · {{ t('memories.updated') }}: {{ formatDate(memory.updatedAt) }}</template>
              </p>
            </div>
            <div v-if="isAdmin" class="flex items-center gap-2 shrink-0">
              <button @click="togglePin(memory)" class="btn btn-ghost btn-sm">
                {{ memory.pinned ? t('memories.unpin') : t('memories.pin') }}
              </button>
              <button @click="openEditModal(memory)" class="btn btn-ghost btn-sm">{{ t('memories.edit') }}</button>
              <button @click="confirmDelete(memory)" class="btn btn-ghost btn-sm" style="color: var(--color-error);">{{ t('memories.delete') }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <dialog ref="modalEl" class="modal" @close="closeModal">
      <div class="modal__content" style="max-width: 600px; width: 100%;">
        <h2 class="text-lg font-semibold mb-4">{{ editingMemory ? t('memories.edit') : t('memories.add') }}</h2>

        <div class="flex flex-col gap-4">
          <div class="field">
            <label class="field__label" for="memTitle">{{ t('memories.fieldTitle') }}</label>
            <div class="field__control">
              <input id="memTitle" v-model="modalForm.title" type="text" class="field__input" maxlength="100" :placeholder="t('memories.titlePlaceholder')" />
            </div>
            <span class="field__hint">{{ t('memories.titleHint') }}</span>
          </div>

          <div class="field field--textarea">
            <label class="field__label" for="memContent">{{ t('memories.fieldContent') }}</label>
            <div class="field__control field__control--textarea">
              <textarea id="memContent" v-model="modalForm.content" class="field__textarea" rows="4" maxlength="1000" :placeholder="t('memories.contentPlaceholder')" />
            </div>
            <span class="field__hint">{{ t('memories.contentHint') }}</span>
          </div>

          <div class="field field--textarea">
            <label class="field__label" for="memSummary">{{ t('memories.fieldSummary') }}</label>
            <div class="field__control field__control--textarea">
              <textarea id="memSummary" v-model="modalForm.summary" class="field__textarea" rows="2" maxlength="300" :placeholder="t('memories.summaryPlaceholder')" />
            </div>
            <span class="field__hint">{{ t('memories.summaryHint') }}</span>
          </div>

          <div class="field">
            <label class="field__label" for="memKeywords">{{ t('memories.fieldKeywords') }}</label>
            <div class="field__control">
              <input id="memKeywords" v-model="modalForm.keywords" type="text" class="field__input" maxlength="100" :placeholder="t('memories.keywordsPlaceholder')" />
            </div>
            <span class="field__hint">{{ t('memories.keywordsHint') }}</span>
          </div>

          <div class="flex items-center gap-2">
            <input id="memPinned" v-model="modalForm.pinned" type="checkbox" class="field__checkbox" />
            <label for="memPinned" class="text-sm text-[var(--color-text-primary)]">{{ t('memories.fieldPinned') }}</label>
          </div>
        </div>

        <div class="mt-6 flex items-center justify-end gap-3">
          <button @click="closeModal" class="btn btn-ghost btn-sm">{{ t('cancel') }}</button>
          <button @click="saveMemory" :disabled="saving" class="btn btn-primary btn-sm">
            {{ saving ? t('settings.saving') : t('save') }}
          </button>
        </div>
      </div>
    </dialog>

    <!-- Delete Confirmation Modal -->
    <dialog ref="deleteModalEl" class="modal" @close="closeDeleteModal">
      <div class="modal__content" style="max-width: 400px; width: 100%;">
        <h2 class="text-lg font-semibold mb-2">{{ t('memories.deleteConfirmTitle') }}</h2>
        <p class="text-sm text-[var(--color-text-secondary)] mb-6">{{ t('memories.deleteConfirm') }}</p>
        <div class="flex items-center justify-end gap-3">
          <button @click="closeDeleteModal" class="btn btn-ghost btn-sm">{{ t('cancel') }}</button>
          <button @click="deleteMemory" :disabled="deleting" class="btn btn-primary btn-sm" style="background: var(--color-error);">
            {{ deleting ? t('loading') : t('memories.delete') }}
          </button>
        </div>
      </div>
    </dialog>
  </section>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n, useFetch, $fetch } from '@guildora/hub'

const { t } = useI18n()

const { data, pending, error, refresh } = await useFetch('/api/apps/guildai/memories')
const { data: configData } = await useFetch('/api/apps/guildai/config')

const memories = computed(() => data.value?.memories || [])
const isAdmin = computed(() => !!configData.value)

const feedback = ref({ success: '', error: '' })

function clearFeedback() {
  feedback.value = { success: '', error: '' }
}

function formatDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString(undefined, { dateStyle: 'medium' })
}

// ─── Create/Edit Modal ──────────────────────────────────────────────────────

const modalEl = ref(null)
const editingMemory = ref(null)
const saving = ref(false)
const modalForm = ref({ title: '', content: '', summary: '', keywords: '', pinned: false })

function openCreateModal() {
  editingMemory.value = null
  modalForm.value = { title: '', content: '', summary: '', keywords: '', pinned: false }
  modalEl.value?.showModal()
}

function openEditModal(memory) {
  editingMemory.value = memory
  modalForm.value = {
    title: memory.title,
    content: memory.content,
    summary: memory.summary,
    keywords: memory.keywords,
    pinned: memory.pinned
  }
  modalEl.value?.showModal()
}

function closeModal() {
  modalEl.value?.close()
  editingMemory.value = null
}

async function saveMemory() {
  saving.value = true
  clearFeedback()
  try {
    if (editingMemory.value) {
      await $fetch('/api/apps/guildai/memories', {
        method: 'PUT',
        body: { id: editingMemory.value.id, ...modalForm.value }
      })
      feedback.value.success = t('memories.memoryUpdated')
    } else {
      await $fetch('/api/apps/guildai/memories', {
        method: 'POST',
        body: modalForm.value
      })
      feedback.value.success = t('memories.memoryCreated')
    }
    closeModal()
    await refresh()
  } catch {
    feedback.value.error = t('memories.saveError')
  } finally {
    saving.value = false
  }
}

// ─── Pin/Unpin ──────────────────────────────────────────────────────────────

async function togglePin(memory) {
  clearFeedback()
  try {
    await $fetch('/api/apps/guildai/memories', {
      method: 'PUT',
      body: { id: memory.id, pinned: !memory.pinned }
    })
    await refresh()
  } catch {
    feedback.value.error = t('memories.saveError')
  }
}

// ─── Delete Modal ───────────────────────────────────────────────────────────

const deleteModalEl = ref(null)
const deletingMemory = ref(null)
const deleting = ref(false)

function confirmDelete(memory) {
  deletingMemory.value = memory
  deleteModalEl.value?.showModal()
}

function closeDeleteModal() {
  deleteModalEl.value?.close()
  deletingMemory.value = null
}

async function deleteMemory() {
  if (!deletingMemory.value) return
  deleting.value = true
  clearFeedback()
  try {
    await $fetch('/api/apps/guildai/memories', {
      method: 'DELETE',
      body: { id: deletingMemory.value.id }
    })
    feedback.value.success = t('memories.memoryDeleted')
    closeDeleteModal()
    await refresh()
  } catch {
    feedback.value.error = t('memories.deleteError')
  } finally {
    deleting.value = false
  }
}
</script>
