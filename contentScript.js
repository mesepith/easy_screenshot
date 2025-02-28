// contentScript.js

let overlay = null;
let selectionBox = null;
let popover = null;
let startX = 0;
let startY = 0;
let isSelecting = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'START_SELECTION') {
    createOverlay();
  }
});

/**
 * Create a full-page overlay that captures all mouse events,
 * preventing the underlying page from highlighting text/images.
 */
function createOverlay() {
  removeAllUI(); // clean up if there's any leftover UI

  overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: 999999,
    backgroundColor: 'transparent',
    cursor: 'crosshair',
    userSelect: 'none'
  });

  overlay.style.width = document.documentElement.scrollWidth + 'px';
  overlay.style.height = document.documentElement.scrollHeight + 'px';

  overlay.addEventListener('mousedown', onMouseDown);
  overlay.addEventListener('mousemove', onMouseMove);
  overlay.addEventListener('mouseup', onMouseUp);
  overlay.addEventListener('mouseleave', onMouseLeave);

  document.body.appendChild(overlay);
}

/** Removes overlay, selection box, and popover (if any). */
function removeAllUI() {
  if (overlay) {
    overlay.remove();
    overlay = null;
  }
  if (popover) {
    popover.remove();
    popover = null;
  }
  if (selectionBox) {
    selectionBox.remove();
    selectionBox = null;
  }
}

/** Removes only the overlay (mouse capture), but keeps the selection box visible. */
function removeOverlayOnly() {
  if (overlay) {

    // If we have a selection box, move it out of the overlay
    if (selectionBox) {
      document.body.appendChild(selectionBox);
    }

    overlay.remove();
    overlay = null;
  }
}

function onMouseDown(e) {
  if (e.button !== 0) return; // only left-click
  isSelecting = true;
  startX = e.pageX;
  startY = e.pageY;

  if (!selectionBox) {
    selectionBox = document.createElement('div');
    Object.assign(selectionBox.style, {
      position: 'absolute',
      border: '2px dotted #e74c3c', // dotted red border
      backgroundColor: 'rgba(255, 0, 0, 0.05)', // slight tinted background
      left: `${startX}px`,
      top: `${startY}px`,
      width: '0px',
      height: '0px',
      zIndex: 999999
    });
    overlay.appendChild(selectionBox);
  } else {
    // reset its style
    selectionBox.style.left = `${startX}px`;
    selectionBox.style.top = `${startY}px`;
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    selectionBox.style.display = 'block';
  }
}

function onMouseMove(e) {
  if (!isSelecting) return;
  const currentX = e.pageX;
  const currentY = e.pageY;

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

  // Get final rectangle
  const rect = selectionBox.getBoundingClientRect();

  // Remove only the overlay so page is interactive again,
  // but keep the selection box visible.
  removeOverlayOnly();

  // If the user basically clicked without dragging (zero-size area), do nothing
  if (rect.width === 0 || rect.height === 0) {
    selectionBox.remove();
    selectionBox = null;
    return;
  }

  const cropArea = {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height
  };
  const ratio = window.devicePixelRatio || 1;

  // Request background to capture & crop
  chrome.runtime.sendMessage(
    { action: 'CAPTURE_AREA', cropArea, devicePixelRatio: ratio },
    (response) => {
      if (response.error) {
        console.error('Capture error:', response.error);
        return;
      }
      // Show a nice popover near the selected area
      createPopover({
        x: rect.left,
        y: rect.top + rect.height + 5, // slightly below the selection
        dataUrl: response.screenshotUrl
      });
    }
  );
}

function onMouseLeave(e) {
  if (isSelecting) {
    isSelecting = false;
    removeOverlayOnly();
  }
}

/**
 * Creates a floating popover with 3 action buttons + Close, styled nicely.
 * Positions it near the selection rectangle.
 */
function createPopover({ x, y, dataUrl }) {
  // remove any existing popover
  if (popover) {
    popover.remove();
  }

  popover = document.createElement('div');
  Object.assign(popover.style, {
    position: 'fixed',
    left: x + 'px',
    top: y + 'px',
    backgroundColor: '#fff',
    border: '2px solid #3498db',
    borderRadius: '8px',
    padding: '8px',
    fontFamily: 'sans-serif',
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
    zIndex: 999999
  });

  // A helper function to create a styled button quickly
  function createStyledButton(label, onClick) {
    const btn = document.createElement('button');
    btn.textContent = label;
    Object.assign(btn.style, {
      backgroundColor: '#3498db',
      color: '#fff',
      border: 'none',
      borderRadius: '4px',
      padding: '6px 10px',
      cursor: 'pointer',
      fontSize: '13px',
      fontFamily: 'inherit'
    });
    btn.addEventListener('mouseover', () => {
      btn.style.opacity = '0.8';
    });
    btn.addEventListener('mouseout', () => {
      btn.style.opacity = '1';
    });
    btn.addEventListener('click', onClick);
    return btn;
  }

  // 1) Copy button
  const copyBtn = createStyledButton('Copy', async () => {
    try {
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

  // 2) Download button
  const downloadBtn = createStyledButton('Download', () => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = 'capture.png';
    a.click();
  });

  // 3) Open in New Tab
  const openBtn = createStyledButton('Open', () => {
    // If you're using direct data URL: window.open(dataUrl, '_blank') might be blocked
    // Instead, use your background-based approach if needed:
    chrome.runtime.sendMessage({ action: 'OPEN_IMAGE_VIEWER', dataUrl });
  });

  // "Close (X)" button
  const closeBtn = createStyledButton('X', () => {

    // remove popover
    popover.remove();
    popover = null;

    // remove selection box
    if (selectionBox) {
      selectionBox.remove();
      selectionBox = null;
    }
  });
  closeBtn.style.backgroundColor = '#e74c3c'; // red for close
  closeBtn.style.fontWeight = 'bold';
  closeBtn.style.padding = '6px 12px';

  popover.appendChild(copyBtn);
  popover.appendChild(downloadBtn);
  popover.appendChild(openBtn);
  popover.appendChild(closeBtn);

  document.body.appendChild(popover);

  // Ensure popover doesn't go off-screen to the right/bottom
  const popRect = popover.getBoundingClientRect();
  if (popRect.right > window.innerWidth) {
    popover.style.left = (window.innerWidth - popRect.width - 10) + 'px';
  }
  if (popRect.bottom > window.innerHeight) {
    popover.style.top = (y - popRect.height - 10) + 'px';
  }
}
