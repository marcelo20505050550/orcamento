# Configuração das Variáveis de Ambiente - EcoDias

Este arquivo contém as instruções para configurar corretamente as variáveis de ambiente do projeto EcoDias.

## Arquivos de Configuração

Você deve criar os seguintes arquivos na raiz do projeto:

### 1. `.env.local` (Desenvolvimento Local)

```env
# Configuração do Supabase
NEXT_PUBLIC_SUPABASE_URL=https://delvfbrkwsuudzunzdlk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlbHZmYnJrd3N1dWR6dW56ZGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTY5MjE5MzIsImV4cCI6MjAzMjQ5NzkzMn0.VQzKpL8kJQHQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ

# Chave de Serviço do Supabase (para operações administrativas)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlbHZmYnJrd3N1dWR6dW56ZGxrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxNjkyMTkzMiwiZXhwIjoyMDMyNDk3OTMyfQ.SERVICE_ROLE_KEY_PLACEHOLDER

# Configuração do Next.js
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-here

# Configuração de Logs
LOG_LEVEL=info
```

### 2. `.env` (Configuração Base)

```env
# Configuração do Supabase (mesmas configurações do .env.local)
NEXT_PUBLIC_SUPABASE_URL=https://delvfbrkwsuudzunzdlk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlbHZmYnJrd3N1dWR6dW56ZGxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTY5MjE5MzIsImV4cCI6MjAzMjQ5NzkzMn0.VQzKpL8kJQHQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQ
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlbHZmYnJrd3N1dWR6dW56ZGxrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxNjkyMTkzMiwiZXhwIjoyMDMyNDk3OTMyfQ.SERVICE_ROLE_KEY_PLACEHOLDER
```

## Instruções de Configuração

### 1. Obter as Chaves do Supabase

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione o projeto `saasorcamento` (ID: delvfbrkwsuudzunzdlk)
3. Vá em **Settings** > **API**
4. Copie as seguintes chaves:
   - **URL**: `https://delvfbrkwsuudzunzdlk.supabase.co`
   - **anon public**: Para `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role**: Para `SUPABASE_SERVICE_ROLE_KEY` (⚠️ **NUNCA** exponha esta chave no frontend)

### 2. Configurar NextAuth

1. Gere uma chave secreta segura:
   ```bash
   openssl rand -base64 32
   ```
2. Use o resultado como valor para `NEXTAUTH_SECRET`

### 3. Verificar Configuração

Após configurar as variáveis, você pode verificar se estão funcionando:

1. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

2. Acesse `http://localhost:3000/test-auth-debug` para verificar a autenticação

3. Verifique os logs no console para confirmar que não há erros de conexão

## Estrutura do Banco de Dados

O projeto utiliza as seguintes tabelas principais:

- **clientes**: Informações dos clientes
- **produtos**: Produtos e matérias-primas
- **processos_fabricacao**: Processos de fabricação
- **mao_de_obra**: Tipos de mão de obra
- **pedidos**: Pedidos de fabricação
- **observacoes_pedidos**: Observações dos pedidos
- **processos_pedidos**: Processos associados aos pedidos
- **mao_de_obra_pedidos**: Mão de obra associada aos pedidos
- **dependencias_produtos**: Dependências entre produtos
- **itens_extras_pedidos**: Itens extras dos pedidos

## Segurança

⚠️ **IMPORTANTE**: 
- Nunca commite arquivos `.env*` no Git
- A chave `SUPABASE_SERVICE_ROLE_KEY` deve ser mantida em segredo
- Use diferentes chaves para desenvolvimento e produção
- Configure as políticas RLS (Row Level Security) no Supabase adequadamente

## Troubleshooting

### Erro de Autenticação
- Verifique se as chaves do Supabase estão corretas
- Confirme se o projeto está ativo no Supabase
- Verifique se as políticas RLS estão configuradas

### Erro de Conexão com Banco
- Confirme se a URL do Supabase está correta
- Verifique se o projeto não foi pausado
- Teste a conexão diretamente no Supabase Dashboard

### Problemas de Carregamento de Dados
- Verifique os logs do navegador (F12)
- Confirme se as tabelas existem no banco
- Teste as APIs diretamente usando ferramentas como Postman

## Contato

Para dúvidas sobre a configuração, consulte a documentação do projeto ou entre em contato com a equipe de desenvolvimento.