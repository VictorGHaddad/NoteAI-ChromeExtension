# 🚀 Como Instalar a Extensão Chrome - PASSO A PASSO

## 📋 Pré-requisitos
- Google Chrome instalado
- Arquivos da extensão (já criados na VM)

## 🔄 Método 1: Copiar via SCP (Recomendado)

### No seu computador local:
```bash
# Baixar a pasta da extensão para seu computador
scp -r ubuntu@10.0.0.111:/home/ubuntu/ccm-internal-transcriber-extension/audio-transcriber/extension ./audio-transcriber-extension
```

### No Google Chrome:
1. Abra o Chrome
2. Digite na barra de endereços: `chrome://extensions/`
3. **ATIVE** o botão "Modo do desenvolvedor" (canto superior direito)
4. Clique em **"Carregar sem compactação"**
5. Selecione a pasta `audio-transcriber-extension` que você baixou
6. A extensão aparecerá na lista e na barra de ferramentas

## 📦 Método 2: Download do ZIP

### Baixar arquivo ZIP:
```bash
# Na VM, o arquivo já foi criado:
# /home/ubuntu/ccm-internal-transcriber-extension/audio-transcriber/audio-transcriber-extension.zip

# Para baixar no seu computador:
scp ubuntu@10.0.0.111:/home/ubuntu/ccm-internal-transcriber-extension/audio-transcriber/audio-transcriber-extension.zip ./
```

### Instalar:
1. Extrair o arquivo ZIP
2. No Chrome: `chrome://extensions/`
3. Ativar "Modo do desenvolvedor"
4. "Carregar sem compactação" → selecionar pasta `extension`

## 🌐 Método 3: Se usando interface web da VM

Se você acessa a VM pelo navegador (AWS Console, Google Cloud, etc.):

1. **Criar servidor HTTP simples na VM:**
```bash
cd /home/ubuntu/ccm-internal-transcriber-extension/audio-transcriber
python3 -m http.server 8080
```

2. **Acessar pelo navegador:**
   - Vá para: http://10.0.0.111:8080
   - Baixe o arquivo `audio-transcriber-extension.zip`
   - Extraia e siga o Método 2

## ✅ Verificar se funcionou

Após instalar:
1. A extensão deve aparecer na barra de ferramentas do Chrome
2. Clique no ícone da extensão
3. Deve abrir um popup com interface roxa/azul
4. Teste clicando em "Iniciar Gravação"

## ⚙️ Configurações importantes

A extensão está configurada para usar:
- **API URL**: `http://10.0.0.111:8000/api`
- **Dashboard**: `http://10.0.0.111:3000`

## 🔧 Resolução de problemas

### "Erro: Extensão não carrega"
- Verifique se todos os arquivos estão na pasta
- Certifique-se que o modo desenvolvedor está ATIVO
- Tente recarregar a extensão

### "Erro: Não consegue gravar áudio"
- Permita acesso ao microfone quando solicitado
- Verifique se o backend está rodando: `curl http://10.0.0.111:8000/health`

### "Erro: Não consegue enviar áudio"
- Confirme se o backend está acessível
- Verifique se a OPENAI_API_KEY está configurada

## 🎯 Teste completo

1. **Instalar extensão** ✅
2. **Configurar OpenAI API Key** no backend
3. **Gravar áudio** pela extensão
4. **Ver transcrição** no dashboard (http://10.0.0.111:3000)

**Arquivos prontos para download:**
- Pasta completa: `/home/ubuntu/ccm-internal-transcriber-extension/audio-transcriber/extension/`
- ZIP: `/home/ubuntu/ccm-internal-transcriber-extension/audio-transcriber/audio-transcriber-extension.zip`