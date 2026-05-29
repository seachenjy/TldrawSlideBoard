<script setup lang="ts">
import { nextTick, ref } from 'vue'
import { Pencil, Trash2, ChevronRight } from '@lucide/vue'
import { useI18n } from '../shared/i18n'
import type { BoardMeta } from '../shared/types'

defineProps<{
  boards: BoardMeta[]
}>()

const emit = defineEmits<{
  (e: 'open', id: string): void
  (e: 'remove', id: string): void
  (e: 'rename', id: string, title: string): void
}>()

const { t } = useI18n()
const editingId = ref<string | null>(null)
const editingTitle = ref('')
let inputEl: HTMLInputElement | null = null

function setInputRef(el: HTMLInputElement | null) {
  inputEl = el
}

function startEdit(board: BoardMeta) {
  editingId.value = board.id
  editingTitle.value = board.title
  nextTick(() => inputEl?.focus())
}

function commitEdit(id: string) {
  const trimmed = editingTitle.value.trim()
  if (trimmed) {
    emit('rename', id, trimmed)
  }
  editingId.value = null
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="board-list">
    <div v-if="boards.length === 0" class="empty">
      <span class="empty__text">{{ t('noBoards') }}</span>
    </div>
    <div v-for="board in boards" :key="board.id" class="board-item">
      <div class="board-item__main" @click="$emit('open', board.id)">
        <div class="board-item__info">
          <input
            v-if="editingId === board.id"
            ref="inputRef"
            v-model="editingTitle"
            class="title-input"
            @blur="commitEdit(board.id)"
            @keydown.enter="commitEdit(board.id)"
            @keydown.escape="editingId = null"
            @click.stop
          />
          <div v-else class="board-item__title">{{ board.title }}</div>
          <div class="board-item__meta">
            {{ formatTime(board.createdAt) }}
          </div>
        </div>
        <ChevronRight :size="16" class="board-item__arrow" />
      </div>
      <div class="board-item__actions">
        <button class="action-btn" title="重命名" @click.stop="startEdit(board)">
          <Pencil :size="14" />
        </button>
        <button class="action-btn action-btn--danger" title="删除" @click.stop="$emit('remove', board.id)">
          <Trash2 :size="14" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.board-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 0;
}

.empty__text {
  font-size: 13px;
  color: #94a3b8;
}

.board-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  border-radius: 10px;
  transition: background 0.15s;
}

.board-item:hover {
  background: #f1f5f9;
}

.board-item__main {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  cursor: pointer;
  padding: 6px 4px;
}

.board-item__info {
  flex: 1;
  min-width: 0;
}

.board-item__title {
  font-size: 14px;
  font-weight: 500;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.title-input {
  width: 100%;
  padding: 2px 6px;
  border: 1px solid #93c5fd;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  color: #0f172a;
  outline: none;
  background: #eff6ff;
}

.board-item__meta {
  margin-top: 2px;
  font-size: 11px;
  color: #94a3b8;
}

.board-item__arrow {
  color: #cbd5e1;
  flex-shrink: 0;
}

.board-item__actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;
}

.board-item:hover .board-item__actions {
  opacity: 1;
}

.action-btn {
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
  transition: background 0.15s, color 0.15s;
}

.action-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.action-btn--danger:hover {
  background: #fee2e2;
  color: #b91c1c;
}
</style>
