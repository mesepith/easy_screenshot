document.getElementById("visiblePart").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "capture_visible_part" }, (response) => {
    if (response.screenshotUrl) {
      downloadImage(response.screenshotUrl, "visible_part_screenshot.png");
    }
  });
});

document.getElementById("fullPage").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "capture_full_page" });
});

document.getElementById("selectArea").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      files: ["content.js"]
    });
  });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "merge_screenshots") {
    mergeScreenshots(message.screenshots);
  }
});

function mergeScreenshots(screenshots) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const width = window.innerWidth;
  const height = screenshots.reduce((acc, shot) => acc + shot.y, 0);
  
  canvas.width = width;
  canvas.height = height;

  let offsetY = 0;
  screenshots.forEach((shot) => {
    const img = new Image();
    img.src = shot.image;
    img.onload = () => {
      ctx.drawImage(img, 0, offsetY);
      offsetY += img.height;

      if (offsetY >= height) {
        downloadImage(canvas.toDataURL("image/png"), "full_page_screenshot.png");
      }
    };
  });
}

function downloadImage(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
