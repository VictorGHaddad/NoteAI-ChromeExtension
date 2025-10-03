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
        
        // Check if there's actually a recording to stop
        if (!mediaRecorder) {
            console.warn('No active recording to stop');
            return {
                size: 0,
                chunks: 0,
                warning: 'No active recording'
            };
        }
        
        // Stop MediaRecorder if it's recording
        if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            console.log('MediaRecorder stopped');
        } else {
            console.warn('MediaRecorder was already inactive');
        }
        
        // Wait for final chunks
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Stop audio context
        if (audioContext) {
            try {
                await audioContext.close();
                console.log('AudioContext closed');
            } catch (e) {
                console.warn('Error closing AudioContext:', e);
            }
            audioContext = null;
        }
        
        // Stop stream
        if (stream) {
            stream.getTracks().forEach(track => {
                try {
                    track.stop();
                } catch (e) {
                    console.warn('Error stopping track:', e);
                }
            });
            console.log('Stream tracks stopped');
            stream = null;
        }
        
        // Check if we have recorded data
        if (!recordedChunks || recordedChunks.length === 0) {
            console.warn('No recorded chunks available');
            mediaRecorder = null;
            return {
                size: 0,
                chunks: 0,
                warning: 'No audio data recorded'
            };
        }
        
        // Create blob
        const blob = new Blob(recordedChunks, { type: 'audio/webm' });
        console.log('Recording blob created:', blob.size, 'bytes,', recordedChunks.length, 'chunks');
        
        // Convert to base64
        const base64Audio = await blobToBase64(blob);
        console.log('Audio converted to base64, length:', base64Audio.length);
        
        // Reset state
        const resultSize = blob.size;
        const resultChunks = recordedChunks.length;
        recordedChunks = [];
        mediaRecorder = null;
        
        // Return the audio data to background script so it can save to storage
        return {
            size: resultSize,
            chunks: resultChunks,
            audio: base64Audio,
            timestamp: Date.now()
        };
        
    } catch (error) {
        console.error('Error in stopRecording:', error);
        
        // Clean up even on error
        if (audioContext) {
            try { await audioContext.close(); } catch (e) {}
            audioContext = null;
        }
        if (stream) {
            stream.getTracks().forEach(track => {
                try { track.stop(); } catch (e) {}
            });
            stream = null;
        }
        recordedChunks = [];
        mediaRecorder = null;
        
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
