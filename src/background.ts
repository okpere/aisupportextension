chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'analyze',
    title: 'Analyze with Support AI',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'analyze' || !tab?.id) return;
  await chrome.storage.session.set({ pendingTicket: info.selectionText ?? '' });
  chrome.tabs.sendMessage(tab.id, { type: 'open-panel' });
});
