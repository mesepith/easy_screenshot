(async function captureFullPage() {
    const totalHeight = document.body.scrollHeight;
    const viewportHeight = window.innerHeight;
    let currentScroll = 0;
    let screenshots = [];
  
    while (currentScroll < totalHeight) {
      window.scrollTo(0, currentScroll);
      await new Promise((resolve) => setTimeout(resolve, 500));
  
      const screenshot = await new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: "capture_visible_part" }, (response) => {
          resolve(response.screenshotUrl);
        });
      });
  
      screenshots.push({ image: screenshot, y: currentScroll });
      currentScroll += viewportHeight;
    }
  
    setTimeout(() => {
      chrome.runtime.sendMessage({ action: "merge_screenshots", screenshots });
    }, 1000);
  })();
  