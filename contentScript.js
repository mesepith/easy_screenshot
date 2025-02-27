// contentScript.js

let overlay = null;
let selectionBox = null;
let startX = 0;
let startY = 0;
let isSelecting = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'START_SELECTION') {
    createOverlay();
  }
});

/**
 * Create a full-page overlay and attach mouse events.
 * This stops the browser from highlighting underlying text.
 */
function createOverlay() {
  // If an overlay already exists, remove it (cleanup).
  removeOverlay();

  overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100vw',
    height: '100vh',
    zIndex: '999999',
    backgroundColor: 'transparent',
    cursor: 'crosshair',
    userSelect: 'none'        // prevent text selection on overlay
  });

  // Listen to mouse events on the overlay, not the document
  overlay.addEventListener('mousedown', onMouseDown);
  overlay.addEventListener('mousemove', onMouseMove);
  overlay.addEventListener('mouseup', onMouseUp);
  overlay.addEventListener('mouseleave', onMouseLeave);

  document.body.appendChild(overlay);
}

function removeOverlay() {
  if (overlay) {
    overlay.remove();
    overlay = null;
  }
  if (selectionBox) {
    selectionBox.remove();
    selectionBox = null;
  }
}

function onMouseDown(e) {
  if (e.button !== 0) return; // Only left click
  isSelecting = true;
  startX = e.clientX;
  startY = e.clientY;

  // Create or reset selectionBox
  if (!selectionBox) {
    selectionBox = document.createElement('div');
    Object.assign(selectionBox.style, {
      position: 'absolute',
      border: '2px dashed #333',
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      left: `${startX}px`,
      top: `${startY}px`,
      width: '0px',
      height: '0px'
    });
    overlay.appendChild(selectionBox);
  } else {
    selectionBox.style.display = 'block';
    selectionBox.style.left = `${startX}px`;
    selectionBox.style.top = `${startY}px`;
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
  }
}

function onMouseMove(e) {
  if (!isSelecting || !selectionBox) return;

  const currentX = e.clientX;
  const currentY = e.clientY;

  const left = Math.min(startX, currentX);
  const top = Math.min(startY, currentY);
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);

  selectionBox.style.left = left + 'px';
  selectionBox.style.top = top + 'px';
  selectionBox.style.width = width + 'px';
  selectionBox.style.height = height + 'px';
}

function onMouseUp(e) {
  if (!isSelecting) return;
  isSelecting = false;

  // Get the final rectangle
  const rect = selectionBox.getBoundingClientRect();

  // Remove overlay to restore normal page interaction
  removeOverlay();

  // Prepare the data for cropping
  const cropArea = {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height
  };
  const ratio = window.devicePixelRatio || 1;

  // Request background to capture & crop
  chrome.runtime.sendMessage(
    {
      action: 'CAPTURE_AREA',
      cropArea,
      devicePixelRatio: ratio
    },
    (response) => {
      if (response.error) {
        console.error('Capture error:', response.error);
        return;
      }
      // Open the image in a new tab
      chrome.runtime.sendMessage({
        action: 'OPEN_IMAGE_TAB',
        url: response.screenshotUrl
      });
    }
  );
}

function onMouseLeave(e) {
  // If the user drags outside the viewport, cancel selection
  if (isSelecting) {
    isSelecting = false;
    removeOverlay();
  }
}
