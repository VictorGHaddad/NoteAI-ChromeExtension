# ⚙️ Guia de Configuração de Ambientes

Este guia explica como configurar o Audio Transcriber para diferentes ambientes (desenvolvimento local, servidor remoto, produção).

## 📋 Visão Geral

O projeto possui três componentes principais que precisam se comunicar:
- **Backend** (FastAPI) - processa transcrições
- **Dashboard** (React) - interface web
- **Extension** (Chrome) - captura áudio

## 🏠 Desenvolvimento Local

### Backend
```bash
cd backend
cp .env.example .env
```

**backend/.env:**
```env
OPENAI_API_KEY=sk-your-key-here
BACKEND_HOST=localhost
BACKEND_PORT=8000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/audio_transcriber
```

### Dashboard
```bash
cd dashboard
cp .env.example .env
```

**dashboard/.env:**
```env
VITE_API_BASE_URL=http://localhost:8000/api
```

### Extension
```bash
cd extension
cp config.example.js config.js
```

**extension/config.js:**
```javascript
const CONFIG = {
    API_BASE_URL: 'http://localhost:8000/api'
};
```

### Iniciar
```bash
docker-compose up -d
```

Acesse:
- Backend: http://localhost:8000
- Dashboard: http://localhost:3000
- Docs: http://localhost:8000/docs

## 🌐 Servidor Remoto (VM, VPS, Cloud)

### Backend
```bash
cd backend
cp .env.example .env
```

**backend/.env:**
```env
OPENAI_API_KEY=sk-your-key-here
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
ALLOWED_ORIGINS=http://YOUR_SERVER_IP:3000,chrome-extension://*
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/audio_transcriber
```

### Dashboard
```bash
cd dashboard
cp .env.example .env
```

**dashboard/.env:**
```env
VITE_API_BASE_URL=http://YOUR_SERVER_IP:8000/api
```

### Extension
```bash
cd extension
cp config.example.js config.js
```

**extension/config.js:**
```javascript
const CONFIG = {
    API_BASE_URL: 'http://YOUR_SERVER_IP:8000/api'
};
```

### Acessar via SSH Tunnel (Opcional)
Se o servidor não tem IP público, use SSH tunneling:

```bash
ssh -L 3000:localhost:3000 -L 8000:localhost:8000 user@YOUR_SERVER_IP
```

Então configure tudo como "localhost".

## 🚀 Produção (HTTPS)

### Backend
```bash
cd backend
cp .env.example .env
```

**backend/.env:**
```env
OPENAI_API_KEY=sk-your-key-here
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
ALLOWED_ORIGINS=https://dashboard.your-domain.com,chrome-extension://*
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/audio_transcriber
```

### Dashboard
```bash
cd dashboard
cp .env.example .env
```

**dashboard/.env:**
```env
VITE_API_BASE_URL=https://api.your-domain.com
```

### Extension
```bash
cd extension
cp config.example.js config.js
```

**extension/config.js:**
```javascript
const CONFIG = {
    API_BASE_URL: 'https://api.your-domain.com/api'
};
```

### Nginx Reverse Proxy

**nginx.conf:**
```nginx
server {
    listen 80;
    server_name api.your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name api.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/api.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 443 ssl;
    server_name dashboard.your-domain.com;

    ssl_certificate /etc/letsencrypt/live/dashboard.your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dashboard.your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🔒 Segurança

### Variáveis Sensíveis
**NUNCA commite:**
- `.env` files
- `config.js` da extensão
- API keys
- Senhas de banco de dados

**SEMPRE use:**
- `.env.example` com valores placeholder
- `config.example.js` com valores exemplo
- `.gitignore` configurado

### CORS
Configure corretamente o CORS no backend:

```python
# backend/app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://YOUR_SERVER_IP:3000",
        "https://dashboard.your-domain.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## 🐳 Docker Compose

Para ambientes diferentes, crie arquivos compose separados:

**docker-compose.dev.yml** (desenvolvimento):
```yaml
services:
  backend:
    environment:
      - DEBUG=True
  dashboard:
    ports:
      - "3000:3000"
```

**docker-compose.prod.yml** (produção):
```yaml
services:
  backend:
    environment:
      - DEBUG=False
    restart: always
  dashboard:
    restart: always
```

Uso:
```bash
# Desenvolvimento
docker-compose up -d

# Produção
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## 📝 Checklist de Configuração

### Antes de Commitar
- [ ] Remover IPs hardcoded
- [ ] Usar variáveis de ambiente
- [ ] Atualizar `.env.example`
- [ ] Verificar `.gitignore`
- [ ] Testar com valores exemplo

### Antes de Deploy
- [ ] Configurar `.env` no servidor
- [ ] Configurar `config.js` da extensão
- [ ] Testar conectividade backend ↔ dashboard
- [ ] Testar extensão → backend
- [ ] Verificar CORS
- [ ] Configurar SSL (produção)
- [ ] Backup do banco de dados

## 🆘 Troubleshooting

### Erro: "Failed to fetch" na extensão
- Verifique se `config.js` tem a URL correta
- Verifique se o backend está acessível
- Verifique CORS no backend

### Erro: Dashboard não carrega transcrições
- Verifique se `.env` do dashboard tem a URL correta
- Verifique se o backend está rodando
- Abra DevTools e veja erros de console

### Erro: "CORS policy blocked"
- Adicione a origem no backend
- Reinicie o backend após mudanças
- Verifique se a URL está exatamente igual

## 📚 Recursos Adicionais

- [Docker Compose Environment Variables](https://docs.docker.com/compose/environment-variables/)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [FastAPI CORS](https://fastapi.tiangolo.com/tutorial/cors/)
- [Chrome Extension Host Permissions](https://developer.chrome.com/docs/extensions/mv3/declare_permissions/)
