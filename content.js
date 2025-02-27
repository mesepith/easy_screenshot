document.addEventListener("mousedown", startSelection);
document.addEventListener("mouseup", endSelection);

let startX, startY, endX, endY, selectionBox;

function startSelection(event) {
  startX = event.clientX;
  startY = event.clientY;

  selectionBox = document.createElement("div");
  selectionBox.style.position = "fixed";
  selectionBox.style.border = "2px dashed red";
  selectionBox.style.background = "rgba(255,0,0,0.2)";
  selectionBox.style.left = startX + "px";
  selectionBox.style.top = startY + "px";
  selectionBox.style.zIndex = "9999";

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
    selection: { x: startX, y: startY, width: endX - startX, height: endY - startY }
  });
}
