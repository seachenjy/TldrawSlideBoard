<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { getSnapshot, type Editor } from 'tldraw'
import { getBoardMeta, updateBoardMeta } from '../shared/storage'
import type { BoardMeta } from '../shared/types'
import TldrawVueBridge from './TldrawVueBridge.vue'

const meta = ref<BoardMeta | null>(null)
const error = ref<string | null>(null)
const loading = ref(true)
const saving = ref(false)
const dirty = ref(false)

const editor = shallowRef<Editor | null>(null)
const currentSnapshot = ref<Record<string, unknown> | null>(null)

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
  if (!id) {
    error.value = '缺少白板参数'
    loading.value = false
    return
  }
  try {
    const record = await getBoardMeta(id)
    if (!record) {
      error.value = '未找到对应白板'
      return
    }
    meta.value = record
    currentSnapshot.value = parseSnapshot(record.snapshot)
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

async function saveBoard() {
  if (!editor.value || !meta.value) return
  saving.value = true
  try {
    const now = Date.now()
    const snapshot = JSON.stringify(getSnapshot(editor.value.store))
    const updated = { ...meta.value, snapshot, updatedAt: now }
    meta.value = updated
    await updateBoardMeta(updated)
    dirty.value = false
  } finally {
    saving.value = false
  }
}

async function handleExportCurrentBoard() {
  if (!meta.value) return
  await saveBoard()
  const blob = new Blob([JSON.stringify(meta.value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${meta.value.title}-${Date.now()}.json`
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
      saveBoard()
    }
  }, 3000)
})

onBeforeUnmount(() => {
  if (timer) {
    clearInterval(timer)
  }
  saveBoard()
})
</script>

<template>
  <div class="editor-root">
    <header class="editor-topbar">
      <button class="btn" @click="goBack">返回</button>
      <div class="editor-topbar__center">
        <div class="editor-topbar__title">{{ meta?.title ?? '白板编辑器' }}</div>
        <div class="editor-topbar__sub">创建时间：{{ meta ? new Date(meta.createdAt).toLocaleString() : '-' }}</div>
      </div>
      <div class="editor-topbar__actions">
        <span class="save-tag">{{ saving ? '保存中...' : dirty ? '有未保存更改' : '已保存' }}</span>
        <button class="btn" @click="saveBoard">手动保存</button>
        <button class="btn" @click="handleExportCurrentBoard">导出白板</button>
      </div>
    </header>

    <section class="canvas-area">
      <div v-if="loading" class="status-box">正在加载白板...</div>
      <div v-else-if="error" class="error-box">
        <div>{{ error }}</div>
        <button class="btn" @click="goBack">关闭页面</button>
      </div>
      <TldrawVueBridge v-if="!loading && !error" :snapshot="currentSnapshot" @mount="handleMount" />
    </section>
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

.canvas-area {
  flex: 1;
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
</style>
