# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.0.5] - 2025-10-07

### ✨ Adicionado
- **Estimativa de Custo**: Endpoint `/api/audio/estimate-cost` para calcular custo de transcrição
  - Baseado em pricing OpenAI Whisper ($0.006/minuto)
  - Retorna estimativa em USD e BRL
  - Estimativa de duração baseada em tamanho do arquivo
- **Upload Externo no Dashboard**: Permite carregar áudios gravados fora da extensão Chrome
  - Interface drag & drop para arquivos de áudio
  - Barra de progresso durante upload e transcrição
  - Suporte a múltiplos formatos de áudio
  - Botão "Upload Áudio" na barra de ferramentas
- **Suporte a Gravações Longas**: Limite de áudio aumentado para 20GB
  - Permite gravações de até 40 minutos ou mais
  - Configurável via `MAX_AUDIO_SIZE_MB=20000`
  - Documentação atualizada em `.env.example`

### 🔧 Alterado
- `.env.example`: Adicionadas referências para gravações de 40 minutos (~400MB) e 2 horas (~1200MB)
- Extension: Integração com endpoint de estimativa de custo
- Dashboard: Novo estado para gerenciar upload de arquivos externos

### 📝 Documentação
- Exemplos de estimativas de custo no `.env.example`
- Orientações para configurar limites maiores de áudio

---

## [1.0.4] - 2025-10-07

### ✨ Adicionado
- **Exportação de Áudio**: Botão "💾 Exportar" para baixar gravação antes de transcrever
- **Backup de Áudio**: Permite salvar arquivo original (.webm) localmente
- **Filename com Timestamp**: Arquivos exportados com formato `recording_YYYY-MM-DDTHH-MM-SS.webm`

### 🔧 Alterado
- Interface: 3 botões de ação (Transcrever, Exportar, Limpar) para melhor usabilidade
- Melhor organização dos controles na extensão

---

## [1.0.3] - 2025-10-07

### 🐛 Corrigido
- **ERR_CONNECTION_REFUSED**: Extensão tentava conectar em `localhost` quando backend estava em servidor remoto
- **Configuração de rede**: `config.js` agora aponta para IP do servidor (`10.0.0.111`)
- **Permissões de host**: Adicionado IP do servidor em `host_permissions` do manifest

### 🔧 Alterado
- `config.js`: `API_BASE_URL` alterado de `localhost` para `10.0.0.111`
- `manifest.json`: Adicionado `http://10.0.0.111:8000/*` nas permissões

### 🛠️ Debug
- Adicionados logs detalhados para rastreamento de problemas de upload
- Melhoradas mensagens de erro para facilitar diagnóstico
- Logs de verificação de blob e storage

---

## [1.0.2] - 2025-10-06

### 🐛 Corrigido
- **"Bytes quota exceeded"**: Erro ao gravar reuniões de 12+ minutos
- **Limite de áudio muito baixo**: Backend tinha limite de 25MB (apenas ~15 minutos)
- **Chrome storage limitado**: Extensão sem permissão `unlimitedStorage`

### ✨ Adicionado
- **Suporte a reuniões longas**: Agora suporta até 2 horas por padrão (200MB)
- **Configuração flexível**: `MAX_AUDIO_SIZE_MB` configurável via `.env`
- **Documentação completa**: Novo arquivo `AUDIO-LIMITS.md` com guia detalhado
- **Storage ilimitado**: Extensão Chrome com permissão `unlimitedStorage`

### 🔧 Alterado
- `MAX_AUDIO_SIZE_MB` aumentado de 25MB para 200MB (padrão)
- Docker Compose agora passa variável `MAX_AUDIO_SIZE_MB` para o backend
- `.env.example` atualizado com seção de configuração de áudio

### 📝 Documentação
- Criado `AUDIO-LIMITS.md` com:
  - Tabela de tamanhos por duração de reunião
  - Guia de configuração para reuniões longas
  - Troubleshooting de erros de quota
  - Estimativa de custos OpenAI por duração

### 💰 Capacidades
- ✅ Reuniões de 2 horas (~120-240MB) - Padrão
- ✅ Reuniões de 4 horas (~240-480MB) - Configurável até 600MB
- ✅ Divisão automática em chunks para API Whisper (limite 25MB)

---

## [1.0.1] - 2025-10-03

### 🐛 Corrigido
- **Dashboard `.env` faltando**: Dashboard não carregava transcrições devido ao arquivo `.env` ausente
- **CORS e conectividade**: Ajustada URL da API para funcionar corretamente com Docker
- **`.gitignore` incorreto**: Removida exclusão de arquivos Docker essenciais (Dockerfile, docker-compose.yml)
- **URL remota**: Atualizado remote do Git para o novo repositório `NoteAI-ChromeExtension`

