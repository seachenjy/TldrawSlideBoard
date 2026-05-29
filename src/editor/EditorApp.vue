<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from '../shared/i18n'
import { useAutoSave } from '../shared/useAutoSave'
import TldrawVueBridge from './TldrawVueBridge.vue'

const { t } = useI18n()
const boardId = ref('')

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const id = params.get('id')
  boardId.value = id ?? ''
})

const {
  meta,
  loading,
  saving,
  dirty,
  currentSnapshot,
  error,
  handleMount,
  saveBoard,
} = useAutoSave(boardId)

async function handleExportCurrentBoard() {
  if (!meta?.value) return
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
</script>

<template>
  <div class="editor-root">
    <header class="editor-topbar">
      <button class="btn" @click="goBack">{{ t('back') }}</button>
      <div class="editor-topbar__center">
        <div class="editor-topbar__title">{{ meta?.title ?? t('editor') }}</div>
        <div class="editor-topbar__sub">{{ t('created') }}：{{ meta ? new Date(meta.createdAt).toLocaleString() : '-' }}</div>
      </div>
      <div class="editor-topbar__actions">
        <span class="save-tag">{{ saving ? t('saving') : dirty ? t('unsaved') : t('saved') }}</span>
        <button class="btn" :disabled="saving" @click="saveBoard">{{ t('manualSave') }}</button>
        <button class="btn" @click="handleExportCurrentBoard">{{ t('exportBoard') }}</button>
      </div>
    </header>

    <section class="canvas-area">
      <div v-if="error || (!boardId && !loading)" class="error-box">
        <div>{{ error || t('noBoardParam') }}</div>
        <button class="btn" @click="goBack">{{ t('closePage') }}</button>
      </div>
      <div v-else-if="loading" class="status-box">{{ t('loading') }}</div>
      <TldrawVueBridge v-else-if="boardId" :snapshot="currentSnapshot" @mount="handleMount" />
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
