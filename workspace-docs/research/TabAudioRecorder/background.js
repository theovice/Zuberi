// Tab Audio Recorder — background service worker (Manifest V3)
// Flow: popup -> background (tabCapture stream ID) -> offscreen (MediaRecorder) -> background (transcribe + save)
//
// Message routing:
//   popup  -> background: {command: 'start'|'stop'}     (sendMessage with callback)
//   background -> offscreen: {target: 'offscreen', ...}  (sendMessage, fire-and-forget)
//   offscreen -> background: {target: 'background', ...} (sendMessage, fire-and-forget)
//
// The 'target' field prevents cross-listener interference that causes
// "message port closed before a response was received" errors.

let currentTabId = null;
let stopResolve = null;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Ignore messages targeted at other contexts
  if (msg.target && msg.target !== 'background') {
    return false;
  }

  if (msg.command === 'start') {
    handleStart(msg.tabId)
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ status: 'error', error: err.message }));
    return true; // keep port open for async response
  }

  if (msg.command === 'stop') {
    handleStop()
      .then(result => sendResponse(result))
      .catch(err => sendResponse({ status: 'error', error: err.message }));
    return true; // keep port open for async response
  }

  if (msg.command === 'recording-complete') {
    // Offscreen finished recording — resolve the pending stop promise
    if (stopResolve) {
      processRecording(msg.audioDataUrl).then(result => {
        stopResolve(result);
        stopResolve = null;
      });
    }
    return false; // no response needed
  }

  // Unrecognized message — don't hold the port open
  return false;
});

async function handleStart(tabId) {
  if (currentTabId !== null) {
    return { status: 'error', error: 'Already recording' };
  }

  // Get media stream ID for the target tab
  const streamId = await new Promise((resolve, reject) => {
    chrome.tabCapture.getMediaStreamId({ targetTabId: tabId }, (id) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(id);
      }
    });
  });

  // Create offscreen document if not already present
  await ensureOffscreen();

  // Small delay to let offscreen.js register its listener
  await new Promise(r => setTimeout(r, 100));

  // Tell offscreen document to start recording with the stream ID.
  // Use 'target' field so only offscreen.js processes this message.
  // Include a no-op callback to suppress "port closed" warnings.
  chrome.runtime.sendMessage(
    { target: 'offscreen', command: 'offscreen-start', streamId: streamId },
    () => { void chrome.runtime.lastError; }
  );

  currentTabId = tabId;
  await chrome.storage.local.set({ recording: true, recordingTabId: tabId });

  return { status: 'started' };
}

async function ensureOffscreen() {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT']
  });
  if (contexts.length === 0) {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['USER_MEDIA'],
      justification: 'Recording tab audio for transcription'
    });
  }
}

async function handleStop() {
  if (currentTabId === null) {
    return { status: 'error', error: 'Not recording' };
  }

  currentTabId = null;
  await chrome.storage.local.set({ recording: false, recordingTabId: null });

  // Ask offscreen to stop and wait for the audio data
  return new Promise((resolve) => {
    stopResolve = resolve;

    chrome.runtime.sendMessage(
      { target: 'offscreen', command: 'offscreen-stop' },
      () => { void chrome.runtime.lastError; }
    );

    // Safety timeout: 60 seconds
    setTimeout(() => {
      if (stopResolve) {
        stopResolve({ status: 'error', error: 'Timeout waiting for recording data' });
        stopResolve = null;
      }
    }, 60000);
  });
}

async function processRecording(audioDataUrl) {
  try {
    // Convert data URL back to blob
    const response = await fetch(audioDataUrl);
    const audioBlob = await response.blob();

    // Transcribe via Whisper on CEG:8200
    const form = new FormData();
    form.append('file', audioBlob, 'audio.webm');

    const whisperRes = await fetch('http://100.100.101.1:8200/transcribe', {
      method: 'POST',
      body: form
    });

    if (!whisperRes.ok) {
      throw new Error('Whisper returned HTTP ' + whisperRes.status);
    }

    const whisperJson = await whisperRes.json();

    // Extract transcript text
    let text = whisperJson.text || '';
    if (!text && whisperJson.segments) {
      text = whisperJson.segments.map(s => s.text).join(' ');
    }

    if (!text.trim()) {
      return { status: 'no_speech' };
    }

    // Build filesystem-safe timestamp: YYYY-MM-DD-HHmmss
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const tsFile = [
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate())
    ].join('-') + '-' + [
      pad(now.getHours()),
      pad(now.getMinutes()),
      pad(now.getSeconds())
    ].join('');

    const isoTs = now.toISOString();

    const markdown = [
      '# Transcript \u2014 ' + tsFile,
      '',
      '**Captured:** ' + isoTs,
      '**Source:** Tab Audio Recorder',
      '',
      '---',
      '',
      text.trim(),
      ''
    ].join('\n');

    // Save to CEG via dispatch :3003/command using base64
    const b64Content = btoa(unescape(encodeURIComponent(markdown)));
    const filePath = '/opt/zuberi/data/learning/transcripts/' + tsFile + '_recording.md';
    const writeCmd = "echo '" + b64Content + "' | base64 -d > '" + filePath + "'";

    const saveRes = await fetch('http://100.100.101.1:3003/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: writeCmd })
    });

    if (!saveRes.ok) {
      console.error('CEG save failed: HTTP', saveRes.status);
      return { status: 'transcribed_save_failed', text: text.substring(0, 100) };
    }

    console.log('Transcript saved to CEG:', filePath);
    return { status: 'stopped', path: filePath };

  } catch (err) {
    console.error('processRecording failed:', err);
    return { status: 'error', error: err.message };
  }
}
