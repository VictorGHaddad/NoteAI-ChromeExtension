// Background script for Audio Transcriber Extension (Manifest v3)
console.log('Audio Transcriber background script loaded');

// Global state for background recording
let recordingState = {
    isRecording: false,
    startTime: null,
    tabId: null
};

let offscreenDocumentCreated = false;

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

// Create offscreen document if needed
async function setupOffscreenDocument() {
    if (offscreenDocumentCreated) {
        return;
    }
    
    try {
        // Check if offscreen document already exists
        const existingContexts = await chrome.runtime.getContexts({
            contextTypes: ['OFFSCREEN_DOCUMENT']
        });
        
        if (existingContexts.length > 0) {
            console.log('Offscreen document already exists');
            offscreenDocumentCreated = true;
            return;
        }
        
        // Create offscreen document
        await chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: ['USER_MEDIA'],
            justification: 'Recording audio from tab for transcription'
        });
        
        offscreenDocumentCreated = true;
        console.log('Offscreen document created');
        
    } catch (error) {
        console.error('Error setting up offscreen document:', error);
        throw error;
    }
}

// Message handler for recording control
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request.action || 'no action');
    
    if (request.action === 'startBackgroundRecording') {
        handleStartRecording(request.tabId)
            .then(result => sendResponse({ success: true, ...result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
    }
    
    if (request.action === 'stopBackgroundRecording') {
        handleStopRecording()
            .then(result => sendResponse({ success: true, ...result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true;
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

async function handleStartRecording(tabId) {
    try {
        console.log('Starting background recording for tab:', tabId);
        
        // Setup offscreen document
        await setupOffscreenDocument();
        
        // Get stream ID
        const streamId = await new Promise((resolve, reject) => {
            chrome.tabCapture.getMediaStreamId({ 
                targetTabId: tabId 
            }, (streamId) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else if (!streamId) {
                    reject(new Error('Failed to get stream ID'));
                } else {
                    resolve(streamId);
                }
            });
        });
        
        console.log('Got stream ID:', streamId);
        
        // Send to offscreen document to start recording
        const response = await chrome.runtime.sendMessage({
            action: 'startRecording',
            streamId: streamId
        });
        
        if (!response || !response.success) {
            throw new Error(response?.error || 'Failed to start recording in offscreen document');
        }
        
        // Update state
        recordingState.isRecording = true;
        recordingState.startTime = Date.now();
        recordingState.tabId = tabId;
        
        await chrome.storage.local.set({
            recordingState: {
                isRecording: true,
                startTime: recordingState.startTime
            }
        });
        
        console.log('Recording started successfully');
        return { message: 'Recording started in background' };
        
    } catch (error) {
        console.error('Error starting recording:', error);
        throw error;
    }
}

async function handleStopRecording() {
    try {
        console.log('Stopping background recording');
        
        if (!recordingState.isRecording) {
            throw new Error('No recording in progress');
        }
        
        // Send message to offscreen to stop recording
        const response = await chrome.runtime.sendMessage({
            action: 'stopRecording'
        });
        
        if (!response || !response.success) {
            throw new Error(response?.error || 'Failed to stop recording');
        }
        
        // Update state
        recordingState.isRecording = false;
        recordingState.startTime = null;
        recordingState.tabId = null;
        
        await chrome.storage.local.set({
            recordingState: { isRecording: false }
        });
        
        console.log('Recording stopped successfully');
        return {
            message: 'Recording stopped',
            size: response.size,
            chunks: response.chunks
        };
        
    } catch (error) {
        console.error('Error stopping recording:', error);
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