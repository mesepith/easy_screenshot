chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "capture_full_page") {
      chrome.tabs.captureVisibleTab(null, { format: "png" }, (image) => {
        sendResponse({ screenshotUrl: image });
      });
      return true; // Required for async response
    }
  });
  