class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.stream = null;
        this.startTime = null;
        this.timerInterval = null;
        this.recordedBlob = null;
        
        this.API_BASE_URL = CONFIG.API_BASE_URL;
        
        this.initializeElements();
        this.attachEventListeners();
        this.checkRecordingState();
    }

    initializeElements() {
        this.recordBtn = document.getElementById('recordBtn');
        this.recordIcon = document.getElementById('recordIcon');
        this.recordText = document.getElementById('recordText');
        this.timer = document.getElementById('timer');
        this.audioPreview = document.getElementById('audioPreview');
        this.audioPlayer = document.getElementById('audioPlayer');
        this.status = document.getElementById('status');
        this.statusTitle = document.getElementById('statusTitle');
        this.statusContent = document.getElementById('statusContent');
        this.actions = document.getElementById('actions');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.clearBtn = document.getElementById('clearBtn');
        this.messages = document.getElementById('messages');
        this.recordingIndicator = document.getElementById('recordingIndicator');
        this.progressBar = document.getElementById('progressBar');
        this.progressFill = document.getElementById('progressFill');
        this.loadLastBtn = document.getElementById('loadLastBtn');
    }

    attachEventListeners() {
        this.recordBtn.addEventListener('click', () => this.toggleRecording());
        this.uploadBtn.addEventListener('click', () => this.uploadAudio());
        this.clearBtn.addEventListener('click', () => this.clearRecording());
    }

    async checkRecordingState() {
        try {
            console.log('🔍 Checking recording state...');
            
            // Check if chrome runtime is available
            if (!chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
                console.warn('Chrome runtime API not available');
                this.updateStatus('🎙️ Pronto para gravar áudio da aba\n\n💡 A gravação capturará o áudio da reunião/página\n✅ Grava em background\n✅ Áudio continua tocando normalmente');
                return;
            }
            
            // Check if there's a recording in progress
            const response = await chrome.runtime.sendMessage({ action: 'getRecordingState' });
            console.log('📡 Recording state response:', response);
            
            if (response && response.success && response.isRecording) {
                console.log('✅ Recording in progress detected!');
                console.log('Start time from response:', response.startTime);
                console.log('Start time as Date:', new Date(response.startTime));
                
                this.isRecording = true;
                this.startTime = response.startTime;
                
                console.log('Setting UI to recording state...');
                this.updateRecordingUI();
                this.startTimer();
                
                const elapsed = Date.now() - this.startTime;
                const seconds = Math.floor(elapsed / 1000);
                console.log(`⏱️ Recording for ${seconds} seconds`);
                
                this.updateStatus('🎙️ Gravação em andamento\n\n✅ Rodando em background\n✅ Você pode fechar este popup');
            } else {
                console.log('ℹ️ No active recording');
                this.updateStatus('🎙️ Pronto para gravar áudio da aba\n\n💡 A gravação capturará o áudio da reunião/página\n✅ Grava em background\n✅ Áudio continua tocando normalmente');
            }
            
            // Check if there's a saved recording
            if (chrome.storage && chrome.storage.local) {
                const storage = await chrome.storage.local.get(['lastRecording']);
                if (storage.lastRecording && !this.isRecording) {
                    this.showSuccess('Há uma gravação salva! Clique em "Carregar Gravação" para transcrever.');
                    await this.loadLastRecording();
                }
            }
        } catch (error) {
            console.error('❌ Error checking recording state:', error);
            this.updateStatus('🎙️ Pronto para gravar áudio da aba');
        }
    }

    async toggleRecording() {
        if (this.isRecording) {
            await this.stopRecording();
        } else {
            await this.startRecording();
        }
    }

    async startRecording() {
        try {
            this.clearMessages();
            this.updateStatus('Preparando gravação...');
            
            // Get current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab || !tab.id) {
                throw new Error('Não foi possível identificar a aba ativa');
            }
            
            this.updateStatus('Iniciando gravação em background...');
            
            // Start background recording
            const response = await chrome.runtime.sendMessage({
                action: 'startBackgroundRecording',
                tabId: tab.id
            });
            
            if (!response || !response.success) {
                throw new Error(response?.error || 'Falha ao iniciar gravação');
            }
            
            // Check if already recording
            if (response.alreadyRecording) {
                console.log('Already recording - updating UI state');
                this.isRecording = true;
                // Try to get the start time from storage
                const state = await chrome.runtime.sendMessage({ action: 'getRecordingState' });
                if (state && state.startTime) {
                    this.startTime = state.startTime;
                } else {
                    this.startTime = Date.now();
                }
                this.updateRecordingUI();
                this.startTimer();
                this.updateStatus('🎙️ Gravando áudio da aba\n\n✅ Rodando em background\n✅ Áudio tocando normalmente\n✅ Pode fechar o popup\n\n💡 Reabra para parar a gravação');
                this.showSuccess('Gravação já em andamento!');
                return;
            }
            
            this.isRecording = true;
            this.startTime = Date.now();
            
            this.updateRecordingUI();
            this.startTimer();
            this.updateStatus('🎙️ Gravando áudio da aba\n\n✅ Rodando em background\n✅ Áudio tocando normalmente\n✅ Pode fechar o popup\n\n💡 Reabra para parar a gravação');
            this.showSuccess('Gravação iniciada em background!');

        } catch (error) {
            console.error('Error starting recording:', error);
            
            let errorMessage = 'Erro ao iniciar gravação';
            
            if (error.message.includes('stream ID')) {
                errorMessage = '❌ Não foi possível capturar áudio.\n\n💡 Certifique-se de que:\n• A aba está ativa\n• A página está reproduzindo áudio\n• Não é uma página protegida (chrome://, etc.)';
            } else {
                errorMessage = `Erro: ${error.message}`;
            }
            
            this.showError(errorMessage);
            this.updateStatus('Erro ao iniciar gravação');
        }
    }

    async stopRecording() {
        try {
            this.updateStatus('Parando gravação...');
            this.recordBtn.disabled = true;
            
            // Stop background recording
            const response = await chrome.runtime.sendMessage({
                action: 'stopBackgroundRecording'
            });
            
            // Always reset UI state first
            this.isRecording = false;
            this.stopTimer();
            this.recordBtn.disabled = false;
            
            // Check response
            if (!response || !response.success) {
                // If there's a warning (like no active recording), show info instead of error
                if (response?.warning) {
                    this.showError(`Aviso: ${response.warning}`);
                    this.resetRecordingUI();
                    return;
                }
                throw new Error(response?.error || 'Falha ao parar gravação');
            }
            
            this.resetRecordingUI();
            
            // Load the saved recording
            await this.loadLastRecording();
            
            const sizeKB = response.size ? (response.size / 1024).toFixed(2) : '0';
            
            if (response.warning) {
                this.showError(`Gravação parada. Aviso: ${response.warning}`);
            } else if (response.size > 0) {
                this.showSuccess(`Gravação concluída! ${sizeKB} KB`);
            } else {
                this.showError('Gravação parada, mas nenhum áudio foi capturado');
            }

        } catch (error) {
            console.error('Error stopping recording:', error);
            // Always ensure UI is reset
            this.isRecording = false;
            this.stopTimer();
            this.recordBtn.disabled = false;
            this.resetRecordingUI();
            this.showError(`Erro ao parar gravação: ${error.message}`);
        }
    }

    async loadLastRecording() {
        try {
            // Check if chrome.storage is available
            if (!chrome || !chrome.storage || !chrome.storage.local) {
                console.warn('Chrome storage API not available');
                return;
            }
            
            const storage = await chrome.storage.local.get(['lastRecording']);
            
            if (!storage.lastRecording || !storage.lastRecording.audio) {
                console.log('No recording found in storage');
                return;
            }
            
            // Convert base64 to blob
            const response = await fetch(storage.lastRecording.audio);
            const blob = await response.blob();
            
            // Create audio URL
            const audioUrl = URL.createObjectURL(blob);
            this.audioPlayer.src = audioUrl;
            
            // Store blob
            this.recordedBlob = blob;
            
            // Show preview and actions
            this.audioPreview.classList.remove('hidden');
            this.actions.classList.remove('hidden');
            
            const sizeKB = (storage.lastRecording.size / 1024).toFixed(2);
            this.updateStatus(`Gravação pronta!\nTamanho: ${sizeKB} KB\n\nOuça a prévia e clique em "Transcrever"`);

        } catch (error) {
            console.error('Error loading recording:', error);
            // Don't show error to user, just log it
        }
    }

    async uploadAudio() {
        if (!this.recordedBlob) {
            this.showError('Nenhum áudio para enviar. Grave um áudio primeiro.');
            return;
        }

        try {
            this.uploadBtn.disabled = true;
            this.updateStatus('Enviando áudio para transcrição...');
            this.showProgress(0);

            // Create form data
            const formData = new FormData();
            const filename = `recording_${Date.now()}.webm`;
            formData.append('file', this.recordedBlob, filename);

            // Upload to API
            const response = await fetch(`${this.API_BASE_URL}/audio/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `HTTP ${response.status}`);
            }

            const result = await response.json();
            
            this.showProgress(100);
            this.updateStatus('Transcrição concluída!');
            this.showTranscriptionResult(result);
            
            // Clear the saved recording
            await chrome.storage.local.remove(['lastRecording']);

        } catch (error) {
            console.error('Error uploading audio:', error);
            this.showError(`Erro ao enviar áudio: ${error.message}`);
        } finally {
            this.uploadBtn.disabled = false;
            this.hideProgress();
        }
    }

    clearRecording() {
        // Reset all recording data
        this.recordedBlob = null;
        
        // Hide UI elements
        this.audioPreview.classList.add('hidden');
        this.actions.classList.add('hidden');
        this.status.classList.add('hidden');
        
        // Clear messages
        this.clearMessages();
        
        // Reset timer
        this.timer.textContent = '';
        
        // Reset audio player
        this.audioPlayer.src = '';
        
        // Clear storage
        chrome.storage.local.remove(['lastRecording']);
        
        this.showSuccess('Gravação limpa');
        this.updateStatus('🎙️ Pronto para nova gravação');
    }

    updateRecordingUI() {
        this.recordBtn.className = 'record-button stop';
        this.recordIcon.textContent = '⏹';
        this.recordText.textContent = 'Parar Gravação';
        this.recordingIndicator.classList.remove('hidden');
    }

    resetRecordingUI() {
        this.recordBtn.className = 'record-button start';
        this.recordIcon.textContent = '⚫';
        this.recordText.textContent = 'Iniciar Gravação';
        this.recordingIndicator.classList.add('hidden');
    }

    startTimer() {
        console.log('🕐 Starting timer with startTime:', this.startTime, new Date(this.startTime));
        
        // Clear any existing timer
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        // Update immediately
        const updateTimer = () => {
            const elapsed = Date.now() - this.startTime;
            const seconds = Math.floor(elapsed / 1000);
            const minutes = Math.floor(seconds / 60);
            const displaySeconds = seconds % 60;
            
            const timeString = `${minutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(2, '0')}`;
            this.timer.textContent = timeString;
            console.log('⏱️ Timer update:', timeString);
        };
        
        // Update now
        updateTimer();
        
        // Then update every second
        this.timerInterval = setInterval(updateTimer, 1000);
        console.log('✅ Timer started');
    }

    stopTimer() {
        console.log('🛑 Stopping timer');
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
            console.log('✅ Timer stopped');
        } else {
            console.log('⚠️ No timer to stop');
        }
    }

    updateStatus(message) {
        this.status.classList.remove('hidden');
        this.statusTitle.textContent = 'Status';
        this.statusContent.textContent = message;
    }

    showTranscriptionResult(result) {
        const resultHTML = `
            <div class="status">
                <h3>✅ Transcrição Concluída</h3>
                <div class="status-content">
                    <p><strong>Arquivo:</strong> ${result.filename}</p>
                    ${result.duration ? `<p><strong>Duração:</strong> ${result.duration.toFixed(1)}s</p>` : ''}
                    ${result.language ? `<p><strong>Idioma:</strong> ${result.language}</p>` : ''}
                    <p><strong>Texto:</strong></p>
                    <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 6px; margin: 5px 0; max-height: 100px; overflow-y: auto; font-size: 11px; line-height: 1.3;">
                        ${result.text}
                    </div>
                    <p><strong>Resumo:</strong></p>
                    <div style="background: rgba(255,255,255,0.1); padding: 10px; border-radius: 6px; margin: 5px 0; max-height: 80px; overflow-y: auto; font-size: 11px; line-height: 1.3;">
                        ${result.summary}
                    </div>
                </div>
            </div>
        `;
        
        this.status.innerHTML = resultHTML;
        this.showSuccess('✅ Transcrição salva! Veja no dashboard');
    }

    showProgress(percentage) {
        this.progressBar.classList.remove('hidden');
        this.progressFill.style.width = `${percentage}%`;
    }

    hideProgress() {
        this.progressBar.classList.add('hidden');
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.style.whiteSpace = 'pre-line';
        errorDiv.textContent = message;
        this.messages.appendChild(errorDiv);
        
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 7000);
    }

    showSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'success';
        successDiv.textContent = message;
        this.messages.appendChild(successDiv);
        
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 4000);
    }

    clearMessages() {
        this.messages.innerHTML = '';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AudioRecorder();
});
