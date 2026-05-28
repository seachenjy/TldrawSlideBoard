<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, toRaw } from 'vue'
import { ArrowLeft, Save, Plus, Trash2, Layers, Check, Loader2 } from '@lucide/vue'
import { getSnapshot, type Editor } from 'tldraw'
import { addSlide, deleteSlide, getBoardRecord, updateBoardMeta, updateSlideRecord } from '../shared/storage'
import type { BoardRecord, SlideRecord } from '../shared/types'
import TldrawVueBridge from '../editor/TldrawVueBridge.vue'

const props = defineProps<{
  boardId: string
}>()

const emit = defineEmits<{
  (e: 'back'): void
}>()

const board = ref<BoardRecord | null>(null)
const activeSlide = ref<SlideRecord | null>(null)
const loading = ref(true)
const saving = ref(false)
const dirty = ref(false)
const slideExpanded = ref(false)

const editor = shallowRef<Editor | null>(null)
const currentSnapshot = ref<Record<string, unknown> | null>(null)

const slides = computed(() => board.value?.slides ?? [])

function parseSnapshot(raw?: string | null) {
  if (!raw) return null
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

async function loadBoard() {
  loading.value = true
  try {
    const record = await getBoardRecord(props.boardId)
    if (!record) return
    board.value = record
    activeSlide.value = record.slides.find((s) => s.id === record.meta.activeSlideId) ?? record.slides[0] ?? null
    currentSnapshot.value = parseSnapshot(activeSlide.value?.snapshot)
  } catch {
    // ignore
  } finally {
    loading.value = false
  }
}

function handleMount(nextEditor: Editor) {
  editor.value = nextEditor
  nextEditor.store.listen(() => {
    dirty.value = true
  })
}

async function saveCurrentSlide() {
  if (!editor.value || !board.value || !activeSlide.value) return
  saving.value = true
  try {
    const now = Date.now()
    const snapshot = JSON.stringify(getSnapshot(editor.value.store))
    const rawSlide = toRaw(activeSlide.value)
    const savedSlide = { ...rawSlide, snapshot, updatedAt: now }
    activeSlide.value = savedSlide
    await updateSlideRecord(savedSlide)
    const rawBoard = toRaw(board.value)
    const rawSlides = rawBoard.slides.map((s) => (s.id === savedSlide.id ? savedSlide : toRaw(s)))
    const updatedMeta = { ...toRaw(rawBoard.meta), updatedAt: now }
    board.value = { ...rawBoard, slides: rawSlides, meta: updatedMeta }
    await updateBoardMeta(updatedMeta)
    dirty.value = false
  } finally {
    saving.value = false
  }
}

async function handleAddSlide() {
  if (!board.value) return
  await saveCurrentSlide()
  const rawBoard = toRaw(board.value)
  const order = rawBoard.slides.length
  const slide = await addSlide(rawBoard.meta.id, order)
  const updatedMeta = { ...toRaw(rawBoard.meta), activeSlideId: slide.id, slideCount: order + 1, updatedAt: Date.now() }
  board.value = { ...rawBoard, slides: [...rawBoard.slides.map(toRaw), slide], meta: updatedMeta }
  await updateBoardMeta(updatedMeta)
  activeSlide.value = slide
  currentSnapshot.value = parseSnapshot(slide.snapshot)
}

async function handleDeleteSlide() {
  if (!board.value || !activeSlide.value || board.value.slides.length <= 1) return
  const rawBoard = toRaw(board.value)
  const rawSlide = toRaw(activeSlide.value)
  await deleteSlide(rawSlide.id)
  const nextSlides = rawBoard.slides.map(toRaw).filter((s) => s.id !== rawSlide.id)
  const nextActive = nextSlides[0]
  const updatedMeta = { ...toRaw(rawBoard.meta), activeSlideId: nextActive.id, slideCount: nextSlides.length, updatedAt: Date.now() }
  board.value = { ...rawBoard, slides: nextSlides, meta: updatedMeta }
  await updateBoardMeta(updatedMeta)
  activeSlide.value = nextActive
  currentSnapshot.value = parseSnapshot(nextActive.snapshot)
}

async function switchSlide(next: SlideRecord) {
  if (!board.value || next.id === activeSlide.value?.id) return
  await saveCurrentSlide()
  const rawBoard = toRaw(board.value)
  const updatedMeta = { ...toRaw(rawBoard.meta), activeSlideId: next.id, updatedAt: Date.now() }
  board.value = { ...rawBoard, meta: updatedMeta }
  await updateBoardMeta(updatedMeta)
  activeSlide.value = next
  currentSnapshot.value = parseSnapshot(next.snapshot)
}

function handleBack() {
  saveCurrentSlide()
  emit('back')
}

let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  loadBoard()
  timer = setInterval(() => {
    if (dirty.value) saveCurrentSlide()
  }, 3000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  saveCurrentSlide()
})
</script>

