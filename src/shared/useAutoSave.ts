import { onBeforeUnmount, onMounted, ref, shallowRef, toRaw, watch, type Ref } from 'vue'
import { getSnapshot, type Editor } from 'tldraw'
import { getBoardMeta, updateBoardMeta } from './storage'
import type { BoardMeta } from './types'

export function parseSnapshot(raw?: string | null) {
  if (!raw) return null
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
}

export function useAutoSave(boardId: string | Ref<string>) {
  const id = typeof boardId === 'string' ? ref(boardId) : boardId

  const meta = ref<BoardMeta | null>(null)
  const loading = ref(true)
  const saving = ref(false)
  const dirty = ref(false)
  const editor = shallowRef<Editor | null>(null)
  const currentSnapshot = ref<Record<string, unknown> | null>(null)
  const error = ref<string | null>(null)

  let timer: ReturnType<typeof setInterval> | null = null
  let unlisten: (() => void) | null = null

  async function loadBoard() {
    loading.value = true
    error.value = null
    try {
      const record = await getBoardMeta(id.value)
      if (!record) {
        error.value = 'Board not found'
        return
      }
      meta.value = record
      currentSnapshot.value = parseSnapshot(record.snapshot)
    } catch (e) {
      meta.value = null
    } finally {
      loading.value = false
    }
  }

  function handleMount(nextEditor: Editor) {
    if (unlisten) unlisten()
    editor.value = nextEditor
    unlisten = nextEditor.store.listen(() => {
      dirty.value = true
    })
  }

  async function saveBoard() {
    if (!editor.value || !meta.value || saving.value) return
    saving.value = true
    try {
      const now = Date.now()
      const snapshot = JSON.stringify(getSnapshot(editor.value.store))
      const updated = { ...toRaw(meta.value), snapshot, updatedAt: now }
      meta.value = updated
      await updateBoardMeta(updated)
      dirty.value = false
    } finally {
      saving.value = false
    }
  }

  function startAutoSave(interval = 3000) {
    timer = setInterval(() => {
      if (dirty.value) saveBoard()
    }, interval)
  }

  function stopAutoSave() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  function cleanup() {
    stopAutoSave()
    if (unlisten) {
      unlisten()
      unlisten = null
    }
  }

  watch(id, () => {
    cleanup()
    loadBoard()
    startAutoSave()
  })

  onMounted(() => {
    if (id.value) {
      loadBoard()
      startAutoSave()
    }
  })

  onBeforeUnmount(() => {
    cleanup()
    saveBoard()
  })

  return {
    meta,
    loading,
    saving,
    dirty,
    editor,
    currentSnapshot,
    error,
    handleMount,
    saveBoard,
  }
}
