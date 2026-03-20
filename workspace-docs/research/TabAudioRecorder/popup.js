const startBtn = document.getElementById('start');
const stopBtn = document.getElementById('stop');
const statusEl = document.getElementById('status');

// Check current recording state when popup opens
chrome.storage.local.get(['recording'], (data) => {
  if (data.recording) {
    startBtn.classList.add('hidden');
    stopBtn.classList.remove('hidden');
    statusEl.textContent = '\u25CF Recording\u2026';
    statusEl.className = 'recording';
  }
});

startBtn.addEventListener('click', () => {
  startBtn.disabled = true;
  statusEl.textContent = 'Starting\u2026';
  statusEl.className = '';

  chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (!tab) {
      statusEl.textContent = 'Error: no active tab';
      startBtn.disabled = false;
      return;
    }
    chrome.runtime.sendMessage({ command: 'start', tabId: tab.id }, (resp) => {
      if (chrome.runtime.lastError) {
        statusEl.textContent = 'Error: ' + chrome.runtime.lastError.message;
        startBtn.disabled = false;
        return;
      }
      if (resp && resp.status === 'started') {
        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
        statusEl.textContent = '\u25CF Recording\u2026';
        statusEl.className = 'recording';
      } else {
        statusEl.textContent = 'Error: ' + (resp ? resp.error : 'unknown');
        statusEl.className = '';
        startBtn.disabled = false;
      }
    });
  });
});

stopBtn.addEventListener('click', () => {
  stopBtn.disabled = true;
  statusEl.textContent = 'Stopping & transcribing\u2026';
  statusEl.className = '';

  chrome.runtime.sendMessage({ command: 'stop' }, (resp) => {
    stopBtn.disabled = false;
    stopBtn.classList.add('hidden');
    startBtn.classList.remove('hidden');
    startBtn.disabled = false;

    if (chrome.runtime.lastError) {
      statusEl.textContent = 'Error: ' + chrome.runtime.lastError.message;
      return;
    }
    if (resp && resp.status === 'stopped') {
      statusEl.textContent = '\u2713 Transcript saved to CEG';
      statusEl.className = '';
    } else if (resp && resp.status === 'transcribed_save_failed') {
      statusEl.textContent = '\u26A0 Transcribed but CEG save failed';
    } else if (resp && resp.status === 'no_speech') {
      statusEl.textContent = 'No speech detected';
    } else {
      statusEl.textContent = resp ? resp.error || 'No recording active' : 'No recording active';
    }
  });
});
