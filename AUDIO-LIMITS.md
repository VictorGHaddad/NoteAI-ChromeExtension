# 📊 Limites de Áudio e Storage

## Problemas Comuns

### "Quota Exceeded" ou "File Too Large"

Se você receber erros de quota ou arquivo muito grande ao gravar reuniões longas, ajuste os seguintes limites:

## 🔧 Configurações

### 1. Backend - Tamanho Máximo de Arquivo

**Arquivo:** `.env`

```env
# Para reuniões de até 2 horas (recomendado: 200MB)
MAX_AUDIO_SIZE_MB=200

# Para reuniões mais longas (3-4 horas), use 400MB ou mais
# MAX_AUDIO_SIZE_MB=400
```

**Como funciona:**
- Áudio comprimido WebM: ~1-2MB por minuto
- Reunião de 2 horas: ~120-240MB
- Reunião de 1 hora: ~60-120MB

**Aplicar mudanças:**
```bash
# Reiniciar o backend
docker compose up -d backend
```

### 2. Extensão Chrome - Storage Ilimitado

**Arquivo:** `extension/manifest.json`

A extensão já está configurada com `"unlimitedStorage"` que permite:
- Storage ilimitado para gravações temporárias
- Sem limite de 10MB do chrome.storage.local padrão

```json
{
  "permissions": [
    "unlimitedStorage"  // ✅ Já configurado
  ]
}
```

**Importante:** Após alterar o manifest.json, recarregue a extensão em `chrome://extensions/`

### 3. OpenAI Whisper - Limite da API

A API do Whisper tem limite de **25MB por arquivo**. Para arquivos maiores, o backend automaticamente:

1. **Divide o áudio** em chunks menores
2. **Transcreve cada chunk** separadamente
3. **Concatena os resultados**

Isso é feito automaticamente pelo código, sem configuração adicional.

## 📏 Tamanhos Estimados

| Duração | Formato WebM | Formato MP3 | MAX_AUDIO_SIZE recomendado |
|---------|--------------|-------------|----------------------------|
| 15 min  | 15-30 MB     | 15-25 MB    | 50 MB (padrão ok)         |
| 30 min  | 30-60 MB     | 30-45 MB    | 100 MB                    |
| 1 hora  | 60-120 MB    | 60-90 MB    | 150 MB                    |
| 2 horas | 120-240 MB   | 120-180 MB  | 200-300 MB ✅             |
| 4 horas | 240-480 MB   | 240-360 MB  | 400-500 MB                |

## 🚀 Configuração Rápida para Reuniões Longas

**Passo 1:** Edite `.env`
```bash
cd audio-transcriber
nano .env  # ou use seu editor preferido
```

**Passo 2:** Aumente o limite
```env
MAX_AUDIO_SIZE_MB=200  # ou mais, dependendo da duração
```

**Passo 3:** Reinicie o backend
```bash
docker compose up -d backend
```

**Passo 4:** Teste
```bash
# Verificar o limite aplicado
docker exec audio-transcriber-backend python -c "import os; print(f'Limite: {os.getenv(\"MAX_AUDIO_SIZE_MB\", \"25\")}MB')"
```

## 🐛 Troubleshooting

### Erro: "File too large. Maximum size: 25MB"
✅ **Solução:** Aumente `MAX_AUDIO_SIZE_MB` no `.env`

### Erro: "Quota exceeded" na extensão
✅ **Solução:** A extensão já tem `unlimitedStorage`, mas verifique:
1. A extensão está instalada corretamente?
2. Você recarregou a extensão após atualizar o manifest.json?

### Erro: OpenAI API "file too large"
✅ **Solução:** O backend já divide arquivos automaticamente em chunks de 24MB

### Gravação para antes de terminar
⚠️ **Possíveis causas:**
1. Storage do Chrome cheio (improvável com unlimitedStorage)
2. Timeout de conexão (verifique internet)
3. Tab foi fechada (a gravação para quando a tab fecha)

## 📝 Notas Técnicas

### Chrome Extension Storage
- `chrome.storage.local` padrão: 10MB (não usado para áudio)
- Com `unlimitedStorage`: Ilimitado (só limitado pelo disco)
- Áudio é armazenado temporariamente e deletado após upload

### Backend Processing
- FastAPI `UploadFile` lê todo o arquivo na memória
- Para arquivos muito grandes (>500MB), considere streaming
- PostgreSQL TEXT column suporta até ~1GB de texto

### OpenAI Limits
- Whisper API: 25MB por request
- GPT-4o-mini: 128k tokens de contexto
- Para transcrições muito longas, o resumo pode ser truncado

## 💡 Recomendações

1. **Para uso normal (reuniões 30-60min):** `MAX_AUDIO_SIZE_MB=150`
2. **Para reuniões longas (1-2h):** `MAX_AUDIO_SIZE_MB=200` ✅
3. **Para eventos/webinars (2-4h):** `MAX_AUDIO_SIZE_MB=400`
4. **Extreme (4h+):** `MAX_AUDIO_SIZE_MB=600` (cuidado com custos OpenAI!)

## 💰 Custos OpenAI

| Duração | Tamanho Aprox | Custo Whisper | Custo GPT-4o-mini | Total Estimado |
|---------|---------------|---------------|-------------------|----------------|
| 30 min  | 30-60 MB      | $0.36         | $0.01             | ~$0.37         |
| 1 hora  | 60-120 MB     | $0.72         | $0.02             | ~$0.74         |
| 2 horas | 120-240 MB    | $1.44         | $0.04             | ~$1.48         |
| 4 horas | 240-480 MB    | $2.88         | $0.08             | ~$2.96         |

*Preços baseados em Whisper ($0.006/min) e GPT-4o-mini (~$0.02/resumo)*

---

**Última atualização:** 03/10/2025  
**Versão:** 1.0.2-dev
