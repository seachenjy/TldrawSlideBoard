import { ref, computed } from 'vue'

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
    loading: 'Loading...',
    noBoards: 'No boards yet',
    rename: 'Rename',
    delete: 'Delete',
    earlier: 'Earlier',
    later: 'Later',
    boardCount: '{count} board(s)',
    goToday: 'Today',
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
    loading: '加载中...',
    noBoards: '暂无白板',
    rename: '重命名',
    delete: '删除',
    earlier: '更早',
    later: '更晚',
    boardCount: '共 {count} 个白板',
    goToday: '今天',
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
