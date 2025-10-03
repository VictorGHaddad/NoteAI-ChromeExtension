// Background script for Audio Transcriber Extension (Manifest v3)
console.log('Audio Transcriber background script loaded');

// Global state for background recording
let recordingState = {
    isRecording: false,
    startTime: null,
    tabId: null
};

let offscreenDocumentCreated = false;

// Restore state from storage on startup
async function restoreState() {
    try {
        const stored = await chrome.storage.local.get(['recordingState']);
        if (stored.recordingState) {
            recordingState.isRecording = stored.recordingState.isRecording || false;
            recordingState.startTime = stored.recordingState.startTime || null;
            recordingState.tabId = stored.recordingState.tabId || null;
            console.log('State restored from storage:', JSON.stringify(recordingState));
        }
    } catch (error) {
        console.error('Error restoring state:', error);
    }
}

// Restore state on startup
restoreState();

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
        console.log('=== START RECORDING REQUEST ===');
        console.log('Tab ID:', tabId);
        console.log('Current state before start:', JSON.stringify(recordingState));
        
        // Check if already recording
        if (recordingState.isRecording) {
            console.warn('⚠️ Already recording! Tab:', recordingState.tabId);
            if (recordingState.tabId === tabId) {
                return { 
                    message: 'Already recording this tab',
                    alreadyRecording: true 
                };
            } else {
                throw new Error('Already recording another tab. Stop that recording first.');
            }
        }
        
        // Setup offscreen document
        await setupOffscreenDocument();
        console.log('Offscreen document ready');
        
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
        
        console.log('Offscreen response:', response);
        
        if (!response || !response.success) {
            throw new Error(response?.error || 'Failed to start recording in offscreen document');
        }
        
        // Update state
        recordingState.isRecording = true;
        recordingState.startTime = Date.now();
        recordingState.tabId = tabId;
        
        console.log('Updated recording state:', JSON.stringify(recordingState));
        
        await chrome.storage.local.set({
            recordingState: {
                isRecording: true,
                startTime: recordingState.startTime,
                tabId: tabId
            }
        });
        
        console.log('State saved to storage');
        console.log('=== RECORDING STARTED SUCCESSFULLY ===');
        
        return { message: 'Recording started in background' };
        
    } catch (error) {
        console.error('=== ERROR STARTING RECORDING ===');
        console.error('Error:', error);
        throw error;
    }
}

async function handleStopRecording() {
    try {
        console.log('=== STOP RECORDING REQUEST ===');
        console.log('Current state before stop:', JSON.stringify(recordingState));
        
        if (!recordingState.isRecording) {
            console.warn('⚠️ No recording in progress!');
            console.log('State shows not recording - returning warning');
            return {
                message: 'No recording in progress',
                size: 0,
                chunks: 0,
                warning: 'No active recording'
            };
        }
        
        console.log('Sending stop message to offscreen document...');
        
        // Send message to offscreen to stop recording
        const response = await chrome.runtime.sendMessage({
            action: 'stopRecording'
        });
        
        console.log('Offscreen stop response:', response);
        
        if (!response || !response.success) {
            throw new Error(response?.error || 'Failed to stop recording');
        }
        
        // Save audio data to storage if we got it
        if (response.audio && response.size > 0) {
            console.log('Saving recording to storage, size:', response.size);
            await chrome.storage.local.set({
                lastRecording: {
                    audio: response.audio,
                    timestamp: response.timestamp || Date.now(),
                    size: response.size,
                    chunks: response.chunks
                }
            });
            console.log('✅ Recording saved to storage successfully');
        } else {
            console.warn('⚠️ No audio data received from offscreen document');
        }
        
        // Update state
        recordingState.isRecording = false;
        recordingState.startTime = null;
        recordingState.tabId = null;
        
        console.log('Updated recording state:', JSON.stringify(recordingState));
        
        await chrome.storage.local.set({
            recordingState: { isRecording: false }
        });
        
        console.log('State saved to storage');
        console.log('=== RECORDING STOPPED SUCCESSFULLY ===');
        
        return {
            message: 'Recording stopped',
            size: response.size,
            chunks: response.chunks,
            warning: response.warning
        };
        
    } catch (error) {
        console.error('=== ERROR STOPPING RECORDING ===');
        console.error('Error:', error);
        
        // Reset state even on error
        recordingState.isRecording = false;
        recordingState.startTime = null;
        recordingState.tabId = null;
        
        await chrome.storage.local.set({
            recordingState: { isRecording: false }
        });
        
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