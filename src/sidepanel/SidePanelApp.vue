<script setup lang="ts">
import { ref, onMounted, toRaw } from 'vue'
import { Plus, Download, Upload, Merge } from '@lucide/vue'
import { toDateKey, listAllMetas, listMetasByDate, deleteBoard, createBoard, exportAll, importAll, updateBoardMeta } from '../shared/storage'
import type { BoardMeta } from '../shared/types'
import DatePanel from './DatePanel.vue'
import BoardList from './BoardList.vue'
import InlineEditor from './InlineEditor.vue'

const selectedDate = ref(toDateKey(new Date()))
const dates = ref<string[]>([])
const boards = ref<BoardMeta[]>([])
const count = ref(0)
const exporting = ref(false)
const importing = ref(false)
const editingBoardId = ref<string | null>(null)
const importMenuOpen = ref(false)

async function refreshDates() {
  dates.value = await listDateKeys()
}

async function refreshBoards() {
  boards.value = await listMetasByDate(selectedDate.value)
  count.value = boards.value.length
}

async function listDateKeys() {
  const all = await listAllMetas()
  const setKeys = new Set(all.map((item) => item.dateKey))
  return Array.from(setKeys.values()).sort((a, b) => (a > b ? -1 : 1))
}

function selectDate(dateKey: string) {
  selectedDate.value = dateKey
  refreshBoards()
}

function goToday() {
  selectedDate.value = toDateKey(new Date())
  refreshBoards()
}

async function handleCreateBoard() {
  const board = await createBoard()
  await refreshDates()
  await refreshBoards()
  editingBoardId.value = board.meta.id
}

function openBoard(id: string) {
  editingBoardId.value = id
}

async function handleRemoveBoard(id: string) {
  await deleteBoard(id)
  await refreshDates()
  await refreshBoards()
}

async function handleRenameBoard(id: string, title: string) {
  const meta = boards.value.find((b) => b.id === id)
  if (!meta) return
  const rawMeta = { ...toRaw(meta), title, updatedAt: Date.now() }
  await updateBoardMeta(rawMeta)
  boards.value = boards.value.map((b) => (b.id === id ? { ...b, title } : b))
}

async function handleExport() {
  exporting.value = true
  try {
    const data = await exportAll()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tldraw-slide-board-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  } finally {
    exporting.value = false
  }
}

function triggerImport(mode: 'merge' | 'overwrite') {
  importMenuOpen.value = false
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'application/json'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    importing.value = true
    try {
      const text = await file.text()
      const payload = JSON.parse(text) as Record<string, unknown>
      await importAll(payload, mode)
      await refreshDates()
      await refreshBoards()
    } catch {
      alert('导入失败，请检查文件格式')
    } finally {
      importing.value = false
    }
  }
  input.click()
}

function handleEditorBack() {
  editingBoardId.value = null
  refreshBoards()
}

onMounted(() => {
  refreshDates()
  refreshBoards()
})
</script>

<template>
  <InlineEditor v-if="editingBoardId" :board-id="editingBoardId" @back="handleEditorBack" />
  <div v-else class="panel">
    <header class="panel__header">
      <DatePanel :dates="dates" :selected-date="selectedDate" :count="count" @select="selectDate" @today="goToday" />
      <div class="panel__actions">
        <button class="icon-btn" title="新建白板" @click="handleCreateBoard">
          <Plus :size="18" />
        </button>
        <button class="icon-btn" title="全量导出" :disabled="exporting" @click="handleExport">
          <Download :size="18" />
        </button>
        <div class="import-menu" @mouseenter="importMenuOpen = true" @mouseleave="importMenuOpen = false">
          <button class="icon-btn" title="导入" :disabled="importing">
            <Upload :size="18" />
          </button>
          <div v-if="importMenuOpen" class="import-menu__dropdown">
            <button class="import-option" @click="triggerImport('merge')">
              <Merge :size="14" />
              <span>合并导入</span>
            </button>
            <button class="import-option import-option--warn" @click="triggerImport('overwrite')">
              <Upload :size="14" />
              <span>覆盖导入</span>
            </button>
          </div>
        </div>
      </div>
    </header>

    <BoardList :boards="boards" @open="openBoard" @remove="handleRemoveBoard" @rename="handleRenameBoard" />
  </div>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f8fafc;
}

.panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
  flex-shrink: 0;
}

.panel__actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
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

.import-menu {
  position: relative;
}

.import-menu__dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 50;
  min-width: 140px;
  padding: 4px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #ffffff;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
}

.import-option {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  font-size: 13px;
  color: #334155;
  cursor: pointer;
  text-align: left;
}

.import-option:hover {
  background: #f1f5f9;
}

.import-option--warn {
  color: #b45309;
}

.import-option--warn:hover {
  background: #fffbeb;
}
</style>
