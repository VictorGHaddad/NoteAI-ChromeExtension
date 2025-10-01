// Offscreen document for audio recording
console.log('Offscreen document loaded');

let mediaRecorder = null;
let recordedChunks = [];
let stream = null;
let audioContext = null;
let source = null;

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Offscreen received message:', message.action);
    
    if (message.action === 'startRecording') {
        startRecording(message.streamId)
            .then(() => sendResponse({ success: true }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
    
    if (message.action === 'stopRecording') {
        stopRecording()
            .then(result => sendResponse({ success: true, ...result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
    
    return false;
});

async function startRecording(streamId) {
    try {
        console.log('Starting recording with stream ID:', streamId);
        
        // Get the media stream
        const constraints = {
            audio: {
                mandatory: {
                    chromeMediaSource: 'tab',
                    chromeMediaSourceId: streamId
                }
            }
        };
        
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('Got media stream');
        
        // Create AudioContext to monitor and pass through audio
        audioContext = new AudioContext();
        source = audioContext.createMediaStreamSource(stream);
        
        // Create a destination to keep audio playing
        const destination = audioContext.createMediaStreamDestination();
        source.connect(destination);
        
        // Also connect to audio context destination to ensure audio plays
        source.connect(audioContext.destination);
        
        console.log('Audio routing configured - audio should play through');
        
        // Setup MediaRecorder with the original stream
        const options = {
            mimeType: 'audio/webm;codecs=opus'
        };
        
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options.mimeType = 'audio/webm';
        }
        
        mediaRecorder = new MediaRecorder(stream, options);
        recordedChunks = [];
        
        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
                console.log('Chunk recorded:', event.data.size, 'bytes');
            }
        };
        
        mediaRecorder.onstop = () => {
            console.log('MediaRecorder stopped');
        };
        
        mediaRecorder.start(1000);
        console.log('Recording started');
        
    } catch (error) {
        console.error('Error in startRecording:', error);
        throw error;
    }
}

async function stopRecording() {
    try {
        console.log('Stopping recording');
        
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        
        // Wait for final chunks
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Stop audio context
        if (audioContext) {
            await audioContext.close();
            audioContext = null;
        }
        
        // Stop stream
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        
        // Create blob
        const blob = new Blob(recordedChunks, { type: 'audio/webm' });
        console.log('Recording blob created:', blob.size, 'bytes,', recordedChunks.length, 'chunks');
        
        // Convert to base64
        const base64Audio = await blobToBase64(blob);
        
        // Save to storage
        await chrome.storage.local.set({
            lastRecording: {
                audio: base64Audio,
                timestamp: Date.now(),
                size: blob.size,
                chunks: recordedChunks.length
            }
        });
        
        console.log('Recording saved to storage');
        
        // Reset
        recordedChunks = [];
        mediaRecorder = null;
        
        return {
            size: blob.size,
            chunks: recordedChunks.length
        };
        
    } catch (error) {
        console.error('Error in stopRecording:', error);
        throw error;
    }
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

console.log('Offscreen script ready');
