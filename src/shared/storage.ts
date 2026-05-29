import { createStore, get, set, del, entries, setMany, keys, clear } from 'idb-keyval'
import type { BoardMeta } from './types'

const metaStore = createStore('tldraw-board-meta', 'board-meta')

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

export async function getBoardMeta(boardId: string): Promise<BoardMeta | undefined> {
  return get<BoardMeta>(boardId, metaStore)
}

export async function createBoard(title = 'Untitled board'): Promise<BoardMeta> {
  const now = Date.now()
  const meta: BoardMeta = {
    id: uid(),
    title,
    createdAt: now,
    updatedAt: now,
    dateKey: toDateKey(new Date(now)),
    snapshot: '',
  }
  await set(meta.id, meta, metaStore)
  return meta
}

export async function updateBoardMeta(meta: BoardMeta): Promise<void> {
  await set(meta.id, meta, metaStore)
}

export async function deleteBoard(boardId: string): Promise<void> {
  await del(boardId, metaStore)
}

export async function exportAll(): Promise<Record<string, unknown>> {
  const metas = await entries<string, BoardMeta>(metaStore)
  return {
    version: 2,
    exportedAt: Date.now(),
    boards: Object.fromEntries(metas),
  }
}

export async function importAll(payload: Record<string, unknown>, mode: 'merge' | 'overwrite'): Promise<void> {
  const boards = (payload.boards ?? {}) as Record<string, BoardMeta>

  if (mode === 'overwrite') {
    const existKeys = await keys(metaStore)
    const purgeKeys = existKeys.filter((k) => !(String(k) in boards))
    await Promise.all([clear(metaStore), ...purgeKeys.map((k) => del(k as string, metaStore))])
  }

  if (mode === 'merge') {
    const existKeys = await keys(metaStore)
    const existSet = new Set(existKeys.map((k) => String(k)))
    const newEntries = Object.entries(boards).filter(([key]) => !existSet.has(key))
    if (newEntries.length > 0) {
      await setMany(newEntries, metaStore)
    }
    return
  }

  const entries_ = Object.entries(boards)
  if (entries_.length > 0) {
    await setMany(entries_, metaStore)
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
