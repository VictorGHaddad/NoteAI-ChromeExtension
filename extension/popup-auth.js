// Meeting AI by P&D - Popup Script with Authentication

// State management
let isRecording = false;
let recordingStartTime = null;
let timerInterval = null;
let mediaRecorder = null;
let audioChunks = [];
let recordedBlob = null;
let authToken = null;
let currentUser = null;

// DOM Elements
const authScreen = document.getElementById('authScreen');
const mainScreen = document.getElementById('mainScreen');
const headerActions = document.getElementById('headerActions');
const userInfo = document.getElementById('userInfo');

// Auth tabs and forms
const loginTab = document.getElementById('loginTab');
const registerTab = document.getElementById('registerTab');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authMessages = document.getElementById('authMessages');

// Recording elements
const recordBtn = document.getElementById('recordBtn');
const recordIcon = document.getElementById('recordIcon');
const recordText = document.getElementById('recordText');
const timer = document.getElementById('timer');
const recordingIndicator = document.getElementById('recordingIndicator');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const audioPreview = document.getElementById('audioPreview');
const audioPlayer = document.getElementById('audioPlayer');
const status = document.getElementById('status');
const statusTitle = document.getElementById('statusTitle');
const statusContent = document.getElementById('statusContent');
const actions = document.getElementById('actions');
const uploadBtn = document.getElementById('uploadBtn');
const downloadBtn = document.getElementById('downloadBtn');
const clearBtn = document.getElementById('clearBtn');
const messages = document.getElementById('messages');
const logoutBtn = document.getElementById('logoutBtn');

// Initialize
init();

async function init() {
    // Check if user is logged in
    const token = await getStoredToken();
    if (token) {
        authToken = token;
        try {
            await loadUserProfile();
            showMainScreen();
        } catch (error) {
            console.error('Error loading user profile:', error);
            showAuthScreen();
        }
    } else {
        showAuthScreen();
    }

    setupEventListeners();
}

function setupEventListeners() {
    // Auth tabs
    loginTab.addEventListener('click', () => switchAuthTab('login'));
    registerTab.addEventListener('click', () => switchAuthTab('register'));

    // Auth forms
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);

    // Logout
    logoutBtn.addEventListener('click', handleLogout);

    // Recording
    recordBtn.addEventListener('click', toggleRecording);
    uploadBtn.addEventListener('click', uploadAudio);
    downloadBtn.addEventListener('click', downloadAudio);
    clearBtn.addEventListener('click', clearRecording);
}

// ========== Authentication Functions ==========

function switchAuthTab(tab) {
    if (tab === 'login') {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.add('active');
        registerForm.classList.remove('active');
    } else {
        loginTab.classList.remove('active');
        registerTab.classList.add('active');
        loginForm.classList.remove('active');
        registerForm.classList.add('active');
    }
    clearAuthMessages();
}

async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const submitBtn = document.getElementById('loginSubmit');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Entrando...';
    clearAuthMessages();

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Erro ao fazer login');
        }

        // Store token
        authToken = data.access_token;
        await chrome.storage.local.set({ authToken: data.access_token });

        // Load user profile
        await loadUserProfile();

        showAuthMessage('Login realizado com sucesso!', 'success');
        setTimeout(() => {
            showMainScreen();
        }, 1000);

    } catch (error) {
        console.error('Login error:', error);
        showAuthMessage(error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Entrar';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const submitBtn = document.getElementById('registerSubmit');

    if (password.length < 8) {
        showAuthMessage('A senha deve ter pelo menos 8 caracteres', 'error');
        return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Criando...';
    clearAuthMessages();

    try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.detail || 'Erro ao criar conta');
        }

        showAuthMessage('Conta criada com sucesso! Faça login.', 'success');
        
        // Switch to login tab
        setTimeout(() => {
            switchAuthTab('login');
            document.getElementById('loginEmail').value = email;
        }, 1500);

    } catch (error) {
        console.error('Register error:', error);
        showAuthMessage(error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Criar Conta';
    }
}

async function loadUserProfile() {
    const response = await fetch(`${CONFIG.API_BASE_URL}/auth/me`, {
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    });

    if (!response.ok) {
        throw new Error('Falha ao carregar perfil');
    }

    currentUser = await response.json();
    updateUserInfo();
}

function updateUserInfo() {
    if (currentUser) {
        userInfo.textContent = currentUser.email;
        headerActions.classList.remove('hidden');
    }
}

async function handleLogout() {
    await chrome.storage.local.remove(['authToken']);
    authToken = null;
    currentUser = null;
    showAuthScreen();
}

function showAuthScreen() {
    authScreen.classList.add('active');
    mainScreen.classList.remove('active');
    headerActions.classList.add('hidden');
}

function showMainScreen() {
    authScreen.classList.remove('active');
    mainScreen.classList.add('active');
    updateUserInfo();
}

function showAuthMessage(message, type = 'info') {
    authMessages.innerHTML = `<div class="message ${type}">${message}</div>`;
}

function clearAuthMessages() {
    authMessages.innerHTML = '';
}

async function getStoredToken() {
    const result = await chrome.storage.local.get(['authToken']);
    return result.authToken || null;
}

// ========== Recording Functions ==========

async function toggleRecording() {
    if (!isRecording) {
        await startRecording();
    } else {
        await stopRecording();
    }
}

