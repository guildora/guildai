<template>
  <section class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold md:text-3xl">{{ t('skills.title') }}</h1>
        <p class="mt-2 text-sm text-[var(--color-text-secondary)]">{{ t('skills.subtitle') }}</p>
      </div>
      <button v-if="isAdmin" @click="openCreateModal" class="btn btn-primary btn-sm">
        {{ t('skills.add') }}
      </button>
    </div>

    <div v-if="pending" class="opacity-60">{{ t('loading') }}</div>
    <div v-else-if="error" class="alert alert-error">{{ t('error.load') }}</div>

    <div v-else>
      <!-- Feedback -->
      <div v-if="feedback.success" class="alert alert-success text-sm mb-4">{{ feedback.success }}</div>
      <div v-if="feedback.error" class="alert alert-error text-sm mb-4">{{ feedback.error }}</div>

      <!-- Empty state -->
      <div v-if="skills.length === 0" class="card">
        <p class="text-sm opacity-60 text-center py-8">{{ t('skills.empty') }}</p>
      </div>

      <!-- Skill list -->
      <div v-else class="space-y-4">
        <div v-for="skill in skills" :key="skill.id" class="card">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <h3 class="text-base font-semibold text-[var(--color-text-primary)]">{{ skill.name }}</h3>
                <span class="inline-block rounded-full px-2 py-0.5 text-xs font-medium" style="background: var(--color-surface-3); color: var(--color-text-secondary);">
                  {{ skill.trigger }}
                </span>
              </div>
              <p class="mt-1 text-xs text-[var(--color-text-tertiary)]">
                {{ t('skills.lastUpdated') }}: {{ formatDate(skill.updatedAt) }}
              </p>
            </div>
            <div v-if="isAdmin" class="flex items-center gap-2 shrink-0">
              <button @click="openEditModal(skill)" class="btn btn-ghost btn-sm">{{ t('skills.edit') }}</button>
              <button @click="confirmDelete(skill)" class="btn btn-ghost btn-sm" style="color: var(--color-error);">{{ t('skills.delete') }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <dialog ref="modalEl" class="modal" @close="closeModal">
      <div class="modal__content" style="max-width: 600px; width: 100%;">
        <h2 class="text-lg font-semibold mb-4">{{ editingSkill ? t('skills.edit') : t('skills.add') }}</h2>

        <div class="flex flex-col gap-4">
          <div class="field">
            <label class="field__label" for="skillName">{{ t('skills.name') }}</label>
            <div class="field__control">
              <input id="skillName" v-model="modalForm.name" type="text" class="field__input" :placeholder="t('skills.namePlaceholder')" />
            </div>
            <span class="field__hint">{{ t('skills.nameHint') }}</span>
          </div>

          <div class="field">
            <label class="field__label" for="skillTrigger">{{ t('skills.trigger') }}</label>
            <div class="field__control">
              <input id="skillTrigger" v-model="modalForm.trigger" type="text" class="field__input" :placeholder="t('skills.triggerPlaceholder')" />
            </div>
            <span class="field__hint">{{ t('skills.triggerHint') }}</span>
          </div>

          <div class="field field--textarea">
            <label class="field__label" for="skillContent">{{ t('skills.content') }}</label>
            <div class="field__control field__control--textarea">
              <textarea id="skillContent" v-model="modalForm.content" class="field__textarea" rows="10" :placeholder="t('skills.contentPlaceholder')" />
            </div>
            <span class="field__hint">{{ t('skills.contentHint') }}</span>
          </div>
        </div>

        <div class="mt-6 flex items-center justify-end gap-3">
          <button @click="closeModal" class="btn btn-ghost btn-sm">{{ t('cancel') }}</button>
          <button @click="saveSkill" :disabled="saving" class="btn btn-primary btn-sm">
            {{ saving ? t('settings.saving') : t('save') }}
          </button>
        </div>
      </div>
    </dialog>

    <!-- Delete Confirmation Modal -->
    <dialog ref="deleteModalEl" class="modal" @close="closeDeleteModal">
      <div class="modal__content" style="max-width: 400px; width: 100%;">
        <h2 class="text-lg font-semibold mb-2">{{ t('skills.deleteConfirmTitle') }}</h2>
        <p class="text-sm text-[var(--color-text-secondary)] mb-6">{{ t('skills.deleteConfirm') }}</p>
        <div class="flex items-center justify-end gap-3">
          <button @click="closeDeleteModal" class="btn btn-ghost btn-sm">{{ t('cancel') }}</button>
          <button @click="deleteSkill" :disabled="deleting" class="btn btn-primary btn-sm" style="background: var(--color-error);">
            {{ deleting ? t('loading') : t('skills.delete') }}
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

const { data, pending, error, refresh } = await useFetch('/api/apps/guildai/skills')
const { data: configData } = await useFetch('/api/apps/guildai/config')

const skills = computed(() => data.value?.skills || [])
const isAdmin = computed(() => {
  // Config endpoint only accessible for admin+, so if configData loaded successfully, user is admin
  return !!configData.value
})

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
const editingSkill = ref(null)
const saving = ref(false)
const modalForm = ref({ name: '', trigger: '', content: '' })

function openCreateModal() {
  editingSkill.value = null
  modalForm.value = { name: '', trigger: '', content: '' }
  modalEl.value?.showModal()
}

function openEditModal(skill) {
  editingSkill.value = skill
  modalForm.value = { name: skill.name, trigger: skill.trigger, content: skill.content }
  modalEl.value?.showModal()
}

function closeModal() {
  modalEl.value?.close()
  editingSkill.value = null
}

async function saveSkill() {
  saving.value = true
  clearFeedback()
  try {
    if (editingSkill.value) {
      await $fetch('/api/apps/guildai/skills', {
        method: 'PUT',
        body: { id: editingSkill.value.id, ...modalForm.value }
      })
      feedback.value.success = t('skills.updated')
    } else {
      await $fetch('/api/apps/guildai/skills', {
        method: 'POST',
        body: modalForm.value
      })
      feedback.value.success = t('skills.created')
    }
    closeModal()
    await refresh()
  } catch {
    feedback.value.error = t('skills.saveError')
  } finally {
    saving.value = false
  }
}

// ─── Delete Modal ───────────────────────────────────────────────────────────

const deleteModalEl = ref(null)
const deletingSkill = ref(null)
const deleting = ref(false)

function confirmDelete(skill) {
  deletingSkill.value = skill
  deleteModalEl.value?.showModal()
}

function closeDeleteModal() {
  deleteModalEl.value?.close()
  deletingSkill.value = null
}

async function deleteSkill() {
  if (!deletingSkill.value) return
  deleting.value = true
  clearFeedback()
  try {
    await $fetch('/api/apps/guildai/skills', {
      method: 'DELETE',
      body: { id: deletingSkill.value.id }
    })
    feedback.value.success = t('skills.deleted')
    closeDeleteModal()
    await refresh()
  } catch {
    feedback.value.error = t('skills.deleteError')
  } finally {
    deleting.value = false
  }
}
</script>
