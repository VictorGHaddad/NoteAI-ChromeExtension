class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.isRecording = false;
        this.stream = null;
        this.startTime = null;
        this.timerInterval = null;
        this.useBackgroundRecording = true; // Use background recording by default
        
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
    }

    attachEventListeners() {
        this.recordBtn.addEventListener('click', () => this.toggleRecording());
        this.uploadBtn.addEventListener('click', () => this.uploadAudio());
        this.clearBtn.addEventListener('click', () => this.clearRecording());
    }

    async checkRecordingState() {
        try {
            // Check if there's a recording in progress
            const response = await chrome.runtime.sendMessage({ action: 'getRecordingState' });
            
            if (response.success && response.isRecording) {
                this.isRecording = true;
                this.startTime = response.startTime;
                this.updateRecordingUI();
                this.startTimer();
                this.updateStatus('Gravação em andamento (em background)');
            } else {
                this.updateStatus('�️ Pronto para gravar áudio da aba');
            }
            
            // Check if there's a saved recording
            const storage = await chrome.storage.local.get(['lastRecording']);
            if (storage.lastRecording && !this.isRecording) {
                this.showSuccess('Há uma gravação salva. Clique em "Carregar Última Gravação"');
            }
        } catch (error) {
            console.log('Error checking recording state:', error);
            this.updateStatus('�️ Pronto para gravar áudio da aba');
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
            
            if (this.useBackgroundRecording) {
                // Use background recording (works when popup is closed)
                this.updateStatus('Preparando gravação em background...');
                
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                
                if (!tab || !tab.id) {
                    throw new Error('Não foi possível identificar a aba ativa');
                }
                
                const response = await chrome.runtime.sendMessage({
                    action: 'startBackgroundRecording',
                    tabId: tab.id
                });
                
                if (!response.success) {
                    throw new Error(response.error || 'Falha ao iniciar gravação em background');
                }
                
                this.isRecording = true;
                this.startTime = Date.now();
                this.updateRecordingUI();
                this.startTimer();
                this.updateStatus('🎙️ Gravando áudio da aba (em background)\n\nVocê pode fechar este popup e continuar usando o navegador. A gravação continuará.');
                
            } else {
                // Original recording method (stops when popup closes)
                this.updateStatus('Preparando para capturar áudio da aba...');

                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                
                if (!tab || !tab.id) {
                    throw new Error('Não foi possível identificar a aba ativa');
                }

                this.updateStatus('Capturando áudio da aba atual...');

                this.stream = await chrome.tabCapture.capture({
                    audio: true,
                    video: false
                });

                if (!this.stream) {
                    throw new Error('Falha ao capturar áudio da aba. Certifique-se de que há áudio tocando na página.');
                }

            // Initialize MediaRecorder
            const options = {
                mimeType: 'audio/webm;codecs=opus'
            };

            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'audio/webm';
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    options.mimeType = 'audio/mp4';
                }
            }

            this.mediaRecorder = new MediaRecorder(this.stream, options);
            this.recordedChunks = [];

            // Set up event handlers
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.recordedChunks.push(event.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.processRecording();
            };

            // Start recording
            this.mediaRecorder.start(1000); // Collect data every second
            this.isRecording = true;
            this.startTime = Date.now();

            // Update UI
            this.updateRecordingUI();
            this.startTimer();
            this.updateStatus('Gravando... Fale no microfone');

        } catch (error) {
            console.error('Error starting recording:', error);
            
            // Clean up any partial state
            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
                this.stream = null;
            }
            
            // Provide user-friendly error messages
            let errorMessage = 'Erro desconhecido';
            
            if (error.name === 'NotAllowedError' || error.message.includes('Permission denied') || error.message.includes('Permission dismissed')) {
                errorMessage = 'Permissão de microfone negada. Por favor:\n\n1. Clique no ícone do cadeado na barra de endereços\n2. Permita o acesso ao microfone\n3. Recarregue a página e tente novamente';
            } else if (error.name === 'NotFoundError') {
                errorMessage = 'Nenhum microfone encontrado. Verifique se um microfone está conectado.';
            } else if (error.name === 'NotReadableError') {
                errorMessage = 'Microfone está sendo usado por outro aplicativo. Feche outros programas que possam estar usando o microfone.';
            } else if (error.name === 'OverconstrainedError') {
                errorMessage = 'Configurações de áudio não suportadas pelo seu microfone.';
            } else if (error.name === 'SecurityError') {
                errorMessage = 'Acesso ao microfone bloqueado por questões de segurança. Certifique-se de estar em uma conexão segura (HTTPS).';
            } else {
                errorMessage = `Erro ao acessar o microfone: ${error.message}`;
            }
            
            this.showError(errorMessage);
            this.updateStatus('Erro na gravação. Tente novamente.');
        }
    }

    async stopRecording() {
        try {
            if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
                this.mediaRecorder.stop();
            }

            if (this.stream) {
                this.stream.getTracks().forEach(track => track.stop());
                this.stream = null;
            }

            this.isRecording = false;
            this.stopTimer();
            this.updateStatus('Processando gravação...');
            this.resetRecordingUI();

        } catch (error) {
            console.error('Error stopping recording:', error);
            this.showError(`Erro ao parar gravação: ${error.message}`);
        }
    }

    processRecording() {
        if (this.recordedChunks.length === 0) {
            this.showError('Nenhum áudio foi gravado');
            return;
        }

        try {
            // Create blob from recorded chunks
            const blob = new Blob(this.recordedChunks, { type: 'audio/webm' });
            
            // Create audio URL for preview
            const audioUrl = URL.createObjectURL(blob);
            this.audioPlayer.src = audioUrl;
            
            // Show preview and actions
            this.audioPreview.classList.remove('hidden');
            this.actions.classList.remove('hidden');
            
            // Store blob for upload
            this.recordedBlob = blob;
            
            this.updateStatus('Gravação concluída! Você pode ouvir a prévia e enviar para transcrição.');
            this.showSuccess('Áudio gravado com sucesso!');

        } catch (error) {
            console.error('Error processing recording:', error);
            this.showError(`Erro ao processar gravação: ${error.message}`);
        }
    }

    async uploadAudio() {
        if (!this.recordedBlob) {
            this.showError('Nenhum áudio para enviar');
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
        this.recordedChunks = [];
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
        
        this.showSuccess('Gravação limpa');
    }

    updateRecordingUI() {
        this.recordBtn.className = 'record-button stop';
        this.recordIcon.textContent = '⏹️';
        this.recordText.textContent = 'Parar Gravação';
        this.recordingIndicator.classList.remove('hidden');
    }

    resetRecordingUI() {
        this.recordBtn.className = 'record-button start';
        this.recordIcon.textContent = '🎤';
        this.recordText.textContent = 'Iniciar Gravação';
        this.recordingIndicator.classList.add('hidden');
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            const seconds = Math.floor(elapsed / 1000);
            const minutes = Math.floor(seconds / 60);
            const displaySeconds = seconds % 60;
            
            this.timer.textContent = 
                `${minutes.toString().padStart(2, '0')}:${displaySeconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
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
        
        // Show success message
        this.showSuccess('Transcrição salva! Verifique o dashboard para ver todas as transcrições.');
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
        errorDiv.textContent = message;
        this.messages.appendChild(errorDiv);
        
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 5000);
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
        }, 3000);
    }

    clearMessages() {
        this.messages.innerHTML = '';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AudioRecorder();
});