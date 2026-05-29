<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { CalendarDays, ChevronLeft, ChevronRight } from '@lucide/vue'
import { useI18n } from '../shared/i18n'
import { toDateKey } from '../shared/storage'

const props = defineProps<{
  selectedDate: string
  countMap: Record<string, number>
  onSelect: (date: string) => void
}>()

const { t } = useI18n()
const open = ref(false)
const containerRef = ref<HTMLDivElement | null>(null)

const selectedCount = computed(() => props.countMap[props.selectedDate] ?? 0)

const viewYear = ref(Number(props.selectedDate.slice(0, 4)))
const viewMonth = ref(Number(props.selectedDate.slice(5, 7)) - 1)

watch(() => props.selectedDate, (v) => {
  viewYear.value = Number(v.slice(0, 4))
  viewMonth.value = Number(v.slice(5, 7)) - 1
})

const monthLabel = computed(() => {
  const d = new Date(viewYear.value, viewMonth.value, 1)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })
})

const weekDays = computed(() => {
  const base = new Date(2026, 0, 5)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base)
    d.setDate(base.getDate() + i)
    return d.toLocaleDateString(undefined, { weekday: 'narrow' })
  })
})

const cells = computed(() => {
  const first = new Date(viewYear.value, viewMonth.value, 1)
  const startDay = first.getDay()
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
  const result: Array<{ key: string; day: number; isCurrent: boolean }> = []

  for (let i = 0; i < startDay; i++) {
    result.push({ key: `p${i}`, day: 0, isCurrent: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dk = `${viewYear.value}-${String(viewMonth.value + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    result.push({ key: dk, day: d, isCurrent: true })
  }
  return result
})

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value--
  } else {
    viewMonth.value--
  }
}

function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value++
  } else {
    viewMonth.value++
  }
}

function pickDate(key: string) {
  open.value = false
  props.onSelect(key)
}

function goToday() {
  props.onSelect(toDateKey(new Date()))
  open.value = false
}

function handleClickOutside(e: MouseEvent) {
  if (containerRef.value && !containerRef.value.contains(e.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', handleClickOutside))
onBeforeUnmount(() => document.removeEventListener('mousedown', handleClickOutside))
</script>

<template>
  <div ref="containerRef" class="date-panel">
    <button class="date-trigger" @click="open = !open">
      <CalendarDays :size="14" />
      <span class="date-trigger__text">{{ selectedDate }}</span>
      <span v-if="selectedCount > 0" class="date-trigger__badge">{{ selectedCount }}</span>
    </button>

    <div v-if="open" class="cal" @mousedown.stop>
      <div class="cal__header">
        <button class="cal__nav" @click="prevMonth"><ChevronLeft :size="16" /></button>
        <span class="cal__title">{{ monthLabel }}</span>
        <button class="cal__nav" @click="nextMonth"><ChevronRight :size="16" /></button>
      </div>

      <div class="cal__weekdays">
        <span v-for="wd in weekDays" :key="wd" class="cal__wd">{{ wd }}</span>
      </div>

      <div class="cal__grid">
        <button
          v-for="cell in cells"
          :key="cell.key"
          :class="['cal__cell', {
            'cal__cell--empty': !cell.isCurrent,
            'cal__cell--today': cell.isCurrent && cell.key === toDateKey(new Date()),
            'cal__cell--selected': cell.key === selectedDate,
          }]"
          :disabled="!cell.isCurrent"
          @click="cell.isCurrent ? pickDate(cell.key) : undefined"
        >
          <span v-if="cell.isCurrent" class="cal__day">{{ cell.day }}</span>
          <span v-if="cell.isCurrent && (countMap[cell.key] ?? 0) > 0" class="cal__count">{{ countMap[cell.key] }}</span>
          <span v-else-if="cell.isCurrent" class="cal__empty">·</span>
        </button>
      </div>

      <div class="cal__footer">
        <button class="cal__today-btn" @click="goToday">{{ t('goToday') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.date-panel {
  position: relative;
}

.date-trigger {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #ffffff;
  font-size: 13px;
  font-weight: 500;
  color: #334155;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.date-trigger:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.date-trigger__text {
  font-variant-numeric: tabular-nums;
}

.date-trigger__badge {
  font-size: 10px;
  padding: 0 5px;
  border-radius: 99px;
  background: #e2e8f0;
  color: #64748b;
  font-weight: 600;
  line-height: 16px;
}

.cal {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 100;
  width: 280px;
  padding: 10px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.cal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.cal__nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #64748b;
  cursor: pointer;
}

.cal__nav:hover {
  background: #f1f5f9;
}

.cal__title {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}

.cal__weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 2px;
}

.cal__wd {
  text-align: center;
  font-size: 10px;
  font-weight: 600;
  color: #94a3b8;
  padding: 3px 0;
}

.cal__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
}

.cal__cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
  aspect-ratio: 1;
  border: none;
  border-radius: 6px;
  background: transparent;
  cursor: pointer;
  transition: background 0.12s;
  padding: 1px;
}

.cal__cell:hover:not(:disabled) {
  background: #f1f5f9;
}

.cal__cell--empty {
  cursor: default;
}

.cal__cell--today {
  background: #eff6ff;
}

.cal__cell--selected {
  background: #0f172a !important;
}

.cal__cell--selected .cal__day,
.cal__cell--selected .cal__count,
.cal__cell--selected .cal__empty {
  color: #ffffff;
}

.cal__day {
  font-size: 12px;
  font-weight: 500;
  color: #334155;
  line-height: 1;
}

.cal__count {
  font-size: 8px;
  font-weight: 700;
  color: #2563eb;
  line-height: 1;
}

.cal__empty {
  font-size: 12px;
  color: #d1d5db;
  line-height: 1;
}

.cal__footer {
  display: flex;
  justify-content: center;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid #f1f5f9;
}

.cal__today-btn {
  padding: 3px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #ffffff;
  font-size: 11px;
  color: #475569;
  cursor: pointer;
}

.cal__today-btn:hover {
  background: #f8fafc;
}
</style>