async function startRecording() {
    try {
        // Request tab capture
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        // Send message to background script to start recording
        const response = await chrome.runtime.sendMessage({
            action: 'startRecording',
            tabId: tab.id
        });

        if (response.success) {
            isRecording = true;
            recordingStartTime = Date.now();
            
            // Update UI
            recordBtn.classList.remove('start');
            recordBtn.classList.add('stop');
            recordIcon.textContent = '⏹';
            recordText.textContent = 'Parar Gravação';
            
            timer.classList.add('active');
            recordingIndicator.classList.add('active');
            
            // Start timer
            startTimer();
            
            showMessage('Gravação iniciada! Você pode fechar este popup.', 'success');
        } else {
            throw new Error(response.error || 'Erro ao iniciar gravação');
        }
    } catch (error) {
        console.error('Start recording error:', error);
        showMessage('Erro ao iniciar gravação: ' + error.message, 'error');
    }
}

async function stopRecording() {
    try {
        // Send message to background script to stop recording
        const response = await chrome.runtime.sendMessage({
            action: 'stopRecording'
        });

        if (response.success && response.audioData) {
            isRecording = false;
            
            // Stop timer
            clearInterval(timerInterval);
            
            // Update UI
            recordBtn.classList.remove('stop');
            recordBtn.classList.add('start');
            recordIcon.textContent = '⚫';
            recordText.textContent = 'Iniciar Gravação';
            
            recordingIndicator.classList.remove('active');
            
            // Create blob from audio data
            const uint8Array = new Uint8Array(response.audioData);
            recordedBlob = new Blob([uint8Array], { type: 'audio/webm' });
            
            // Show audio preview
            const audioUrl = URL.createObjectURL(recordedBlob);
            audioPlayer.src = audioUrl;
            audioPreview.classList.add('active');
            actions.classList.add('active');
            
            showMessage('Gravação concluída! Clique em "Transcrever" para enviar.', 'success');
        } else {
            throw new Error(response.error || 'Erro ao parar gravação');
        }
    } catch (error) {
        console.error('Stop recording error:', error);
        showMessage('Erro ao parar gravação: ' + error.message, 'error');
    }
}

function startTimer() {
    timerInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        timer.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }, 1000);
}

async function uploadAudio() {
    if (!recordedBlob) {
        showMessage('Nenhum áudio gravado', 'error');
        return;
    }

    if (!authToken) {
        showMessage('Você precisa estar logado para enviar', 'error');
        return;
    }

    uploadBtn.disabled = true;
    uploadBtn.textContent = 'Enviando...';
    
    progressBar.classList.add('active');
    status.classList.add('active');
    statusTitle.textContent = 'Enviando...';
    statusContent.textContent = 'Preparando arquivo de áudio...';

    try {
        // Create form data
        const formData = new FormData();
        const filename = `recording_${Date.now()}.webm`;
        formData.append('file', recordedBlob, filename);

        // Upload with progress tracking
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                progressFill.style.width = percentComplete + '%';
                statusContent.textContent = `Enviando: ${Math.round(percentComplete)}%`;
            }
        });

        const uploadPromise = new Promise((resolve, reject) => {
            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject(new Error(xhr.responseText || 'Erro no upload'));
                }
            };
            xhr.onerror = () => reject(new Error('Erro de rede'));
        });

        xhr.open('POST', `${CONFIG.API_BASE_URL}/audio/upload`);
        xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
        xhr.send(formData);

        statusContent.textContent = 'Transcrevendo áudio...';
        const result = await uploadPromise;

        statusTitle.textContent = 'Sucesso!';
        statusContent.textContent = 'Transcrição concluída! Veja no dashboard.';
        progressFill.style.width = '100%';
        
        showMessage('Transcrição enviada com sucesso!', 'success');
        
        // Clear after delay
        setTimeout(() => {
            clearRecording();
        }, 3000);

    } catch (error) {
        console.error('Upload error:', error);
        statusTitle.textContent = 'Erro';
        statusContent.textContent = error.message;
        showMessage('Erro ao enviar: ' + error.message, 'error');
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Transcrever';
    }
}

function downloadAudio() {
    if (!recordedBlob) {
        showMessage('Nenhum áudio gravado', 'error');
        return;
    }

    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `recording_${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
    
    showMessage('Áudio exportado!', 'success');
}

function clearRecording() {
    recordedBlob = null;
    audioPlayer.src = '';
    audioPreview.classList.remove('active');
    actions.classList.remove('active');
    status.classList.remove('active');
    progressBar.classList.remove('active');
    progressFill.style.width = '0%';
    timer.textContent = '';
    timer.classList.remove('active');
    messages.innerHTML = '';
}

function showMessage(message, type = 'info') {
    messages.innerHTML = `<div class="message ${type}">${message}</div>`;
    setTimeout(() => {
        messages.innerHTML = '';
    }, 5000);
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'recordingStopped') {
        if (request.audioData) {
            const uint8Array = new Uint8Array(request.audioData);
            recordedBlob = new Blob([uint8Array], { type: 'audio/webm' });
            
            isRecording = false;
            clearInterval(timerInterval);
            
            // Update UI
            recordBtn.classList.remove('stop');
            recordBtn.classList.add('start');
            recordIcon.textContent = '⚫';
            recordText.textContent = 'Iniciar Gravação';
            recordingIndicator.classList.remove('active');
            
            const audioUrl = URL.createObjectURL(recordedBlob);
            audioPlayer.src = audioUrl;
            audioPreview.classList.add('active');
            actions.classList.add('active');
            
            showMessage('Gravação concluída!', 'success');
        }
    }
});