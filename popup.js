document.getElementById('captureBtn').addEventListener('click', async () => {
  // Get the current active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  // Inject content script (if not already injected)
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['contentScript.js']
  });

  // Tell content script to start selection
  chrome.tabs.sendMessage(tab.id, { action: 'START_SELECTION' });
});
