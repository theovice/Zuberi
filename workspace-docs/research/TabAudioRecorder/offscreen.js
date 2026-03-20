// Offscreen document for persistent audio recording.
// Receives a tabCapture stream ID from the service worker,
// records via MediaRecorder, and sends the audio blob back when stopped.
//
// Only processes messages with {target: 'offscreen'}.
// Returns false for all other messages to avoid interfering with
// popup <-> background message ports.

let mediaRecorder = null;
let chunks = [];
let activeStream = null;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Only handle messages explicitly targeted at the offscreen document
  if (msg.target !== 'offscreen') {
    return false;
  }

  if (msg.command === 'offscreen-start' && msg.streamId) {
    startRecording(msg.streamId);
    return false; // no async response needed
  }

  if (msg.command === 'offscreen-stop') {
    stopRecording();
    return false; // no async response needed
  }

  return false;
});

async function startRecording(streamId) {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: 'tab',
          chromeMediaSourceId: streamId
        }
      }
    });

    activeStream = stream;
    chunks = [];
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm;codecs=opus'
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      chunks = [];

      // Convert blob to data URL and send back to service worker
      const reader = new FileReader();
      reader.onloadend = () => {
        chrome.runtime.sendMessage(
          {
            target: 'background',
            command: 'recording-complete',
            audioDataUrl: reader.result
          },
          () => { void chrome.runtime.lastError; }
        );
      };
      reader.readAsDataURL(blob);

      // Release audio tracks
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
        activeStream = null;
      }
    };

    // Collect data every second for smooth chunking
    mediaRecorder.start(1000);
    console.log('Offscreen: recording started');

  } catch (err) {
    console.error('Offscreen: failed to start recording:', err);
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
}
