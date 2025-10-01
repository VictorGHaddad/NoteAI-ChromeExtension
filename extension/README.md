# Audio Transcriber Extension

## 📋 Descrição
Extensão Chrome para gravar áudio de reuniões online e transcrever automaticamente usando IA (OpenAI Whisper + GPT-4o-mini).

## 🎯 Funcionalidades
- ✅ Captura áudio da aba ativa (reuniões, vídeos, etc.)
- ✅ Gravação em background (continua mesmo com popup fechado)
- ✅ Transcrição automática com OpenAI Whisper
- ✅ Resumo automático com GPT-4o-mini
- ✅ Salva no banco de dados para consulta posterior

## 🚀 Instalação

### 1. Copiar arquivos da VM
```bash
scp -r ubuntu@10.0.0.111:/home/ubuntu/ccm-internal-transcriber-extension/audio-transcriber/extension ./audio-transcriber-extension
```

### 2. Instalar no Chrome
1. Abra o Chrome e vá para `chrome://extensions/`
2. Ative o **"Modo do desenvolvedor"** (toggle no canto superior direito)
3. Clique em **"Carregar extensão sem compactação"**
4. Selecione a pasta `audio-transcriber-extension`
5. A extensão será instalada e aparecerá na barra de ferramentas

## 💻 Como Usar

### Passo 1: Iniciar Gravação
1. Abra uma reunião ou vídeo (Google Meet, Zoom, Teams, YouTube, etc.)
2. Clique no ícone da extensão na barra de ferramentas
3. Clique em **"Iniciar Gravação"**
4. A extensão pedirá permissão para capturar o áudio da aba

### Passo 2: Gravar em Background
- Após iniciar, você pode **fechar o popup**
- A gravação continua automaticamente em background
- Você pode navegar, mudar de aba, etc.
- Um ícone vermelho aparecerá indicando que está gravando

### Passo 3: Parar e Transcrever
1. Quando terminar, clique novamente no ícone da extensão
2. Clique em **"Parar Gravação"**
3. Clique em **"Carregar Última Gravação"**
4. Ouça a prévia do áudio
5. Clique em **"Transcrever"**

### Passo 4: Ver Resultados
- O resumo aparecerá no popup
- Acesse o dashboard em `http://10.0.0.111:3000` para ver todas as transcrições

## ⚙️ Configuração

### Alterar URL da API
Edite o arquivo `config.js`:
```javascript
const CONFIG = {
    API_BASE_URL: 'http://10.0.0.111:8000/api'  // Altere conforme necessário
};
```

## 🔧 Troubleshooting

### Erro: "chrome.tabCapture is not available"
- Certifique-se de que está em uma aba com conteúdo (não funciona em chrome:// ou páginas em branco)
- Recarregue a extensão em `chrome://extensions/`

### Erro: "Failed to capture tab audio"
- Certifique-se de que a página está reproduzindo áudio
- Algumas páginas bloqueiam captura de áudio (ex: Netflix)
- Tente em outra aba/site

### Gravação não inicia
1. Verifique se está na aba correta
2. Recarregue a extensão
3. Verifique o console do service worker:
   - Vá em `chrome://extensions/`
   - Clique em "Service Worker" na extensão
   - Veja os logs no console

### Transcrição falha
- Verifique se o backend está rodando: `http://10.0.0.111:8000/health`
- Verifique se a API key do OpenAI está configurada
- Verifique os logs do backend: `docker-compose logs backend`

## 📝 Notas Importantes

### Limitações
- **Não funciona em páginas protegidas**: chrome://, about://, Web Store
- **Precisa de áudio ativo**: A página precisa estar reproduzindo som
- **Qualidade do áudio**: Depende da qualidade da transmissão original

### Privacidade
- O áudio é processado via OpenAI API
- Transcrições ficam salvas no banco de dados local
- Use apenas em reuniões onde tem permissão para gravar

### Performance
- Arquivos grandes podem demorar para transcrever
- O backend precisa de conexão com internet (OpenAI API)
- Tempo de processamento: ~30s para 5 minutos de áudio

## 🔄 Atualizações

Para atualizar a extensão:
1. Copie os arquivos novamente da VM
2. Vá em `chrome://extensions/`
3. Clique no botão "Recarregar" (ícone de refresh) na extensão

Ou remova e reinstale seguindo os passos de instalação.

## 📊 Estrutura de Arquivos

```
extension/
├── manifest.json          # Configuração da extensão
├── popup.html            # Interface do popup
├── popup.js              # Lógica do popup
├── background.js         # Service worker (gravação em background)
├── config.js             # Configurações (URL da API)
├── README.md             # Este arquivo
└── icons/                # Ícones da extensão
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

## 🆘 Suporte

Se encontrar problemas:
1. Verifique os logs do service worker
2. Verifique se o backend está rodando
3. Teste em uma página simples primeiro (ex: YouTube)
4. Certifique-se de que a API key do OpenAI está configurada

## 📄 Versão
v1.1.0 - Gravação em background com captura de áudio da aba
