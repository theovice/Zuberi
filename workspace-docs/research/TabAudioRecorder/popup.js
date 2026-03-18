document.getElementById('stop').addEventListener('click', () => {
  // Find the active tab to send stop command
  chrome.tabs.query({active: true, currentWindow: true}, ([tab]) => {
    chrome.runtime.sendMessage({command: 'stop', tabId: tab.id}, resp => {
      console.log(resp.status);
      window.close();
    });
  });
});
