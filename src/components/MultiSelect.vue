<template>
  <div class="multiselect" ref="rootEl">
    <div
      class="multiselect__control field__input"
      :class="{ 'multiselect__control--open': open }"
      @click="toggle"
      tabindex="0"
      @keydown.enter.prevent="toggle"
      @keydown.escape="open = false"
    >
      <div class="multiselect__tags" v-if="selected.length > 0">
        <span v-for="val in selected" :key="val" class="multiselect__tag">
          {{ getLabel(val) }}
          <button type="button" class="multiselect__tag-remove" @click.stop="remove(val)" aria-label="Remove">&times;</button>
        </span>
      </div>
      <span v-else class="multiselect__placeholder">{{ placeholder }}</span>
      <span class="multiselect__arrow" :class="{ 'multiselect__arrow--open': open }">&#9662;</span>
    </div>

    <div v-if="open" class="multiselect__dropdown">
      <label
        v-for="opt in options"
        :key="opt.value"
        class="multiselect__option"
        :class="{ 'multiselect__option--selected': selected.includes(opt.value) }"
      >
        <input
          type="checkbox"
          :value="opt.value"
          :checked="selected.includes(opt.value)"
          @change="toggleOption(opt.value)"
          class="multiselect__checkbox"
        />
        <span>{{ opt.label }}</span>
      </label>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  options: { type: Array, required: true }, // [{ value: string, label: string }]
  placeholder: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const rootEl = ref(null)

const selected = computed(() => props.modelValue)

function getLabel(val) {
  const opt = props.options.find(o => o.value === val)
  return opt ? opt.label : val
}

function toggle() {
  open.value = !open.value
}

function toggleOption(val) {
  const current = [...props.modelValue]
  const idx = current.indexOf(val)
  if (idx >= 0) {
    current.splice(idx, 1)
  } else {
    current.push(val)
  }
  emit('update:modelValue', current)
}

function remove(val) {
  emit('update:modelValue', props.modelValue.filter(v => v !== val))
}

function onClickOutside(e) {
  if (rootEl.value && !rootEl.value.contains(e.target)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<style scoped>
.multiselect {
  position: relative;
}

.multiselect__control {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  cursor: pointer;
  min-height: 2.5rem;
  flex-wrap: wrap;
  padding-right: 2rem;
}

.multiselect__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.multiselect__tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  background: var(--color-surface-3);
  color: var(--color-text-primary);
  white-space: nowrap;
}

.multiselect__tag-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  border: none;
  background: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  padding: 0;
  font-size: 0.875rem;
  line-height: 1;
  border-radius: 9999px;
}

.multiselect__tag-remove:hover {
  color: var(--color-error);
  background: var(--color-surface-4);
}

.multiselect__placeholder {
  color: var(--color-text-tertiary);
  font-size: 0.875rem;
}

.multiselect__arrow {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.75rem;
  color: var(--color-text-tertiary);
  transition: transform 0.15s;
  pointer-events: none;
}

.multiselect__arrow--open {
  transform: translateY(-50%) rotate(180deg);
}

.multiselect__dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 50;
  margin-top: 0.25rem;
  background: var(--color-surface-2);
  border: 1px solid var(--color-line);
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 15rem;
  overflow-y: auto;
  padding: 0.25rem;
}

.multiselect__option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: var(--color-text-primary);
  transition: background 0.1s;
}

.multiselect__option:hover {
  background: var(--color-surface-3);
}

.multiselect__option--selected {
  font-weight: 500;
}

.multiselect__checkbox {
  accent-color: var(--color-accent);
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}
</style>
