<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { getSnapshot, loadSnapshot, type Editor } from 'tldraw'
import { addSlide, deleteSlide, getBoardRecord, updateBoardMeta, updateSlideRecord } from '../shared/storage'
import type { BoardRecord, SlideRecord } from '../shared/types'
import TldrawVueBridge from './TldrawVueBridge.vue'

const boardId = ref<string | null>(null)
const board = ref<BoardRecord | null>(null)
const activeSlide = ref<SlideRecord | null>(null)
const error = ref<string | null>(null)
const loading = ref(true)
const saving = ref(false)
const dirty = ref(false)

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

async function init() {
  const params = new URLSearchParams(window.location.search)
  const id = params.get('id')
  boardId.value = id
  if (!id) {
    error.value = '缺少白板参数'
    loading.value = false
    return
  }
  try {
    const record = await getBoardRecord(id)
    if (!record) {
      error.value = '未找到对应白板'
      return
    }
    board.value = record
    activeSlide.value = record.slides.find((slide) => slide.id === record.meta.activeSlideId) ?? record.slides[0] ?? null
    currentSnapshot.value = parseSnapshot(activeSlide.value?.snapshot)
  } catch (e) {
    error.value = (e as Error).message
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
    activeSlide.value = {
      ...activeSlide.value,
      snapshot,
      updatedAt: now,
    }
    await updateSlideRecord(activeSlide.value)
    board.value = {
      ...board.value,
      slides: board.value.slides.map((slide) => (slide.id === activeSlide.value!.id ? activeSlide.value! : slide)),
      meta: {
        ...board.value.meta,
        updatedAt: now,
      },
    }
    await updateBoardMeta(board.value.meta)
    dirty.value = false
  } finally {
    saving.value = false
  }
}

async function handleAddSlide() {
  if (!board.value) return
  await saveCurrentSlide()
  const order = board.value.slides.length
  const slide = await addSlide(board.value.meta.id, order)
  board.value = {
    ...board.value,
    slides: [...board.value.slides, slide],
    meta: {
      ...board.value.meta,
      activeSlideId: slide.id,
      slideCount: order + 1,
      updatedAt: Date.now(),
    },
  }
  await updateBoardMeta(board.value.meta)
  activeSlide.value = slide
  currentSnapshot.value = parseSnapshot(slide.snapshot)
}

async function handleDeleteSlide() {
  if (!board.value || !activeSlide.value || board.value.slides.length <= 1) return
  const yes = window.confirm('删除当前 slide？')
  if (!yes) return
  await deleteSlide(activeSlide.value.id)
  const nextSlides = board.value.slides.filter((slide) => slide.id !== activeSlide.value!.id)
  const nextActive = nextSlides[0]
  board.value = {
    ...board.value,
    slides: nextSlides,
    meta: {
      ...board.value.meta,
      activeSlideId: nextActive.id,
      slideCount: nextSlides.length,
      updatedAt: Date.now(),
    },
  }
  await updateBoardMeta(board.value.meta)
  activeSlide.value = nextActive
  currentSnapshot.value = parseSnapshot(nextActive.snapshot)
}

async function switchSlide(next: SlideRecord) {
  if (!board.value || next.id === activeSlide.value?.id) return
  await saveCurrentSlide()
  board.value = {
    ...board.value,
    meta: {
      ...board.value.meta,
      activeSlideId: next.id,
      updatedAt: Date.now(),
    },
  }
  await updateBoardMeta(board.value.meta)
  activeSlide.value = next
  currentSnapshot.value = parseSnapshot(next.snapshot)
}

async function handleExportCurrentBoard() {
  if (!board.value) return
  await saveCurrentSlide()
  const blob = new Blob([JSON.stringify(board.value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${board.value.meta.title}-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function goBack() {
  window.close()
}

let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  init()
  timer = setInterval(() => {
    if (dirty.value) {
      saveCurrentSlide()
    }
  }, 3000)
})

onBeforeUnmount(() => {
  if (timer) {
    clearInterval(timer)
  }
  saveCurrentSlide()
})
</script>

<template>
  <div class="editor-root">
    <header class="editor-topbar">
      <button class="btn" @click="goBack">返回</button>
      <div class="editor-topbar__center">
        <div class="editor-topbar__title">{{ board?.meta.title ?? '白板编辑器' }}</div>
        <div class="editor-topbar__sub">创建时间：{{ board ? new Date(board.meta.createdAt).toLocaleString() : '-' }}</div>
      </div>
      <div class="editor-topbar__actions">
        <span class="save-tag">{{ saving ? '保存中...' : dirty ? '有未保存更改' : '已保存' }}</span>
        <button class="btn" @click="saveCurrentSlide">手动保存</button>
        <button class="btn" @click="handleExportCurrentBoard">导出白板</button>
      </div>
    </header>

    <div class="editor-body">
      <aside class="slide-panel">
        <div class="slide-panel__header">
          <div class="slide-panel__title">Slides</div>
          <button class="btn" @click="handleAddSlide">新增</button>
        </div>
        <div class="slide-panel__list">
          <button
            v-for="slide in slides"
            :key="slide.id"
            :class="['slide-item', slide.id === activeSlide?.id && 'slide-item--active']"
            @click="switchSlide(slide)"
          >
            <div class="slide-item__name">{{ slide.name }}</div>
            <div class="slide-item__meta">{{ new Date(slide.updatedAt).toLocaleTimeString() }}</div>
          </button>
        </div>
        <button class="btn-danger" :disabled="slides.length <= 1" @click="handleDeleteSlide">删除当前 slide</button>
      </aside>

      <section class="canvas-area">
        <div v-if="loading" class="status-box">正在加载白板...</div>
        <div v-else-if="error" class="error-box">
          <div>{{ error }}</div>
          <button class="btn" @click="goBack">关闭页面</button>
        </div>
        <TldrawVueBridge v-if="!loading && !error" :snapshot="currentSnapshot" @mount="handleMount" />
      </section>
    </div>
  </div>
</template>

<style scoped>
.editor-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #ffffff;
}

.editor-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
}

.editor-topbar__center {
  min-width: 0;
  text-align: center;
}

.editor-topbar__title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.editor-topbar__sub {
  font-size: 12px;
  color: #64748b;
}

.editor-topbar__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.save-tag {
  font-size: 12px;
  color: #475569;
}

.editor-body {
  display: grid;
  grid-template-columns: 240px 1fr;
  flex: 1;
  min-height: 0;
}

.slide-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  border-right: 1px solid #e2e8f0;
  background: #f8fafc;
  overflow: auto;
}

.slide-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.slide-panel__title {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.slide-panel__list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.slide-item {
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  cursor: pointer;
}

.slide-item--active {
  border-color: #0f172a;
  box-shadow: 0 0 0 1px #0f172a;
}

.slide-item__name {
  font-size: 13px;
  font-weight: 600;
  color: #0f172a;
}

.slide-item__meta {
  margin-top: 4px;
  font-size: 11px;
  color: #64748b;
}

.canvas-area {
  position: relative;
  min-height: 0;
}

.status-box,
.error-box {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #334155;
  background: #ffffff;
}

.error-box {
  color: #b91c1c;
}

.btn {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  font-size: 12px;
  cursor: pointer;
}

.btn-danger {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid #fecaca;
  background: #fff1f2;
  color: #b91c1c;
  font-size: 12px;
  cursor: pointer;
}
</style>
