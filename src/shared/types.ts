export interface BoardMeta {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  dateKey: string
  activeSlideId: string
  slideCount: number
}

export interface SlideRecord {
  id: string
  boardId: string
  order: number
  name: string
  snapshot: string
  createdAt: number
  updatedAt: number
}

export interface BoardRecord {
  meta: BoardMeta
  slides: SlideRecord[]
}
