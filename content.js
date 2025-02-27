let startX, startY, endX, endY, selectionBox;

document.addEventListener("mousedown", startSelection);
document.addEventListener("mouseup", endSelection);

function startSelection(event) {
  startX = event.clientX;
  startY = event.clientY;

  selectionBox = document.createElement("div");
  selectionBox.style.position = "fixed";
  selectionBox.style.border = "2px dashed red";
  selectionBox.style.background = "rgba(255, 0, 0, 0.3)";
  selectionBox.style.left = startX + "px";
  selectionBox.style.top = startY + "px";
  selectionBox.style.zIndex = "9999";
  selectionBox.style.pointerEvents = "none";

  document.body.appendChild(selectionBox);
  document.addEventListener("mousemove", drawSelection);
}

function drawSelection(event) {
  endX = event.clientX;
  endY = event.clientY;

  selectionBox.style.width = Math.abs(endX - startX) + "px";
  selectionBox.style.height = Math.abs(endY - startY) + "px";
  selectionBox.style.left = Math.min(startX, endX) + "px";
  selectionBox.style.top = Math.min(startY, endY) + "px";
}

function endSelection() {
  document.removeEventListener("mousemove", drawSelection);
  setTimeout(() => {
    selectionBox.remove();
  }, 500);

  chrome.runtime.sendMessage({
    action: "capture_selected_area",
    selection: {
      x: Math.min(startX, endX),
      y: Math.min(startY, endY),
      width: Math.abs(endX - startX),
      height: Math.abs(endY - startY)
    }
  });
}
