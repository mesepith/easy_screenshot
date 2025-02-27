// contentScript.js

let selecting = false;
let selectionDiv = null;
let startX = 0;
let startY = 0;

const SELECTION_DIV_ID = '__my_custom_selection_div__';

// Listen for the "START_SELECTION" message from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'START_SELECTION') {
    activateSelectionMode();
  }
});

function activateSelectionMode() {
  // Add event listeners to create a selection rectangle on the page
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  // Optionally, you could add an overlay or instructions...
}

function onMouseDown(e) {
  if (e.button !== 0) return; // only left-click
  selecting = true;

  startX = e.clientX;
  startY = e.clientY;

  // Create a div to represent the selection area
  if (!selectionDiv) {
    selectionDiv = document.createElement('div');
    selectionDiv.id = SELECTION_DIV_ID;
    Object.assign(selectionDiv.style, {
      position: 'fixed',
      border: '2px dashed #333',
      backgroundColor: 'rgba(0, 0, 0, 0.2)',
      top: startY + 'px',
      left: startX + 'px',
      width: '0px',
      height: '0px',
      zIndex: 999999,
      pointerEvents: 'none'
    });
    document.body.appendChild(selectionDiv);
  } else {
    selectionDiv.style.display = 'block';
  }
}

function onMouseMove(e) {
  if (!selecting || !selectionDiv) return;
  const currentX = e.clientX;
  const currentY = e.clientY;

  const left = Math.min(startX, currentX);
  const top = Math.min(startY, currentY);
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);

  selectionDiv.style.left = left + 'px';
  selectionDiv.style.top = top + 'px';
  selectionDiv.style.width = width + 'px';
  selectionDiv.style.height = height + 'px';
}

function onMouseUp(e) {
  if (!selecting) return;
  selecting = false;

  // Remove event listeners
  document.removeEventListener('mousedown', onMouseDown);
  document.removeEventListener('mousemove', onMouseMove);
  document.removeEventListener('mouseup', onMouseUp);

  // Get final rect
  const rect = selectionDiv.getBoundingClientRect();
  
  // Hide or remove selectionDiv
  selectionDiv.remove();
  selectionDiv = null;

  // Prepare the crop area in CSS pixels
  const cropArea = {
    x: rect.left,    // relative to the viewport
    y: rect.top,
    width: rect.width,
    height: rect.height
  };

  // Get the device pixel ratio from the page
  const ratio = window.devicePixelRatio || 1;

  // Send message to background to capture & crop
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
      // Open the captured image in a new tab
      const url = response.screenshotUrl;
      chrome.runtime.sendMessage({ action: 'OPEN_IMAGE_TAB', url });
    }
  );
}
