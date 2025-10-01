// Background script for Audio Transcriber Extension (Manifest v3)
console.log('Audio Transcriber background script loaded');

// Extension installation handler
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Audio Transcriber Extension installed/updated:', details.reason);
    
    if (details.reason === 'install') {
        console.log('Setting up default configuration...');
    }
});

// Simple message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request.action || 'no action');
    
    // Simple response for any message
    sendResponse({ success: true, message: 'Background script is working' });
    
    return false; // Don't keep the message channel open
});

console.log('Background script initialization complete');