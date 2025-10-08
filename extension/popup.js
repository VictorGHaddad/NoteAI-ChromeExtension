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
        this.downloadBtn = document.getElementById('downloadBtn');
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
        this.downloadBtn.addEventListener('click', () => this.downloadAudio());
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
            console.log('📂 Loading last recording from storage...');
            
            // Check if chrome.storage is available
            if (!chrome || !chrome.storage || !chrome.storage.local) {
                console.warn('❌ Chrome storage API not available');
                return;
            }
            
            const storage = await chrome.storage.local.get(['lastRecording']);
            console.log('📦 Storage data:', storage);
            
            if (!storage.lastRecording || !storage.lastRecording.audio) {
                console.log('⚠️ No recording found in storage');
                return;
            }
            
            console.log('✅ Recording found in storage, size:', storage.lastRecording.size);
            
            // Convert base64 to blob
            const response = await fetch(storage.lastRecording.audio);
            const blob = await response.blob();
            
            console.log('✅ Blob created, size:', blob.size, 'type:', blob.type);
            
            // Create audio URL
            const audioUrl = URL.createObjectURL(blob);
            this.audioPlayer.src = audioUrl;
            
            // Store blob
            this.recordedBlob = blob;
            console.log('✅ Blob stored in this.recordedBlob');
            
            // Show preview and actions
            this.audioPreview.classList.remove('hidden');
            this.actions.classList.remove('hidden');
            
            const sizeKB = (storage.lastRecording.size / 1024).toFixed(2);
            const sizeMB = (storage.lastRecording.size / (1024 * 1024)).toFixed(2);
            
            // Get cost estimate
            await this.showCostEstimate(parseFloat(sizeMB));
            
            this.updateStatus(`Gravação pronta!\nTamanho: ${sizeKB} KB\n\nOuça a prévia e clique em "Transcrever"`);
            
            console.log('✅ loadLastRecording completed successfully');

        } catch (error) {
            console.error('❌ Error loading recording:', error);
            console.error('Error details:', error.name, error.message);
            console.error('Stack:', error.stack);
            // Show error to user now
            this.showError(`Erro ao carregar gravação: ${error.message}`);
        }
    }

    async showCostEstimate(sizeMB) {
        try {
            console.log('💰 Fetching cost estimate for', sizeMB, 'MB');
            
            const response = await fetch(`${this.API_BASE_URL}/audio/estimate-cost?file_size_mb=${sizeMB}`);
            
            if (!response.ok) {
                console.warn('Could not fetch cost estimate');
                return;
            }
            
            const estimate = await response.json();
            console.log('💰 Cost estimate:', estimate);
            
            const costMessage = `
💰 Estimativa de Custo:
• Duração estimada: ~${estimate.estimated_duration_minutes} min
• Custo estimado: $${estimate.estimated_cost_usd} USD (~R$ ${estimate.estimated_cost_brl})
• Taxa: $${estimate.price_per_minute_usd}/minuto
            `.trim();
            
            this.showSuccess(costMessage);
            
        } catch (error) {
            console.error('Error fetching cost estimate:', error);
            // Don't show error to user, it's not critical
        }
    }

    async uploadAudio() {
        console.log('🚀 uploadAudio called');
        console.log('📦 this.recordedBlob:', this.recordedBlob);
        console.log('📦 Blob exists?', !!this.recordedBlob);
        
        if (!this.recordedBlob) {
            console.error('❌ No recorded blob available!');
            this.showError('Nenhum áudio para enviar. Grave um áudio primeiro.');
            return;
        }

        try {
            this.uploadBtn.disabled = true;
            this.updateStatus('Enviando áudio para transcrição...');
            this.showProgress(0);

            // Debug info
            console.log('📤 Uploading audio...');
            console.log('API URL:', this.API_BASE_URL);
            console.log('Blob size:', this.recordedBlob.size, 'bytes');
            console.log('Blob type:', this.recordedBlob.type);
            
            // Check file size (20GB = 21474836480 bytes)
            const maxSize = 21474836480; // 20GB (20000MB)
            if (this.recordedBlob.size > maxSize) {
                throw new Error(`Arquivo muito grande (${(this.recordedBlob.size / 1024 / 1024).toFixed(2)}MB). Máximo permitido: 20000MB (20GB)`);
            }

            // Create form data
            const formData = new FormData();
            const filename = `recording_${Date.now()}.webm`;
            formData.append('file', this.recordedBlob, filename);

            // Upload to API
            console.log('Making fetch request to:', `${this.API_BASE_URL}/audio/upload`);
            const response = await fetch(`${this.API_BASE_URL}/audio/upload`, {
                method: 'POST',
                body: formData
            });

            console.log('Response status:', response.status);
            console.log('Response OK:', response.ok);

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
            console.error('❌ Error uploading audio:', error);
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            
            let errorMsg = error.message;
            if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
                errorMsg = 'Não foi possível conectar ao servidor. Verifique:\n' +
                          '1. Backend está rodando (docker compose up)\n' +
                          '2. Configuração em config.js está correta\n' +
                          '3. Tamanho do áudio não excede o limite';
            }
            
            this.showError(`Erro ao enviar áudio: ${errorMsg}`);
        } finally {
            this.uploadBtn.disabled = false;
            this.hideProgress();
        }
    }

    downloadAudio() {
        console.log('💾 downloadAudio called');
        
        if (!this.recordedBlob) {
            console.error('❌ No recorded blob available for download!');
            this.showError('Nenhum áudio para exportar. Grave um áudio primeiro.');
            return;
        }

        try {
            console.log('📦 Blob size:', this.recordedBlob.size, 'bytes');
            console.log('📦 Blob type:', this.recordedBlob.type);
            
            // Create download URL
            const url = URL.createObjectURL(this.recordedBlob);
            
            // Generate filename with timestamp
            const now = new Date();
            const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const filename = `recording_${timestamp}.webm`;
            
            console.log('📁 Filename:', filename);
            
            // Create temporary anchor element
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            
            // Trigger download
            document.body.appendChild(a);
            a.click();
            
            // Cleanup
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                console.log('✅ Download triggered, cleanup complete');
            }, 100);
            
            const sizeKB = (this.recordedBlob.size / 1024).toFixed(2);
            this.showSuccess(`Áudio exportado com sucesso! (${sizeKB} KB)`);
            
        } catch (error) {
            console.error('❌ Error downloading audio:', error);
            console.error('Error details:', error.name, error.message);
            this.showError(`Erro ao exportar áudio: ${error.message}`);
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
        console.log('🎨 Updating UI to recording state');
        console.log('recordBtn:', this.recordBtn);
        console.log('recordingIndicator:', this.recordingIndicator);
        
        this.recordBtn.className = 'record-button stop';
        this.recordIcon.textContent = '⏹';
        this.recordText.textContent = 'Parar Gravação';
        this.recordingIndicator.classList.remove('hidden');
        
        console.log('✅ UI updated - button should be red, indicator visible');
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