### 🔧 Alterado
- Renomeado projeto de "Audio Transcriber" para "NoteAI"
- Dashboard `.env` agora usa IP correto da VM para acesso remoto
- Documentação atualizada com o novo nome do repositório

### 📝 Documentação
- Corrigido `.gitignore` para incluir arquivos Docker no repositório
- Adicionado `dashboard/.env.example` com configuração correta
- Atualizado `CONFIGURATION.md` com instruções de ambiente

---

## [1.0.0] - 2025-10-03

### 🎉 Primeira Release Oficial

Esta é a primeira versão estável do Audio Transcriber, com sistema completo de transcrição de áudio usando IA.

### ✨ Adicionado

#### Dashboard
- **Exportação de Transcrições**: Exporte em três formatos
  - PDF com formatação profissional
  - TXT para texto simples
  - Markdown para documentação
  - Remoção automática de emojis em PDF
  - Formatação de datas no padrão brasileiro

- **Sistema de Edição**
  - Edição inline de títulos das gravações
  - Interface com ícone de editar e botões de salvar/cancelar
  - Atualização automática após salvar
  - Notificações de sucesso/erro via Snackbar

- **Copiar Resumo**
  - Botão "Copiar" com ícone na seção de resumo
  - Copia texto completo para área de transferência
  - Feedback visual de sucesso

- **Sistema de Tags**
  - Adicione tags personalizadas para organizar transcrições
  - Chips visuais coloridos no modal
  - Botão "+ Tag" para adicionar novas tags
  - Remover tags com um clique no ícone X
  - Persistência no banco de dados

- **Customização de Visualização**
  - Três tamanhos de cards: Compacto, Normal, Expandido
  - Controle de tamanho de fonte (Pequena, Média, Grande)
  - Preferências salvas no localStorage
  - Interface minimalista preto e branco

- **Melhorias de UX**
  - Formatação de datas no padrão brasileiro (DD/MM/YYYY às HH:MM)
  - Cards responsivos com animações suaves
  - Dialogs com scroll suave
  - Feedback visual em todas as ações

#### Backend
- **Novos Endpoints**
  - `PATCH /api/audio/transcriptions/{id}` - Atualizar título e tags
  - Suporte a JSON body com Pydantic models
  - Validação de dados com Optional fields

- **Modelo de Dados**
  - Coluna `tags` no banco (TEXT com JSON)
  - Métodos `get_tags()` e `set_tags()` para serialização
  - Campo `updated_at` para rastreamento de mudanças

- **API Improvements**
  - Retorno consistente do campo `tags` em todos os endpoints
  - Suporte a arrays de strings para tags
  - Melhor tratamento de erros

#### Extension (Chrome)
- Captura de áudio do microfone + áudio da aba
- Mixer de áudio com controle de volume
- Interface popup responsiva
- Upload direto para o backend
- Suporte a múltiplos formatos de áudio

#### Core Features
- Transcrição usando OpenAI Whisper
- Geração de resumos estruturados em formato ATA com GPT-4o-mini
- Armazenamento PostgreSQL
- Ambiente Docker completo
- Documentação abrangente

### 🔧 Alterado
- Interface do dashboard reformulada em estilo minimalista
- Paleta de cores simplificada (preto/branco/cinza)
- Melhor organização do código frontend
- Otimização de chamadas à API

### 🐛 Corrigido
- Dialog de detalhes com renderização duplicada
- Handlers faltantes em componentes Dialog
- Formatação de datas em exportações PDF
- Emojis causando problemas em PDFs
- Campo tags não aparecendo no retorno da API
- Comunicação frontend-backend para tags (query params → JSON body)

### 🔒 Segurança
- Chaves API protegidas por variáveis de ambiente
- Containers com usuários não-root
- Validação de tipos com Pydantic
- Sanitização de dados em exportações

### 📚 Documentação
- README atualizado com todas as funcionalidades
- Badges de versão e licença
- Seção de Dashboard Features detalhada
- Instruções de uso completas
- Troubleshooting expandido

---

## Tipos de Mudanças

- `Adicionado` para novas funcionalidades
- `Alterado` para mudanças em funcionalidades existentes
- `Descontinuado` para funcionalidades que serão removidas
- `Removido` para funcionalidades removidas
- `Corrigido` para correção de bugs
- `Segurança` para vulnerabilidades

---

**Data de Release**: 03 de Outubro de 2025  
**Desenvolvido por**: Victor G. Haddad
