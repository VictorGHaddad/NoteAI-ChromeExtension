#!/bin/bash
# Script de Setup - Meeting AI by P&D
# Execute este script para configurar o sistema rapidamente

set -e  # Para na primeira erro

echo "🚀 Meeting AI by P&D - Setup Script"
echo "===================================="
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Função para imprimir mensagens
print_step() {
    echo -e "${GREEN}[PASSO $1]${NC} $2"
}

print_warning() {
    echo -e "${YELLOW}[AVISO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERRO]${NC} $1"
}

# Verificar se está no diretório correto
if [ ! -f "docker-compose.yml" ]; then
    print_error "Execute este script na raiz do projeto!"
    exit 1
fi

# Passo 1: Verificar se .env existe
print_step "1" "Verificando arquivo .env..."
if [ ! -f ".env" ]; then
    print_warning "Arquivo .env não encontrado. Criando a partir do .env.example..."
    cp .env.example .env
    print_warning "IMPORTANTE: Edite o .env e adicione SECRET_KEY e OPENAI_API_KEY!"
    echo ""
    read -p "Pressione ENTER para continuar (depois de editar .env)..."
else
    echo "✓ Arquivo .env encontrado"
fi

# Verificar SECRET_KEY
if ! grep -q "SECRET_KEY=your-secret-key" .env 2>/dev/null; then
    echo "✓ SECRET_KEY configurada"
else
    print_warning "SECRET_KEY ainda está com valor padrão!"
    echo "Gerando SECRET_KEY automaticamente..."
    SECRET=$(python3 -c "import secrets; print(secrets.token_urlsafe(32))")
    sed -i "s/SECRET_KEY=your-secret-key.*/SECRET_KEY=$SECRET/" .env
    echo "✓ SECRET_KEY gerada: $SECRET"
fi

echo ""

# Passo 2: Build dos containers
print_step "2" "Fazendo build dos containers..."
docker-compose build

echo ""

# Passo 3: Iniciar serviços
print_step "3" "Iniciando serviços..."
docker-compose up -d

echo ""

# Passo 4: Aguardar banco de dados estar pronto
print_step "4" "Aguardando banco de dados inicializar..."
sleep 10

# Verificar se banco está pronto
for i in {1..30}; do
    if docker exec meeting-ai-db pg_isready -U postgres > /dev/null 2>&1; then
        echo "✓ Banco de dados pronto!"
        break
    fi
    echo "Aguardando... ($i/30)"
    sleep 2
done

echo ""

# Passo 5: Executar migração
print_step "5" "Executando migração do banco de dados..."
if docker exec -i meeting-ai-db psql -U postgres -d audio_transcriber < backend/migrations/add_users_table.sql 2>&1 | grep -q "ERROR"; then
    print_warning "Migração pode já ter sido executada ou houve erro. Continuando..."
else
    echo "✓ Migração executada com sucesso!"
fi

echo ""

# Passo 6: Criar usuário admin (opcional)
print_step "6" "Deseja criar um usuário admin? (s/n)"
read -r CREATE_ADMIN

if [ "$CREATE_ADMIN" = "s" ] || [ "$CREATE_ADMIN" = "S" ]; then
    echo "Criando usuário admin..."
    docker exec -i meeting-ai-db psql -U postgres -d audio_transcriber <<EOF
INSERT INTO users (email, name, hashed_password, is_active) 
VALUES (
    'admin@ccm.com',
    'Administrador CCM',
    '\$2b\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5/0VRAVqH.9va',
    TRUE
) ON CONFLICT (email) DO NOTHING;
EOF
    echo ""
    echo "✓ Usuário admin criado!"
    echo "  Email: admin@ccm.com"
    echo "  Senha: admin123"
    echo "  ${RED}IMPORTANTE: Altere a senha após primeiro login!${NC}"
fi

echo ""

# Passo 7: Preparar extensão
print_step "7" "Deseja ativar a nova extensão com autenticação? (s/n)"
read -r ACTIVATE_EXTENSION

if [ "$ACTIVATE_EXTENSION" = "s" ] || [ "$ACTIVATE_EXTENSION" = "S" ]; then
    cd extension
    
    # Backup dos arquivos originais
    if [ ! -f "popup-old-backup.html" ]; then
        echo "Fazendo backup dos arquivos originais..."
        cp popup.html popup-old-backup.html
        cp popup.js popup-old-backup.js
    fi
    
    # Ativar novos arquivos
    cp popup-new.html popup.html
    cp popup-auth.js popup.js
    
    cd ..
    echo "✓ Extensão atualizada!"
    echo "  Recarregue a extensão no Chrome (chrome://extensions/)"
fi

echo ""

# Passo 8: Verificar se tudo está rodando
print_step "8" "Verificando serviços..."

# Verificar backend
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✓ Backend rodando em http://localhost:8000"
else
    print_warning "Backend não está respondendo"
fi

# Verificar dashboard
if curl -s http://localhost:3000 > /dev/null; then
    echo "✓ Dashboard rodando em http://localhost:3000"
else
    print_warning "Dashboard não está respondendo"
fi

# Verificar banco
if docker exec meeting-ai-db pg_isready -U postgres > /dev/null 2>&1; then
    echo "✓ PostgreSQL rodando"
else
    print_warning "PostgreSQL não está respondendo"
fi

echo ""
echo "============================================"
echo "🎉 Setup concluído!"
echo "============================================"
echo ""
echo "📋 Próximos passos:"
echo ""
echo "1. Acesse o backend: http://localhost:8000/docs"
echo "2. Acesse o dashboard: http://localhost:3000"
echo "3. Instale a extensão Chrome:"
echo "   - Abra chrome://extensions/"
echo "   - Ative 'Modo desenvolvedor'"
echo "   - Clique 'Carregar sem compactação'"
echo "   - Selecione a pasta 'extension'"
echo ""
echo "🧪 Para testar:"
echo ""
echo "# Registrar usuário"
echo "curl -X POST http://localhost:8000/api/auth/register \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"email\":\"teste@ccm.com\",\"name\":\"Teste\",\"password\":\"senha123456\"}'"
echo ""
echo "# Login"
echo "curl -X POST http://localhost:8000/api/auth/login \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"email\":\"teste@ccm.com\",\"password\":\"senha123456\"}'"
echo ""
echo "📚 Documentação:"
echo "  - IMPLEMENTATION-SUMMARY.md - Resumo completo"
echo "  - TESTING-GUIDE.md - Guia de testes"
echo "  - MIGRATION-NOTES.md - Notas técnicas"
echo ""
echo "📊 Ver logs:"
echo "  docker-compose logs -f backend"
echo ""
echo "✨ Desenvolvido para CCM Tecnologia"
echo ""