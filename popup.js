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
  if (message.action === "capture_selected_area") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (image) => {
      if (image) {
        cropAndDownload(image, message.selection);
      }
    });
  }
});

function cropAndDownload(image, selection) {
  const img = new Image();
  img.src = image;
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = selection.width;
    canvas.height = selection.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, selection.x, selection.y, selection.width, selection.height, 0, 0, selection.width, selection.height);
    
    downloadImage(canvas.toDataURL("image/png"), "selected_area_screenshot.png");
  };
}

function downloadImage(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