<template>
  <div class="inline-editor">
    <div class="inline-editor__toolbar">
      <button class="icon-btn" @click="handleBack" title="返回列表">
        <ArrowLeft :size="18" />
      </button>

      <div class="toolbar-center">
        <button class="slide-toggle" @click="slideExpanded = !slideExpanded" title="Slide 管理">
          <Layers :size="14" />
          <span class="slide-name">{{ activeSlide?.name ?? 'Slide' }}</span>
          <span class="slide-badge">{{ slides.length }}</span>
        </button>
      </div>

      <div class="toolbar-right">
        <button class="icon-btn" :class="{ 'icon-btn--dirty': dirty }" :disabled="saving" @click="saveCurrentSlide" title="保存">
          <Loader2 v-if="saving" :size="16" class="spin" />
          <Save v-else-if="dirty" :size="16" />
          <Check v-else :size="16" class="icon-check" />
        </button>
      </div>
    </div>

    <div v-if="slideExpanded" class="slide-panel">
      <div class="slide-panel__actions">
        <button class="panel-icon-btn" title="新增 Slide" @click="handleAddSlide">
          <Plus :size="14" />
        </button>
        <button class="panel-icon-btn panel-icon-btn--danger" title="删除当前 Slide" :disabled="slides.length <= 1" @click="handleDeleteSlide">
          <Trash2 :size="14" />
        </button>
      </div>
      <div class="slide-panel__list">
        <button
          v-for="slide in slides"
          :key="slide.id"
          :class="['slide-chip', slide.id === activeSlide?.id && 'slide-chip--active']"
          @click="switchSlide(slide); slideExpanded = false"
        >
          {{ slide.name }}
        </button>
      </div>
    </div>

    <div class="inline-editor__canvas">
      <div v-if="loading" class="status-box">
        <Loader2 :size="20" class="spin" />
      </div>
      <TldrawVueBridge v-if="!loading" :snapshot="currentSnapshot" @mount="handleMount" />
    </div>
  </div>
</template>

<style scoped>
.inline-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #ffffff;
}

.inline-editor__toolbar {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
  flex-shrink: 0;
  min-height: 36px;
  z-index: 10;
}

.toolbar-center {
  flex: 1;
  display: flex;
  justify-content: center;
  min-width: 0;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 2px;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: #475569;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.icon-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.icon-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.icon-btn--dirty {
  color: #2563eb;
}

.icon-check {
  color: #16a34a;
}

.slide-toggle {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  font-size: 12px;
  color: #334155;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  max-width: 200px;
}

.slide-toggle:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.slide-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slide-badge {
  font-size: 10px;
  padding: 0 5px;
  border-radius: 99px;
  background: #e2e8f0;
  color: #64748b;
  font-weight: 600;
  line-height: 16px;
}

.slide-panel {
  border-bottom: 1px solid #e2e8f0;
  background: #fafbfc;
  flex-shrink: 0;
}

.slide-panel__actions {
  display: flex;
  gap: 4px;
  padding: 6px 8px;
  border-bottom: 1px solid #e2e8f0;
}

.panel-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #ffffff;
  color: #475569;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.panel-icon-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.panel-icon-btn--danger {
  color: #b91c1c;
  border-color: #fecaca;
}

.panel-icon-btn--danger:hover {
  background: #fef2f2;
}

.panel-icon-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.slide-panel__list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 6px 8px;
  max-height: 120px;
  overflow-y: auto;
}

.slide-chip {
  padding: 3px 10px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #ffffff;
  font-size: 11px;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s;
}

.slide-chip:hover {
  border-color: #cbd5e1;
  background: #f1f5f9;
}

.slide-chip--active {
  background: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
}

.slide-chip--active:hover {
  background: #1e293b;
}

.inline-editor__canvas {
  flex: 1;
  position: relative;
  min-height: 0;
}

.status-box {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
