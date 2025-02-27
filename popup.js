// popup.js

document.getElementById('startSelection').addEventListener('click', async () => {
  // Inject contentScript (if not already injected)
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['contentScript.js']
  });

  // Tell the content script to start the selection process
  chrome.tabs.sendMessage(tab.id, { action: 'START_SELECTION' });
});
