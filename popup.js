document.getElementById('captureBtn').addEventListener('click', async () => {
  // 1) Get the current active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  // 2) Inject content script (if not already injected)
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['contentScript.js']
  });

  // 3) Tell the content script to start selection
  chrome.tabs.sendMessage(tab.id, { action: 'START_SELECTION' });

  // 4) Close this popup so user can see the page and overlay right away
  window.close();
});
