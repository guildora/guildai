<template>
  <div class="permission-matrix">
    <!-- Platform tabs -->
    <div class="permission-matrix__tabs">
      <button
        v-for="p in platforms"
        :key="p.value"
        class="permission-matrix__tab"
        :class="{ 'permission-matrix__tab--active': activePlatform === p.value }"
        @click="activePlatform = p.value"
      >
        {{ p.label }}
      </button>
    </div>

    <!-- Matrix table -->
    <div class="permission-matrix__table-wrap">
      <table class="permission-matrix__table">
        <thead>
          <tr>
            <th class="permission-matrix__th permission-matrix__th--role">{{ t('permissions.role') }}</th>
            <th class="permission-matrix__th permission-matrix__th--blocked">{{ t('permissions.blocked') }}</th>
            <th
              v-for="action in actionOptions"
              :key="action.value"
              class="permission-matrix__th"
            >
              <span class="permission-matrix__action-label">{{ action.label }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="role in editableRoles" :key="role.value" class="permission-matrix__row">
            <td class="permission-matrix__td permission-matrix__td--role">
              <span class="permission-matrix__role-name">{{ role.label }}</span>
            </td>
            <td class="permission-matrix__td permission-matrix__td--blocked">
              <input
                type="checkbox"
                :checked="isBlocked(role.value)"
                @change="toggleBlocked(role.value)"
                class="permission-matrix__checkbox permission-matrix__checkbox--blocked"
              />
            </td>
            <td
              v-for="action in actionOptions"
              :key="action.value"
              class="permission-matrix__td"
            >
              <input
                type="checkbox"
                :checked="hasAction(role.value, action.value)"
                :disabled="isBlocked(role.value) || isInherited(role.value, action.value)"
                @change="toggleAction(role.value, action.value)"
                class="permission-matrix__checkbox"
                :class="{ 'permission-matrix__checkbox--inherited': isInherited(role.value, action.value) && !isBlocked(role.value) }"
                :title="isInherited(role.value, action.value) ? t('permissions.inheritedHint') : ''"
              />
            </td>
          </tr>
          <!-- Superadmin row (non-editable) -->
          <tr class="permission-matrix__row permission-matrix__row--superadmin">
            <td class="permission-matrix__td permission-matrix__td--role">
              <span class="permission-matrix__role-name">Superadmin</span>
            </td>
            <td class="permission-matrix__td permission-matrix__td--blocked">
              <span class="text-xs" style="color: var(--color-text-tertiary)">—</span>
            </td>
            <td
              v-for="action in actionOptions"
              :key="action.value"
              class="permission-matrix__td"
            >
              <input type="checkbox" checked disabled class="permission-matrix__checkbox" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from '@guildora/hub'

const { t } = useI18n()

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  actionOptions: { type: Array, required: true }
})

const emit = defineEmits(['update:modelValue'])

const activePlatform = ref('hub')

const platforms = [
  { value: 'hub', label: 'Hub (Web)' },
  { value: 'discord', label: 'Discord' }
]

const editableRoles = [
  { value: 'temporaer', label: 'Temporaer' },
  { value: 'user', label: 'User' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'admin', label: 'Admin' }
]

// Role hierarchy for inheritance
const ROLE_HIERARCHY = {
  admin: ['moderator', 'user', 'temporaer'],
  moderator: ['user', 'temporaer'],
  user: ['temporaer'],
  temporaer: []
}

function getPerms() {
  return JSON.parse(JSON.stringify(props.modelValue || {}))
}

function isBlocked(role) {
  return props.modelValue?.[role]?.blocked === true
}

function getOwnActions(role) {
  const perms = props.modelValue?.[role]
  if (!perms || perms.blocked) return []
  return perms.actions?.[activePlatform.value] || []
}

function getInheritedActions(role) {
  const lowerRoles = ROLE_HIERARCHY[role] || []
  const inherited = new Set()
  for (const lr of lowerRoles) {
    const lrPerms = props.modelValue?.[lr]
    if (!lrPerms || lrPerms.blocked) continue
    const actions = lrPerms.actions?.[activePlatform.value] || []
    for (const a of actions) inherited.add(a)
  }
  return inherited
}

function hasAction(role, action) {
  if (isBlocked(role)) return false
  const own = getOwnActions(role)
  if (own.includes(action) || own.includes('*')) return true
  return getInheritedActions(role).has(action)
}

function isInherited(role, action) {
  if (isBlocked(role)) return false
  const own = getOwnActions(role)
  if (own.includes(action) || own.includes('*')) return false
  return getInheritedActions(role).has(action)
}

function toggleBlocked(role) {
  const perms = getPerms()
  if (!perms[role]) perms[role] = { actions: {} }
  perms[role].blocked = !perms[role].blocked
  if (perms[role].blocked) {
    perms[role].actions = {}
  }
  emit('update:modelValue', perms)
}

function toggleAction(role, action) {
  const perms = getPerms()
  if (!perms[role]) perms[role] = { actions: {} }
  if (!perms[role].actions) perms[role].actions = {}
  const platform = activePlatform.value
  if (!perms[role].actions[platform]) perms[role].actions[platform] = []

  const idx = perms[role].actions[platform].indexOf(action)
  if (idx >= 0) {
    perms[role].actions[platform].splice(idx, 1)
  } else {
    perms[role].actions[platform].push(action)
  }
  emit('update:modelValue', perms)
}
</script>

<style scoped>
.permission-matrix__tabs {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--color-line);
}

.permission-matrix__tab {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.permission-matrix__tab:hover {
  color: var(--color-text-primary);
}

.permission-matrix__tab--active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

.permission-matrix__table-wrap {
  overflow-x: auto;
}

.permission-matrix__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8125rem;
}

.permission-matrix__th {
  text-align: center;
  padding: 0.5rem 0.375rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  border-bottom: 1px solid var(--color-line);
  white-space: nowrap;
}

.permission-matrix__th--role {
  text-align: left;
  min-width: 7rem;
}

.permission-matrix__th--blocked {
  min-width: 4rem;
}

.permission-matrix__action-label {
  display: inline-block;
  max-width: 5.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.75rem;
}

.permission-matrix__row {
  transition: background 0.1s;
}

.permission-matrix__row:hover {
  background: var(--color-surface-2);
}

.permission-matrix__row--superadmin {
  opacity: 0.6;
}

.permission-matrix__td {
  text-align: center;
  padding: 0.5rem 0.375rem;
  border-bottom: 1px solid var(--color-line);
}

.permission-matrix__td--role {
  text-align: left;
}

.permission-matrix__role-name {
  font-weight: 500;
  color: var(--color-text-primary);
}

.permission-matrix__checkbox {
  accent-color: var(--color-accent);
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}

.permission-matrix__checkbox--blocked {
  accent-color: var(--color-error);
}

.permission-matrix__checkbox--inherited {
  opacity: 0.5;
  cursor: default;
}

.permission-matrix__checkbox:disabled {
  cursor: not-allowed;
  opacity: 0.3;
}
</style>
