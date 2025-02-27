// background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'CAPTURE_AREA') {
    const { cropArea, devicePixelRatio } = request;
    captureAndCrop(cropArea, devicePixelRatio)
      .then((dataUrl) => sendResponse({ screenshotUrl: dataUrl }))
      .catch((err) => sendResponse({ error: err.message || String(err) }));
    return true; // Keep the messaging channel open for async
  }

  if (request.action === 'OPEN_IMAGE_TAB') {
    // Safely open a new tab with the data URL
    chrome.tabs.create({ url: request.url });
  }
});

/**
 * Capture the *visible* portion of the current tab, then crop using the given area.
 * The area is in *CSS pixels*, so multiply by devicePixelRatio to get the correct
 * region from the screenshot.
 */
async function captureAndCrop(cropArea, ratio) {
  // 1) Get the active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) throw new Error('No active tab found.');

  // 2) Capture visible area
  const screenshotDataUrl = await chrome.tabs.captureVisibleTab(
    tab.windowId,
    { format: 'png' }
  );

  // 3) Convert the data URL to a Blob and then an ImageBitmap
  const blob = await (await fetch(screenshotDataUrl)).blob();
  const imageBitmap = await createImageBitmap(blob);

  // 4) Scale the cropArea by devicePixelRatio
  const sx = cropArea.x * ratio;
  const sy = cropArea.y * ratio;
  const sw = cropArea.width * ratio;
  const sh = cropArea.height * ratio;

  // Make sure we don't go out of bounds
  const maxWidth = imageBitmap.width;
  const maxHeight = imageBitmap.height;

  const finalSx = Math.max(0, Math.min(sx, maxWidth));
  const finalSy = Math.max(0, Math.min(sy, maxHeight));
  const finalSw = Math.max(0, Math.min(sw, maxWidth - finalSx));
  const finalSh = Math.max(0, Math.min(sh, maxHeight - finalSy));

  if (finalSw <= 0 || finalSh <= 0) {
    throw new Error('Invalid selection region.');
  }

  // 5) Crop using OffscreenCanvas
  const offscreen = new OffscreenCanvas(finalSw, finalSh);
  const ctx = offscreen.getContext('2d');
  ctx.drawImage(
    imageBitmap,
    finalSx,
    finalSy,
    finalSw,
    finalSh,
    0,
    0,
    finalSw,
    finalSh
  );

  // 6) Convert cropped portion to Data URL
  const croppedBlob = await offscreen.convertToBlob({ type: 'image/png' });
  const croppedDataUrl = await blobToDataUrl(croppedBlob);
  return croppedDataUrl;
}

/** Helper: convert a Blob to base64 data URL. */
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = (err) => reject(err);
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}
