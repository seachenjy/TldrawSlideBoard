<script setup lang="ts">
import { CalendarDays, ChevronLeft, ChevronRight } from '@lucide/vue'
import { useI18n } from '../shared/i18n'

const props = defineProps<{
  dates: string[]
  selectedDate: string
  count: number
}>()

const emit = defineEmits<{
  (e: 'select', date: string): void
  (e: 'today'): void
}>()

const { t } = useI18n()

function navigate(delta: number) {
  const idx = props.dates.indexOf(props.selectedDate)
  const next = idx + delta
  if (next >= 0 && next < props.dates.length) {
    emit('select', props.dates[next])
  }
}

const canPrev = () => props.dates.indexOf(props.selectedDate) < props.dates.length - 1
const canNext = () => props.dates.indexOf(props.selectedDate) > 0
</script>

<template>
  <div class="date-bar">
    <button class="nav-btn" :disabled="!canPrev()" @click="navigate(1)" :title="t('earlier')">
      <ChevronLeft :size="16" />
    </button>
    <button class="date-display" :title="t('boardCount', { count })" @click="$emit('today')">
      <CalendarDays :size="14" />
      <span>{{ selectedDate }}</span>
      <span v-if="count > 0" class="date-count">{{ count }}</span>
    </button>
    <button class="nav-btn" :disabled="!canNext()" @click="navigate(-1)" :title="t('later')">
      <ChevronRight :size="16" />
    </button>
  </div>
</template>

<style scoped>
.date-bar {
  display: flex;
  align-items: center;
  gap: 2px;
}

.nav-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  transition: background 0.15s;
}

.nav-btn:hover:not(:disabled) {
  background: #f1f5f9;
}

.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.date-display {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border: none;
  border-radius: 8px;
  background: transparent;
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  cursor: pointer;
  transition: background 0.15s;
}

.date-display:hover {
  background: #f1f5f9;
}

.date-count {
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 99px;
  background: #e2e8f0;
  color: #64748b;
  font-weight: 600;
}
</style>
