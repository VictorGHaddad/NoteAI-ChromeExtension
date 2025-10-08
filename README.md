# 🎙️ NoteAI - Chrome Extension

[![Version](https://img.shields.io/badge/version-1.0.5-blue.svg)](https://github.com/VictorGHaddad/NoteAI-ChromeExtension/releases/tag/v1.0.5)
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

### Extension Features (v1.0.5)
- � **Estimativa de Custo**: Veja o custo estimado antes de transcrever (USD e BRL)
- ⚠️ **Sistema de Avisos**: Alertas automáticos para arquivos próximos ao limite
- �💾 **Exportação de Áudio**: Baixe o arquivo de áudio original (.webm) antes de transcrever
- 🎙️ **Gravação em Background**: Continue navegando enquanto grava
- 📏 **Limite Inteligente**: Até 30 minutos de gravação (~30MB) com validação automática
- 🔄 **Auto-save**: Gravações salvas automaticamente no storage do Chrome

### Dashboard Features (v1.0.5)
- 📤 **Upload Externo**: Faça upload de áudios gravados fora da extensão (drag & drop)
- 📊 **Validação de Tamanho**: Sistema verifica limites antes do upload
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
   git clone https://github.com/VictorGHaddad/NoteAI-ChromeExtension.git
   cd NoteAI-ChromeExtension
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

### ⚠️ **IMPORTANTE: Limites de Gravação**

A API OpenAI Whisper tem um **limite rígido de 25MB por requisição**. Por isso:

- ✅ **Limite recomendado**: Até **30 minutos** (~30MB)
- ⚠️ **Arquivos entre 25-30MB**: Podem demorar mais para processar
- ❌ **Arquivos acima de 30MB**: Serão rejeitados automaticamente

**Estimativa de tamanho por duração:**
- 5 minutos ≈ 5MB ✅
- 15 minutos ≈ 15MB ✅
- 30 minutos ≈ 30MB ✅ (limite máximo)
- 45 minutos ≈ 45MB ❌ (muito grande!)

> 💡 **Dica**: O sistema mostra automaticamente o custo estimado e avisos quando você gravar um áudio. Se o arquivo for muito grande, o botão de transcrever será desabilitado.

### Como Usar

1. **Clique no ícone da extensão** na barra de ferramentas
2. **Clique em "Iniciar Gravação"** e permita o acesso ao microfone
3. **Fale claramente** - o timer mostrará a duração
4. **Observe o timer** - mantenha abaixo de 30 minutos
5. **Clique em "Parar Gravação"** quando terminar
6. **Veja a estimativa de custo** - será exibida automaticamente por 15 segundos
7. **Ouça a prévia** do áudio gravado (opcional)
8. **Opções disponíveis:**
   - 💾 **Exportar**: Baixe o arquivo .webm original
   - 🚀 **Transcrever**: Envie para transcrição com IA
   - 🗑️ **Limpar**: Apague a gravação atual
9. **Visualize o resultado** no dashboard com texto e resumo estruturado

### 💰 Estimativa de Custo

O sistema calcula automaticamente:
- **Duração estimada** baseada no tamanho do arquivo
- **Custo em USD e BRL** (taxa: $0.006/minuto)
- **Avisos** se o arquivo estiver próximo ou acima do limite

**Exemplos de custo:**
- 10 minutos: ~$0.06 USD (R$ 0.30)
- 20 minutos: ~$0.12 USD (R$ 0.60)
- 30 minutos: ~$0.18 USD (R$ 0.90)

## 📊 Uso do Dashboard

### Upload de Áudio Externo

O dashboard permite fazer upload de arquivos de áudio gravados fora da extensão Chrome:

1. **Acesse o dashboard** em http://localhost:3000
2. **Clique em "Upload Áudio"** no canto superior direito
3. **Selecione ou arraste um arquivo** (formatos: .mp3, .wav, .m4a, .ogg, .webm, .mp4)
4. **Aguarde o upload e transcrição** - uma barra de progresso será exibida
5. **Veja o resultado** automaticamente na lista de transcrições

**⚠️ Limites para upload externo:**
- Tamanho máximo: **30MB** (~30 minutos)
- Formatos suportados: MP3, WAV, M4A, OGG, WebM, MP4, MPEG, MPGA
- O sistema valida o tamanho antes do upload e mostra avisos

### Gerenciamento de Transcrições

- **Visualizar**: Clique em qualquer card para ver detalhes completos
- **Editar título**: Clique no ícone de editar no modal
- **Adicionar tags**: Use o botão "+ Tag" para organizar
- **Copiar resumo**: Botão "Copiar" na seção de resumo
- **Exportar**: Escolha entre PDF, TXT ou Markdown
- **Deletar**: Botão de lixeira para remover transcrições
- **Regenerar resumo**: Gere um novo resumo da transcrição

## 🌐 API Endpoints

### Audio
- `POST /api/audio/upload` - Upload e transcrição de áudio
- `GET /api/audio/estimate-cost?file_size_mb=X` - **[NOVO v1.0.5]** Estimar custo de transcrição
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
