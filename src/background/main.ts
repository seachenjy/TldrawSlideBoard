chrome.runtime.onInstalled.addListener(async () => {
  if (chrome.sidePanel?.setOptions) {
    await chrome.sidePanel.setOptions({
      enabled: true,
      path: 'sidepanel.html',
    })
  }
})

chrome.action.onClicked.addListener(async (tab) => {
  if (chrome.sidePanel?.open && tab.windowId) {
    await chrome.sidePanel.open({ windowId: tab.windowId })
  }
})
