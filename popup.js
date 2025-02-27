// popup.js

document.getElementById('captureBtn').addEventListener('click', async () => {
  // 1) Find the current active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  // 2) Inject contentScript.js (if it isn't already)
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['contentScript.js']
  });

  // 3) Send message to start selection
  chrome.tabs.sendMessage(tab.id, { action: 'START_SELECTION' });

  // 4) Close the popup immediately
  window.close();
});
