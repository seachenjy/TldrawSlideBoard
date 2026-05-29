import { ref } from 'vue'

const messages = {
  en: {
    newBoard: 'New board',
    exportAll: 'Export all',
    import: 'Import',
    importMerge: 'Merge import',
    importOverwrite: 'Overwrite import',
    importFailed: 'Import failed. Please check the file format.',
    backToList: 'Back to list',
    save: 'Save',
    saving: 'Saving...',
    saved: 'Saved',
    unsaved: 'Unsaved changes',
    loading: 'Loading...',
    noBoards: 'No boards yet',
    rename: 'Rename',
    delete: 'Delete',
    deleteConfirm: 'Delete this board?',
    earlier: 'Earlier',
    later: 'Later',
    boardCount: '{count} board(s)',
    goToday: 'Today',
    back: 'Back',
    editor: 'Board Editor',
    created: 'Created',
    manualSave: 'Manual save',
    exportBoard: 'Export board',
    closePage: 'Close page',
    noBoardParam: 'Missing board parameter',
    boardNotFound: 'Board not found',
    untitled: 'Untitled board',
  },
  zh: {
    newBoard: '新建白板',
    exportAll: '全量导出',
    import: '导入',
    importMerge: '合并导入',
    importOverwrite: '覆盖导入',
    importFailed: '导入失败，请检查文件格式',
    backToList: '返回列表',
    save: '保存',
    saving: '保存中...',
    saved: '已保存',
    unsaved: '有未保存更改',
    loading: '加载中...',
    noBoards: '暂无白板',
    rename: '重命名',
    delete: '删除',
    deleteConfirm: '确认删除此白板？',
    earlier: '更早',
    later: '更晚',
    boardCount: '共 {count} 个白板',
    goToday: '今天',
    back: '返回',
    editor: '白板编辑器',
    created: '创建时间',
    manualSave: '手动保存',
    exportBoard: '导出白板',
    closePage: '关闭页面',
    noBoardParam: '缺少白板参数',
    boardNotFound: '未找到对应白板',
    untitled: '未命名白板',
  },
} as const

type Messages = typeof messages
type Locale = keyof Messages
type MessageKey = keyof Messages['en']

function detectLocale(): Locale {
  const lang =
    (typeof chrome !== 'undefined' && chrome.i18n?.getUILanguage?.()) ||
    navigator.language ||
    'en'
  return lang.startsWith('zh') ? 'zh' : 'en'
}

const locale = ref<Locale>(detectLocale())

export function useI18n() {
  function t(key: MessageKey, params?: Record<string, string | number>): string {
    const dict = messages[locale.value] as Record<string, string | undefined>
    let msg = dict[key] ?? messages.en[key] ?? key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        msg = msg.replace(`{${k}}`, String(v))
      }
    }
    return msg
  }

  return { locale, t }
}

export type { Locale, MessageKey }
