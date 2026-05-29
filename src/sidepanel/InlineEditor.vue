<script setup lang="ts">
import { computed } from 'vue'
import { ArrowLeft, Save, Check, Loader2 } from '@lucide/vue'
import { useI18n } from '../shared/i18n'
import { useAutoSave } from '../shared/useAutoSave'
import TldrawVueBridge from '../editor/TldrawVueBridge.vue'

const props = defineProps<{
  boardId: string
}>()

const emit = defineEmits<{
  (e: 'back'): void
}>()

const { t } = useI18n()

const {
  meta,
  loading,
  saving,
  dirty,
  currentSnapshot,
  handleMount,
  saveBoard,
} = useAutoSave(props.boardId)

const saveIcon = computed(() => {
  if (saving.value) return 'spinner'
  if (dirty.value) return 'save'
  return 'check'
})

async function handleBack() {
  await saveBoard()
  emit('back')
}
</script>

<template>
  <div class="inline-editor">
    <div class="inline-editor__toolbar">
      <div class="toolbar-left">
        <button class="icon-btn" @click="handleBack" :title="t('backToList')">
          <ArrowLeft :size="18" />
        </button>
        <span class="board-title">{{ meta?.title ?? '' }}</span>
      </div>

      <div class="toolbar-right">
        <button class="icon-btn" :class="{ 'icon-btn--dirty': dirty }" :disabled="saving" @click="saveBoard" :title="t('save')">
          <Loader2 v-if="saveIcon === 'spinner'" :size="16" class="spin" />
          <Save v-else-if="saveIcon === 'save'" :size="16" />
          <Check v-else :size="16" class="icon-check" />
        </button>
      </div>
    </div>

    <div class="inline-editor__canvas">
      <div v-if="loading" class="status-box">
        <Loader2 :size="20" class="spin" />
      </div>
      <TldrawVueBridge v-else :snapshot="currentSnapshot" @mount="handleMount" />
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

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.board-title {
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
