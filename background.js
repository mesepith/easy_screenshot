chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "capture_visible_part") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (image) => {
      sendResponse({ screenshotUrl: image });
    });
    return true; // Required for async response
  }

  if (message.action === "capture_full_page") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: captureFullPage
      });
    });
  }
});

// Function to capture full page by scrolling and stitching
async function captureFullPage() {
  const body = document.body;
  const html = document.documentElement;
  const totalHeight = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);
  const viewportHeight = window.innerHeight;
  let screenshots = [];
  let currentY = 0;

  while (currentY < totalHeight) {
    window.scrollTo(0, currentY);
    await new Promise((resolve) => setTimeout(resolve, 500));

    chrome.runtime.sendMessage({ action: "capture_visible_part" }, (response) => {
      if (response.screenshotUrl) {
        screenshots.push({ image: response.screenshotUrl, y: currentY });
      }
    });

    currentY += viewportHeight;
  }

  setTimeout(() => {
    chrome.runtime.sendMessage({ action: "merge_screenshots", screenshots });
  }, 1500);
}
