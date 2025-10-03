# 🎙️ NoteAI - Chrome Extension

[![Version](https://img.shields.io/badge/version-1.0.1-blue.svg)](https://github.com/VictorGHaddad/NoteAI-ChromeExtension/releases/tag/v1.0.1)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Um monorepo completo para transcrição de áudio usando IA, com extensão Chrome, backend FastAPI e dashboard React.

## 📋 Funcionalidades

### Core
- 🎤 **Extensão Chrome**: Grave áudio diretamente do navegador (microfone + áudio da aba)
- 🤖 **IA de Transcrição**: OpenAI Whisper para conversão de áudio em texto
- 📝 **Resumos Inteligentes**: GPT-4o-mini para geração de resumos estruturados em formato ATA
- 📊 **Dashboard Web**: Interface React minimalista (preto e branco)
- 🐳 **Docker**: Ambiente completo containerizado
- 🗄️ **PostgreSQL**: Armazenamento persistente de dados

### Dashboard Features (v1.0.0)
- 📤 **Exportação**: Exporte transcrições em PDF, TXT ou Markdown
- ✏️ **Edição de Títulos**: Edite o nome das gravações diretamente no modal
- 📋 **Copiar Resumo**: Copie o texto do resumo com um clique
- 🏷️ **Sistema de Tags**: Adicione e gerencie tags para organizar suas transcrições
- 🎨 **Visualização Customizável**: Escolha entre cards compactos, normais ou expandidos
- 🔤 **Controle de Fonte**: Ajuste o tamanho da fonte para melhor leitura
- 📅 **Formatação Brasileira**: Datas e horários no formato brasileiro

## 🏗️ Arquitetura

```
audio-transcriber/
├── backend/          # FastAPI + Python 3.12
├── extension/        # Chrome Extension (Manifest v3)
├── dashboard/        # React + Vite + Material UI
├── docker-compose.yml
└── README.md
```

## 🚀 Configuração Rápida com Docker

### 1. Pré-requisitos

- Docker e Docker Compose instalados
- Chave da API OpenAI

### 2. Configuração

1. **Clone e acesse o projeto:**
   ```bash
   git clone https://github.com/VictorGHaddad/audio-transcriber.git
   cd audio-transcriber
   ```

2. **Configure as variáveis de ambiente:**
   ```bash
   cp .env.example .env
   # Edite o arquivo .env e adicione sua OPENAI_API_KEY
   ```

3. **Configure a extensão Chrome:**
   ```bash
   cd extension
   cp config.example.js config.js
   # Edite config.js com a URL do seu backend (padrão: http://localhost:8000/api)
   ```

4. **Configure o dashboard (opcional):**
   ```bash
   cd dashboard
   cp .env.example .env
   # Edite .env se seu backend não estiver em localhost:8000
   ```

> 📖 Para configurações avançadas (servidor remoto, produção, HTTPS), veja [CONFIGURATION.md](CONFIGURATION.md)

5. **Inicie todos os serviços:**
   ```bash
   docker-compose up -d
   ```

6. **Verifique se os serviços estão rodando:**
   - Backend: http://localhost:8000
   - Dashboard: http://localhost:3000
   - Postgres: localhost:5432

### 3. Carregue a Extensão Chrome

1. Abra o Chrome e vá para `chrome://extensions/`
2. Ative o "Modo do desenvolvedor" (canto superior direito)
3. Clique em "Carregar sem compactação"
4. Selecione a pasta `extension/`
5. A extensão aparecerá na barra de ferramentas

## 🛠️ Desenvolvimento Local (Sem Docker)

### Backend (FastAPI)

```bash
cd backend

# Instalar dependências
pip install -r requirements.txt

# Configurar variáveis de ambiente
cp .env.example .env
# Edite .env com suas configurações

# Executar servidor de desenvolvimento
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Dashboard (React)

```bash
cd dashboard

# Instalar dependências
npm install

# Executar servidor de desenvolvimento
npm run dev
```

### Banco de Dados PostgreSQL

```bash
# Usando Docker apenas para o banco
docker run --name audio-transcriber-db \
  -e POSTGRES_DB=audio_transcriber \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:15-alpine
```

## 📱 Uso da Extensão Chrome

1. **Clique no ícone da extensão** na barra de ferramentas
2. **Clique em "Iniciar Gravação"** e permita o acesso ao microfone
3. **Fale claramente** - o timer mostrará a duração
4. **Clique em "Parar Gravação"** quando terminar
5. **Ouça a prévia** do áudio gravado
6. **Clique em "Transcrever"** para enviar para o servidor
7. **Visualize o resultado** com texto e resumo

## 🌐 API Endpoints

### Audio
- `POST /api/audio/upload` - Upload e transcrição de áudio
- `GET /api/audio/transcriptions` - Listar todas as transcrições
- `GET /api/audio/transcriptions/{id}` - Obter transcrição específica
- `PATCH /api/audio/transcriptions/{id}` - Atualizar título e tags da transcrição
- `DELETE /api/audio/transcriptions/{id}` - Deletar transcrição
- `POST /api/audio/transcriptions/{id}/regenerate-summary` - Regenerar resumo

### Health
- `GET /` - Status da API
- `GET /health` - Health check

## 🐳 Comandos Docker Úteis

```bash
# Iniciar todos os serviços
docker-compose up -d

# Ver logs dos serviços
docker-compose logs -f

# Parar todos os serviços
docker-compose down

# Rebuild dos containers
docker-compose up --build

# Acesso ao container do backend
docker-compose exec backend bash

# Backup do banco de dados
docker-compose exec postgres pg_dump -U postgres audio_transcriber > backup.sql
```

## 🔧 Configurações Avançadas

### Backend (.env)
```env
OPENAI_API_KEY=sua_chave_aqui
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/audio_transcriber
DEBUG=True
HOST=0.0.0.0
PORT=8000
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
MAX_AUDIO_SIZE_MB=25
SUPPORTED_AUDIO_FORMATS=mp3,wav,m4a,ogg,webm
```

### Extensão Chrome

A extensão suporta:
- Gravação de áudio do microfone
- Formatos: WebM, MP4, MP3
- Upload automático para o backend
- Visualização de resultados inline

### Dashboard Features

- 📊 **Estatísticas**: Total de transcrições, duração total, tamanho total
- 🔍 **Pesquisa**: Filtrar transcrições por nome
- 👁️ **Visualização**: Modal detalhado para cada transcrição
- 🔄 **Atualização**: Regenerar resumos usando IA
- 🗑️ **Gestão**: Deletar transcrições
- 📤 **Exportação**: Baixe em PDF, TXT ou Markdown
- ✏️ **Edição**: Edite títulos das gravações
- 📋 **Clipboard**: Copie resumos com um clique
- 🏷️ **Tags**: Organize transcrições com tags personalizadas
- 🎨 **Customização**: Ajuste tamanho dos cards e fonte

## 🚧 Recursos Futuros

- [ ] **Transcrição em tempo real**
- [ ] **Suporte a múltiplos idiomas**
- [ ] **Integração com Google Drive/Dropbox**
- [ ] **API de webhooks**
- [ ] **Dashboard móvel (PWA)**
- [ ] **Filtros avançados por tags**
- [ ] **Estatísticas e analytics**
- [ ] **Exportação em lote**

## 🔒 Segurança

- Dados armazenados localmente ou no seu servidor
- API Key OpenAI protegida por variáveis de ambiente
- Extensão com permissões mínimas necessárias
- Containers rodando com usuários não-root

## 🐛 Troubleshooting

### Extensão não carrega
- Verifique se está no modo desenvolvedor
- Veja o console de extensões (`chrome://extensions/`) para erros
- Confirme se o backend está rodando na porta 8000

### Erro de permissão de microfone
- Clique no ícone de cadeado na barra de endereços
- Permita acesso ao microfone
- Recarregue a página se necessário

### Backend não conecta com o banco
- Verifique se o PostgreSQL está rodando
- Confirme as credenciais no arquivo `.env`
- Execute `docker-compose logs postgres` para ver logs

### Erro na API OpenAI
- Verifique se a `OPENAI_API_KEY` está correta
- Confirme se tem créditos na conta OpenAI
- Veja os logs do backend: `docker-compose logs backend`

## 🤝 Contribuição

1. Fork do projeto
2. Crie uma branch para sua feature
3. Commit suas alterações
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 👥 Suporte

- **Issues**: Reporte bugs ou solicite features
- **Discussões**: Tire dúvidas ou compartilhe ideias
- **Wiki**: Documentação adicional e tutoriais

---

**Desenvolvido com ❤️ usando FastAPI, React e OpenAI**