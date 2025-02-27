document.getElementById("fullPage").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "capture_full_page" }, (response) => {
      if (response.screenshotUrl) {
        downloadImage(response.screenshotUrl, "full_page_screenshot.png");
      }
    });
  });
  
  document.getElementById("selectArea").addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ["content.js"]
      });
    });
  });
  
  function downloadImage(dataUrl, filename) {
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  