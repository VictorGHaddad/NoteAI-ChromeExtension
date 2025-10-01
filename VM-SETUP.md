# 🖥️ Configuração para VM (Virtual Machine)

Como você está em uma VM, aqui estão as opções para acessar o Audio Transcriber:

## 🌐 Opção 1: Acesso Direto via IP da VM

**IP da sua VM:** `10.0.0.111`

### URLs de Acesso:
- **Dashboard**: http://10.0.0.111:3000
- **Backend API**: http://10.0.0.111:8000
- **Documentação**: http://10.0.0.111:8000/docs

### Configurar Extensão Chrome:
1. Edite o arquivo `extension/config.js`
2. Descomente e ajuste a linha:
   ```javascript
   API_BASE_URL: 'http://10.0.0.111:8000/api',
   ```

## 🔧 Opção 2: SSH Port Forwarding (Túnel)

**Do seu computador local, execute:**

```bash
# Túnel completo (dashboard + backend)
ssh -L 3000:localhost:3000 -L 8000:localhost:8000 ubuntu@10.0.0.111

# Ou individual:
ssh -L 3000:localhost:3000 ubuntu@10.0.0.111  # Dashboard
ssh -L 8000:localhost:8000 ubuntu@10.0.0.111  # Backend
```

Depois acesse: http://localhost:3000 (no seu computador)

## 📁 Opção 3: Sincronizar Pasta (Desenvolvimento)

### Via SCP (copiar arquivos):
```bash
# Do seu computador para a VM
scp -r ./extension/ ubuntu@10.0.0.111:/caminho/para/projeto/

# Da VM para seu computador
scp -r ubuntu@10.0.0.111:/home/ubuntu/ccm-internal-transcriber-extension/audio-transcriber ./
```

### Via SSHFS (montar pasta remota):
```bash
# Instalar sshfs (se não tiver)
sudo apt install sshfs  # Ubuntu/Debian
brew install sshfs      # macOS

# Montar pasta da VM no seu computador
mkdir ~/vm-audio-transcriber
sshfs ubuntu@10.0.0.111:/home/ubuntu/ccm-internal-transcriber-extension/audio-transcriber ~/vm-audio-transcriber

# Desmontar quando terminar
fusermount -u ~/vm-audio-transcriber  # Linux
umount ~/vm-audio-transcriber         # macOS
```

### Via VS Code Remote:
1. Instale a extensão "Remote - SSH" 
2. Configure conexão SSH para `ubuntu@10.0.0.111`
3. Abra a pasta remotamente: `/home/ubuntu/ccm-internal-transcriber-extension/audio-transcriber`

## 🔐 Configurações de Firewall

Se não conseguir acessar, pode ser necessário abrir as portas:

```bash
# Na VM, execute:
sudo ufw allow 3000
sudo ufw allow 8000
sudo ufw status
```

## 🎯 Testando a Conexão

```bash
# Do seu computador, teste:
curl http://10.0.0.111:8000/health
curl -I http://10.0.0.111:3000
```

## 📝 Próximos Passos

1. **Configure sua chave OpenAI:**
   ```bash
   # Na VM, edite:
   nano /home/ubuntu/ccm-internal-transcriber-extension/audio-transcriber/backend/.env
   # Adicione: OPENAI_API_KEY=sua_chave_aqui
   ```

2. **Reinicie se necessário:**
   ```bash
   cd /home/ubuntu/ccm-internal-transcriber-extension/audio-transcriber
   docker-compose restart backend
   ```

3. **Carregue a extensão:**
   - Edite `extension/config.js` com o IP da VM
   - Carregue em `chrome://extensions/`

Escolha a opção que melhor se adequa ao seu ambiente!