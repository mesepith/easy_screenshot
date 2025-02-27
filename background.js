// background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'CAPTURE_AREA') {
    const { cropArea, devicePixelRatio } = request;
    captureAndCrop(cropArea, devicePixelRatio)
      .then((croppedUrl) => {
        sendResponse({ screenshotUrl: croppedUrl });
      })
      .catch((err) => {
        sendResponse({ error: err.message || String(err) });
      });
    return true; // Keep the messaging channel open for async
  }
});

/**
 * Captures the currently visible area of the active tab,
 * then crops it based on the given rectangle (in CSS pixels)
 * scaled by `devicePixelRatio`.
 */
async function captureAndCrop(cropArea, ratio) {
  // 1) Capture the visible area as a base64-encoded PNG
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tabs.length) throw new Error('No active tab found.');
  const tab = tabs[0];
  
  const screenshotDataUrl = await chrome.tabs.captureVisibleTab(
    tab.windowId,
    { format: 'png' }
  );

  // 2) Convert the data URL to a bitmap (or HTMLImageElement)
  const blob = await (await fetch(screenshotDataUrl)).blob();
  const imageBitmap = await createImageBitmap(blob);

  // 3) Calculate the scaled coordinates
  //    Since getBoundingClientRect() returns values in CSS pixels,
  //    multiply them by devicePixelRatio for the actual image coordinates.
  const sx = cropArea.x * ratio;
  const sy = cropArea.y * ratio;
  const sw = cropArea.width * ratio;
  const sh = cropArea.height * ratio;

  // Ensure we don't go out of bounds
  const maxWidth = imageBitmap.width;
  const maxHeight = imageBitmap.height;

  const finalSx = Math.max(0, Math.min(sx, maxWidth));
  const finalSy = Math.max(0, Math.min(sy, maxHeight));
  const finalSw = Math.max(0, Math.min(sw, maxWidth - finalSx));
  const finalSh = Math.max(0, Math.min(sh, maxHeight - finalSy));

  // 4) Crop using an OffscreenCanvas (Manifest V3-friendly)
  const offscreen = new OffscreenCanvas(finalSw, finalSh);
  const ctx = offscreen.getContext('2d');
  ctx.drawImage(
    imageBitmap,
    finalSx, finalSy,      // Source X, Y
    finalSw, finalSh,      // Source W, H
    0, 0,                  // Dest X, Y
    finalSw, finalSh       // Dest W, H
  );

  // 5) Convert the cropped canvas back to a Data URL
  const croppedBlob = await offscreen.convertToBlob({ type: 'image/png' });
  const croppedDataUrl = await blobToDataUrl(croppedBlob);
  return croppedDataUrl;
}

/** Helper to turn a Blob into a base64 data URL. */
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(blob);
  });
}

chrome.runtime.onMessage.addListener((req) => {
  if (req.action === 'OPEN_IMAGE_TAB') {
    chrome.tabs.create({ url: req.url });
  }
});