// Background script for Audio Transcriber Extension (Manifest v3)
console.log('Audio Transcriber background script loaded');

// Global state for background recording
let recordingState = {
    isRecording: false,
    mediaRecorder: null,
    recordedChunks: [],
    startTime: null,
    tabId: null,
    stream: null
};

// Extension installation handler
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Audio Transcriber Extension installed/updated:', details.reason);
    
    if (details.reason === 'install') {
        console.log('Setting up default configuration...');
        chrome.storage.local.set({ 
            recordingState: { isRecording: false }
        });
    }
});

// Message handler for recording control
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request.action || 'no action');
    
    if (request.action === 'startBackgroundRecording') {
        // Get stream ID and return it to popup
        chrome.tabCapture.getMediaStreamId({ 
            targetTabId: request.tabId 
        }, (streamId) => {
            if (chrome.runtime.lastError) {
                console.error('tabCapture error:', chrome.runtime.lastError);
                sendResponse({ success: false, error: chrome.runtime.lastError.message });
            } else if (!streamId) {
                sendResponse({ success: false, error: 'Failed to get stream ID - tab may not support audio capture' });
            } else {
                console.log('Got stream ID:', streamId);
                sendResponse({ success: true, streamId: streamId });
            }
        });
        return true; // Keep channel open for async response
    }
    
    if (request.action === 'stopBackgroundRecording') {
        stopBackgroundRecording()
            .then(result => sendResponse({ success: true, ...result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
    
    if (request.action === 'saveRecordingChunk') {
        // Store chunks sent from popup
        if (!recordingState.recordedChunks) {
            recordingState.recordedChunks = [];
        }
        recordingState.recordedChunks.push(request.chunk);
        sendResponse({ success: true });
        return false;
    }
    
    if (request.action === 'getRecordingState') {
        sendResponse({ 
            success: true, 
            isRecording: recordingState.isRecording,
            startTime: recordingState.startTime
        });
        return false;
    }
    
    // Simple response for other messages
    sendResponse({ success: true, message: 'Background script is working' });
    return false;
});

async function stopBackgroundRecording() {
    try {
        console.log('Stopping background recording');
        
        if (!recordingState.isRecording) {
            throw new Error('No recording in progress');
        }
        
        // Get the recorded chunks from storage
        const result = await chrome.storage.local.get(['recordingChunks']);
        const chunks = result.recordingChunks || [];
        
        console.log('Retrieved chunks:', chunks.length);
        
        // Update storage to mark as not recording
        await chrome.storage.local.set({
            recordingState: { isRecording: false }
        });
        
        // Reset state
        recordingState.isRecording = false;
        recordingState.mediaRecorder = null;
        recordingState.recordedChunks = [];
        recordingState.startTime = null;
        recordingState.tabId = null;
        recordingState.stream = null;
        
        return { 
            message: 'Recording stopped',
            chunks: chunks.length
        };
        
    } catch (error) {
        console.error('Error stopping background recording:', error);
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

console.log('Background script initialization complete');