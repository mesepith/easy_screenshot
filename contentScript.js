// contentScript.js

let overlay = null;
let selectionBox = null;
let startX = 0;
let startY = 0;
let isSelecting = false;

// We'll store the final screenshot dataUrl here (if needed).
let screenshotDataUrl = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'START_SELECTION') {
    createOverlay();
  }
});

/**
 * Create a full-page overlay that captures all mouse events,
 * so the underlying page doesn't highlight text/images.
 */
function createOverlay() {
  removeOverlay(); // remove if already present

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
    userSelect: 'none' // no text selection on overlay
  });

  // Listen for mouse events *on the overlay* (not the document)
  overlay.addEventListener('mousedown', onMouseDown);
  overlay.addEventListener('mousemove', onMouseMove);
  overlay.addEventListener('mouseup', onMouseUp);
  overlay.addEventListener('mouseleave', onMouseLeave);

  document.body.appendChild(overlay);
}

/** Remove overlay and any selection box or popover. */
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

/** Mouse down: start drawing the selection box. */
function onMouseDown(e) {
  if (e.button !== 0) return; // Only left-click
  isSelecting = true;
  startX = e.clientX;
  startY = e.clientY;

  // Create the selection box if not existing
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
    // Reset existing box
    selectionBox.style.display = 'block';
    selectionBox.style.left = `${startX}px`;
    selectionBox.style.top = `${startY}px`;
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
  }
}

/** Mouse move: update selection box dimensions. */
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

/** Mouse up: finalize selection, capture screenshot, show popover with buttons. */
function onMouseUp(e) {
  if (!isSelecting) return;
  isSelecting = false;

  // Get final rectangle of the selection box
  const rect = selectionBox.getBoundingClientRect();

  // Remove the overlay so the page is interactive again
  removeOverlay();

  // If user just clicked without dragging, or a zero-size selection, do nothing
  if (rect.width === 0 || rect.height === 0) {
    return;
  }

  // Prepare cropping data
  const cropArea = {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height
  };
  const ratio = window.devicePixelRatio || 1;

  // Request the background to capture & crop
  chrome.runtime.sendMessage(
    { action: 'CAPTURE_AREA', cropArea, devicePixelRatio: ratio },
    async (response) => {
      if (response.error) {
        console.error('Capture error:', response.error);
        return;
      }

      // We have our screenshot data URL!
      screenshotDataUrl = response.screenshotUrl;

      // Create a small popover near the selected area with the 3 buttons
      createPopover({
        x: rect.left,
        y: rect.top + rect.height + 5, // put it just below the selection
        dataUrl: screenshotDataUrl
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

/**
 * Creates a small popover with three buttons: Copy, Download, Open in new tab.
 * Positions it near (x, y) in the viewport.
 */
function createPopover({ x, y, dataUrl }) {
  // A container for the popover
  const popover = document.createElement('div');
  Object.assign(popover.style, {
    position: 'fixed',
    left: x + 'px',
    top: y + 'px',
    backgroundColor: '#fff',
    border: '1px solid #ccc',
    padding: '8px',
    zIndex: '999999',
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
  });

  // 1) Copy Button
  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy';
  copyBtn.style.cursor = 'pointer';
  copyBtn.addEventListener('click', async () => {
    try {
      // Convert dataUrl to blob
      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      alert('Image copied to clipboard!');
    } catch (err) {
      console.error(err);
      alert('Failed to copy image.');
    }
  });

  // 2) Download Button
  const downloadBtn = document.createElement('button');
  downloadBtn.textContent = 'Download';
  downloadBtn.style.cursor = 'pointer';
  downloadBtn.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'capture.png';
    // Programmatically click the link
    a.click();
  });

  // 3) Open in New Tab Button
  const openBtn = document.createElement('button');
  openBtn.textContent = 'Open in New Tab';
  openBtn.style.cursor = 'pointer';
  openBtn.addEventListener('click', () => {
    // Instead of window.open(dataUrl, '_blank'), which is blocked:
    chrome.runtime.sendMessage({ action: 'OPEN_IMAGE_VIEWER', dataUrl });
  });

  // Append buttons
  popover.appendChild(copyBtn);
  popover.appendChild(downloadBtn);
  popover.appendChild(openBtn);

  // Optionally, add a "Close" or "X" button if you want to remove the popover
  const closeBtn = document.createElement('button');
  closeBtn.textContent = 'X';
  closeBtn.style.cursor = 'pointer';
  closeBtn.addEventListener('click', () => {
    popover.remove();
  });
  popover.appendChild(closeBtn);

  document.body.appendChild(popover);

  // Adjust popover if it goes off-screen (simple logic)
  const popRect = popover.getBoundingClientRect();
  if (popRect.right > window.innerWidth) {
    popover.style.left = (window.innerWidth - popRect.width - 10) + 'px';
  }
  if (popRect.bottom > window.innerHeight) {
    popover.style.top = (y - popRect.height - 10) + 'px';
  }
}
