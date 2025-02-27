chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "capture_visible_part") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (image) => {
      sendResponse({ screenshotUrl: image });
    });
    return true;
  }

  if (message.action === "capture_full_page") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ["fullpage.js"]
      });
    });
  }
});
