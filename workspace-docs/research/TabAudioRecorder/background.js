// Updated background.js with 10‑minute chunking
// The recorder now buffers audio data and flushes it every 10 minutes.
// Each flush transcribes the buffered audio and appends the result to an
// in‑memory transcript string. The live recording continues uninterrupted.

// Keep a single recorder per tab and a buffer for each.
const recorders = new Map();
const buffers = new Map(); // tabId -> array of Blob chunks
const timers = new Map(); // tabId -> setInterval id
const transcriptBuffers = new Map(); // tabId -> string of transcripts

/** Request to start recording the active tab */
chrome.action.onClicked.addListener(() => {
  chrome.tabs.query({active: true, currentWindow: true}, ([tab]) => {
    startRecording(tab.id);
  });
});

/** Request to stop recording (called from popup) */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.command === 'stop') {
    const rec = recorders.get(msg.tabId);
    if (rec) {
      rec.stop();
      clearInterval(timers.get(msg.tabId));
      recorders.delete(msg.tabId);
      timers.delete(msg.tabId);
      // Flush any remaining buffered data
      flushBuffer(msg.tabId, true).then(() => {
        sendResponse({status: 'stopped'});
      });
      return true; // async response
    }
    sendResponse({status: 'no recording'});
  }
});

/** Start recording the audio stream of a tab */
function startRecording(tabId) {
  if (recorders.has(tabId)) return;
  chrome.tabCapture.capture({audio: true, video: false}, stream => {
    if (!stream) {
      console.error('Could not capture audio:', chrome.runtime.lastError);
      return;
    }
    const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
    const chunkArray = [];
    buffers.set(tabId, chunkArray);
    transcriptBuffers.set(tabId, '');

    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) chunkArray.push(e.data);
    };

    mediaRecorder.onstop = () => {
      // Flush whatever is left
      flushBuffer(tabId, true);
      // Final transcript file
      const finalTranscript = transcriptBuffers.get(tabId);
      if (finalTranscript) {
        downloadTranscript(finalTranscript);
      }
    };

    mediaRecorder.start();
    recorders.set(tabId, mediaRecorder);
    // Flush every 10 minutes (600,000 ms)
    const timerId = setInterval(() => flushBuffer(tabId), 10 * 60 * 1000);
    timers.set(tabId, timerId);
    console.log(`Started recording tab ${tabId}`);
  });
}

/** Flush buffered audio and transcribe it */
async function flushBuffer(tabId, final = false) {
  const chunkArray = buffers.get(tabId) || [];
  if (chunkArray.length === 0) return;
  const audioBlob = new Blob(chunkArray, { type: 'audio/webm' });
  // Transcribe and append
  try {
    const transcript = await transcribeAudio(audioBlob);
    transcriptBuffers.set(tabId, transcriptBuffers.get(tabId) + transcript + '\n');
  } catch (err) {
    console.error('Transcription failed:', err);
  }
  // Clear buffer
  buffers.set(tabId, []);
  // If final, also persist the raw audio chunk (optional)
  if (final) {
    const segmentFilename = `segment-${Date.now()}.webm`;
    const url = URL.createObjectURL(audioBlob);
    chrome.downloads.download({
      url,
      filename: segmentFilename,
      conflictAction: 'uniquify',
      saveAs: false
    });
  }
}

/** Placeholder: replace with real transcription service */
async function transcribeAudio(blob) {
  const form = new FormData();
  form.append('file', blob, 'audio.webm');
  const res = await fetch('https://YOUR-TRANSCRIPTION-SERVER/record', {
    method: 'POST',
    body: form
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.transcript; // expecting { transcript: "..." }
}

/** Trigger a download of the final transcript */
function downloadTranscript(text) {
  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const filename = `transcript-${Date.now()}.txt`;
  chrome.downloads.download({
    url,
    filename,
    conflictAction: 'uniquify',
    saveAs: false
  });
}
