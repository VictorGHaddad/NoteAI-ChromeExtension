# 🚀 Como Instalar a Extensão Chrome - PASSO A PASSO

## 📋 Pré-requisitos
- Google Chrome instalado
- Backend rodando (local ou remoto)
- Arquivos da extensão configurados

## � Configuração da Extensão

Antes de instalar, configure a URL da API:

1. **Copie o arquivo de configuração:**
   ```bash
   cd extension
   cp config.example.js config.js
   ```

2. **Edite o arquivo `config.js`:**
   ```javascript
   const CONFIG = {
       // Para desenvolvimento local:
       API_BASE_URL: 'http://localhost:8000/api',
       
       // Para servidor remoto (substitua YOUR_SERVER_IP):
       // API_BASE_URL: 'http://YOUR_SERVER_IP:8000/api',
       
       // Para produção:
       // API_BASE_URL: 'https://your-domain.com/api'
   };
   ```

## 🔄 Método 1: Carregar Diretamente (Desenvolvimento)

1. Abra o Chrome
2. Digite na barra de endereços: `chrome://extensions/`
3. **ATIVE** o botão "Modo do desenvolvedor" (canto superior direito)
4. Clique em **"Carregar sem compactação"**
5. Selecione a pasta `extension/`
6. A extensão aparecerá na lista e na barra de ferramentas

## 📦 Método 2: Instalação via ZIP

### Criar o ZIP:
```bash
cd audio-transcriber
zip -r NoteAI-ChromeExtension.zip extension/
```

### Instalar:
1. Extrair o arquivo ZIP
2. No Chrome: `chrome://extensions/`
3. Ativar "Modo do desenvolvedor"
4. "Carregar sem compactação" → selecionar pasta `extension`

## 🌐 Método 3: Download do Servidor Remoto

Se o backend está em um servidor remoto:

```bash
# Download via SCP
scp -r user@YOUR_SERVER_IP:/path/to/extension ./NoteAI-ChromeExtension

# Ou criar um servidor HTTP temporário no servidor:
# No servidor:
python3 -m http.server 8080

# No navegador:
# http://YOUR_SERVER_IP:8080
# Baixe o arquivo extension.zip
```

## ✅ Verificar se funcionou

Após instalar:
1. A extensão deve aparecer na barra de ferramentas do Chrome
2. Clique no ícone da extensão
3. Deve abrir um popup com a interface
4. Teste clicando em "Iniciar Gravação"

## ⚙️ Configuração do Backend

Certifique-se de que o backend está configurado para aceitar requisições da extensão:

**Backend `.env`:**
```env
ALLOWED_ORIGINS=http://localhost:3000,chrome-extension://*
```

## 🔧 Resolução de problemas

### "Erro: Extensão não carrega"
- Verifique se todos os arquivos estão na pasta
- Certifique-se que o modo desenvolvedor está ATIVO
- Verifique se `config.js` existe (copie de `config.example.js`)
- Tente recarregar a extensão

### "Erro: Não consegue gravar áudio"
- Permita acesso ao microfone quando solicitado
- Verifique configurações de privacidade do Chrome
- Teste em uma página HTTPS ou localhost

### "Erro: Não consegue enviar áudio"
- Confirme se o backend está acessível: `curl http://localhost:8000/health`
- Verifique se a URL em `config.js` está correta
- Verifique se a OPENAI_API_KEY está configurada no backend
- Verifique permissões CORS no backend

### "Erro: CORS"
- Adicione a origem da extensão no backend
- Verifique o arquivo `.env` do backend
- Reinicie o backend após mudanças no CORS

## 🎯 Teste completo

1. ✅ **Configurar** `config.js` com a URL correta
2. ✅ **Instalar extensão** no Chrome
3. ✅ **Configurar OpenAI API Key** no backend
4. ✅ **Gravar áudio** pela extensão
5. ✅ **Ver transcrição** no dashboard

## 📝 Notas de Desenvolvimento

- Sempre recarregue a extensão após mudanças no código
- Use o DevTools da extensão para debugar (Inspecionar popup)
- Logs aparecem no console do background service worker
- Para debugging avançado: `chrome://extensions/` → Detalhes → Inspecionar
