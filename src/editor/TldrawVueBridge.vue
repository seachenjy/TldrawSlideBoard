<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { createRoot, type Root } from 'react-dom/client'
import React from 'react'
import { Tldraw, type Editor } from 'tldraw'
import 'tldraw/tldraw.css'

const props = defineProps<{
  snapshot?: any | null
}>()

const emit = defineEmits<{
  (e: 'mount', editor: Editor): void
}>()

const containerRef = ref<HTMLDivElement | null>(null)
let root: Root | null = null
let mountedEditor: Editor | null = null
let lastSnapshotKey = ''

function renderReact(initialSnapshot?: any) {
  if (!containerRef.value) return
  if (!root) {
    root = createRoot(containerRef.value)
  }
  root.render(
    React.createElement(Tldraw, {
      snapshot: initialSnapshot ?? undefined,
      onMount: (editor: Editor) => {
        mountedEditor = editor
        emit('mount', editor)
      },
    })
  )
}

watch(
  () => props.snapshot,
  (newSnapshot) => {
    const key = newSnapshot ? JSON.stringify(newSnapshot) : ''
    if (key === lastSnapshotKey) return
    lastSnapshotKey = key
    if (mountedEditor && newSnapshot) {
      try {
        mountedEditor.loadSnapshot(newSnapshot)
      } catch {
        renderReact(newSnapshot)
      }
    }
  }
)

onMounted(() => {
  const initial = props.snapshot ?? undefined
  lastSnapshotKey = initial ? JSON.stringify(initial) : ''
  renderReact(initial)
})

onBeforeUnmount(() => {
  mountedEditor = null
  root?.unmount()
  root = null
})
</script>

<template>
  <div ref="containerRef" class="tldraw-bridge"></div>
</template>

<style scoped>
.tldraw-bridge {
  position: absolute;
  inset: 0;
}
</style>
