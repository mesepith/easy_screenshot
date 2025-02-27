// viewer.js
window.addEventListener('DOMContentLoaded', () => {
    // Request the screenshot data from background.js
    chrome.runtime.sendMessage({ action: 'GET_IMAGE_DATA' }, (response) => {
      if (response && response.dataUrl) {
        document.getElementById('screenshot').src = response.dataUrl;
      } else {
        document.getElementById('screenshot').alt = 'No image data found.';
      }
    });
  });
  