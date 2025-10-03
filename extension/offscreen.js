// Offscreen document for audio recording
console.log('Offscreen document loaded');

let mediaRecorder = null;
let recordedChunks = [];
let tabStream = null;
let micStream = null;
let audioContext = null;
let audioElement = null;
let mixedStream = null;

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
        
        // Get the tab audio stream
        const tabConstraints = {
            audio: {
                mandatory: {
                    chromeMediaSource: 'tab',
                    chromeMediaSourceId: streamId
                }
            }
        };
        
        tabStream = await navigator.mediaDevices.getUserMedia(tabConstraints);
        console.log('Got tab audio stream');
        
        // Get microphone stream
        try {
            micStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            console.log('Got microphone stream');
        } catch (micError) {
            console.warn('Could not get microphone:', micError);
            console.log('Recording will continue with tab audio only');
        }
        
        // Create AudioContext to mix streams
        audioContext = new AudioContext();
        const destination = audioContext.createMediaStreamDestination();
        
        // Connect tab audio
        const tabSource = audioContext.createMediaStreamSource(tabStream);
        tabSource.connect(destination);
        console.log('Tab audio connected to mixer');
        
        // Connect microphone if available
        if (micStream) {
            const micSource = audioContext.createMediaStreamSource(micStream);
            micSource.connect(destination);
            console.log('Microphone connected to mixer');
        }
        
        // Use mixed stream for recording
        mixedStream = destination.stream;
        
        // Play tab audio through speakers (so you can hear others)
        audioElement = document.getElementById('audioPlayback');
        if (!audioElement) {
            audioElement = new Audio();
            audioElement.autoplay = true;
        }
        audioElement.srcObject = tabStream; // Only play tab audio, not your own mic
        
        try {
            await audioElement.play();
            console.log('Audio playback started - you should hear the tab audio');
        } catch (err) {
            console.warn('Could not start audio playback:', err);
            audioElement.play().catch(e => console.error('Playback failed:', e));
        }
        
        // Setup MediaRecorder with mixed stream
        const options = {
            mimeType: 'audio/webm;codecs=opus'
        };
        
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options.mimeType = 'audio/webm';
        }
        
        mediaRecorder = new MediaRecorder(mixedStream, options);
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
        console.log('Recording started - capturing tab audio + microphone');
        
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
        
        // Stop audio playback
        if (audioElement) {
            try {
                audioElement.pause();
                audioElement.srcObject = null;
                console.log('Audio playback stopped');
            } catch (e) {
                console.warn('Error stopping audio playback:', e);
            }
            audioElement = null;
        }
        
        // Close audio context
        if (audioContext) {
            try {
                await audioContext.close();
                console.log('AudioContext closed');
            } catch (e) {
                console.warn('Error closing AudioContext:', e);
            }
            audioContext = null;
        }
        
        // Stop all streams
        if (tabStream) {
            tabStream.getTracks().forEach(track => {
                try {
                    track.stop();
                } catch (e) {
                    console.warn('Error stopping tab track:', e);
                }
            });
            console.log('Tab stream stopped');
            tabStream = null;
        }
        
        if (micStream) {
            micStream.getTracks().forEach(track => {
                try {
                    track.stop();
                } catch (e) {
                    console.warn('Error stopping mic track:', e);
                }
            });
            console.log('Mic stream stopped');
            micStream = null;
        }
        
        if (mixedStream) {
            mixedStream.getTracks().forEach(track => {
                try {
                    track.stop();
                } catch (e) {
                    console.warn('Error stopping mixed track:', e);
                }
            });
            console.log('Mixed stream stopped');
            mixedStream = null;
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
        if (audioElement) {
            try { 
                audioElement.pause();
                audioElement.srcObject = null;
            } catch (e) {}
            audioElement = null;
        }
        if (audioContext) {
            try { await audioContext.close(); } catch (e) {}
            audioContext = null;
        }
        if (tabStream) {
            tabStream.getTracks().forEach(track => {
                try { track.stop(); } catch (e) {}
            });
            tabStream = null;
        }
        if (micStream) {
            micStream.getTracks().forEach(track => {
                try { track.stop(); } catch (e) {}
            });
            micStream = null;
        }
        if (mixedStream) {
            mixedStream.getTracks().forEach(track => {
                try { track.stop(); } catch (e) {}
            });
            mixedStream = null;
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
