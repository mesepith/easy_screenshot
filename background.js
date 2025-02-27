// background.js
let lastDataUrl = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'CAPTURE_AREA') {
    captureAndCrop(request.cropArea, request.devicePixelRatio)
      .then((dataUrl) => sendResponse({ screenshotUrl: dataUrl }))
      .catch((err) => sendResponse({ error: err.message }));
    return true; // async
  }

  if (request.action === 'OPEN_IMAGE_VIEWER') {
    lastDataUrl = request.dataUrl; // store the screenshot
    chrome.tabs.create({ url: chrome.runtime.getURL('viewer.html') });
  }

  if (request.action === 'GET_IMAGE_DATA') {
    sendResponse({ dataUrl: lastDataUrl });
  }
});

async function captureAndCrop(cropArea, ratio) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) throw new Error('No active tab.');

  const screenshotDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });

  const blob = await (await fetch(screenshotDataUrl)).blob();
  const imageBitmap = await createImageBitmap(blob);

  const sx = cropArea.x * ratio;
  const sy = cropArea.y * ratio;
  const sw = cropArea.width * ratio;
  const sh = cropArea.height * ratio;

  const maxW = imageBitmap.width;
  const maxH = imageBitmap.height;

  const finalSx = Math.max(0, Math.min(sx, maxW));
  const finalSy = Math.max(0, Math.min(sy, maxH));
  const finalSw = Math.max(0, Math.min(sw, maxW - finalSx));
  const finalSh = Math.max(0, Math.min(sh, maxH - finalSy));

  if (finalSw <= 0 || finalSh <= 0) {
    throw new Error('Invalid selection.');
  }

  const offscreen = new OffscreenCanvas(finalSw, finalSh);
  const ctx = offscreen.getContext('2d');
  ctx.drawImage(imageBitmap, finalSx, finalSy, finalSw, finalSh, 0, 0, finalSw, finalSh);

  const croppedBlob = await offscreen.convertToBlob({ type: 'image/png' });
  return blobToDataUrl(croppedBlob);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(blob);
  });
}
