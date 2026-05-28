import { createStore, get, set, del, entries, keys, clear } from 'idb-keyval'
import type { BoardMeta, BoardRecord, SlideRecord } from './types'

const metaStore = createStore('tldraw-board-meta', 'board-meta')
const slideStore = createStore('tldraw-slides', 'slides')

export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export async function listAllMetas(): Promise<BoardMeta[]> {
  const items = await entries<string, BoardMeta>(metaStore)
  return items
    .map(([, value]) => value)
    .sort((a, b) => b.createdAt - a.createdAt)
}

export async function listMetasByDate(dateKey: string): Promise<BoardMeta[]> {
  const all = await listAllMetas()
  return all.filter((item) => item.dateKey === dateKey)
}

export async function getBoardRecord(boardId: string): Promise<BoardRecord | undefined> {
  const meta = await get<BoardMeta>(boardId, metaStore)
  if (!meta) {
    return undefined
  }
  const allSlides = await entries<string, SlideRecord>(slideStore)
  const slides = allSlides
    .map(([, value]) => value)
    .filter((slide) => slide.boardId === boardId)
    .sort((a, b) => a.order - b.order)
  return { meta, slides }
}

export async function createBoard(): Promise<BoardRecord> {
  const now = Date.now()
  const boardId = uid()
  const slideId = uid()
  const meta: BoardMeta = {
    id: boardId,
    title: '未命名白板',
    createdAt: now,
    updatedAt: now,
    dateKey: toDateKey(new Date(now)),
    activeSlideId: slideId,
    slideCount: 1,
  }
  const slide: SlideRecord = {
    id: slideId,
    boardId,
    order: 0,
    name: 'Slide 1',
    snapshot: '',
    createdAt: now,
    updatedAt: now,
  }
  await set(boardId, meta, metaStore)
  await set(slideId, slide, slideStore)
  return { meta, slides: [slide] }
}

export async function updateBoardMeta(meta: BoardMeta): Promise<void> {
  await set(meta.id, meta, metaStore)
}

export async function updateSlideRecord(slide: SlideRecord): Promise<void> {
  await set(slide.id, slide, slideStore)
}

export async function addSlide(boardId: string, order: number): Promise<SlideRecord> {
  const now = Date.now()
  const slide: SlideRecord = {
    id: uid(),
    boardId,
    order,
    name: `Slide ${order + 1}`,
    snapshot: '',
    createdAt: now,
    updatedAt: now,
  }
  await set(slide.id, slide, slideStore)
  return slide
}

export async function deleteSlide(slideId: string): Promise<void> {
  await del(slideId, slideStore)
}

export async function deleteBoard(boardId: string): Promise<void> {
  await del(boardId, metaStore)
  const allSlides = await entries<string, SlideRecord>(slideStore)
  const ids = allSlides.filter(([, value]) => value.boardId === boardId).map(([key]) => key)
  if (ids.length > 0) {
    await Promise.all(ids.map((id) => del(id, slideStore)))
  }
}

export async function exportAll(): Promise<Record<string, unknown>> {
  const metas = await entries<string, BoardMeta>(metaStore)
  const slides = await entries<string, SlideRecord>(slideStore)
  return {
    version: 1,
    exportedAt: Date.now(),
    metas: Object.fromEntries(metas),
    slides: Object.fromEntries(slides),
  }
}

export async function importAll(payload: Record<string, unknown>, mode: 'merge' | 'overwrite'): Promise<void> {
  const metas = (payload.metas ?? {}) as Record<string, BoardMeta>
  const slides = (payload.slides ?? {}) as Record<string, SlideRecord>

  if (mode === 'overwrite') {
    await clear(metaStore)
    await clear(slideStore)
  }

  for (const [key, value] of Object.entries(metas)) {
    if (mode === 'merge') {
      const exists = await get(key, metaStore)
      if (exists) continue
    }
    await set(key, value, metaStore)
  }

  for (const [key, value] of Object.entries(slides)) {
    if (mode === 'merge') {
      const exists = await get(key, slideStore)
      if (exists) continue
    }
    await set(key, value, slideStore)
  }
}

export async function listDateKeys(): Promise<string[]> {
  const metas = await listAllMetas()
  const setKeys = new Set(metas.map((item) => item.dateKey))
  return Array.from(setKeys.values()).sort((a, b) => (a > b ? -1 : 1))
}

export async function countByDate(dateKey: string): Promise<number> {
  const metas = await listMetasByDate(dateKey)
  return metas.length
}
