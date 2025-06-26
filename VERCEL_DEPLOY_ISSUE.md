# Erro 500 no Vercel - Diagnóstico e Solução

## Problema Identificado

As APIs estão retornando erro 500 (Internal Server Error) no ambiente de produção do Vercel, mas funcionam corretamente no ambiente local. Isso indica um problema com a configuração do ambiente de produção.

## Causas Prováveis

### 1. **Variáveis de Ambiente Ausentes ou Incorretas**
O código utiliza as seguintes variáveis de ambiente que devem estar configuradas no Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
```

### 2. **Configuração do Supabase**
- RLS (Row Level Security) pode estar causando problemas
- Políticas de segurança do banco de dados podem estar bloqueando as operações

## Soluções

### Passo 1: Configurar Variáveis de Ambiente no Vercel

1. Acesse o dashboard do Vercel
2. Vá para o projeto "orcamento"
3. Navegue até Settings > Environment Variables
4. Adicione as seguintes variáveis:

**NEXT_PUBLIC_SUPABASE_URL**
- Value: [URL do seu projeto Supabase]
- Environment: Production, Preview, Development

**SUPABASE_SERVICE_ROLE_KEY**
- Value: [Service Role Key do Supabase]
- Environment: Production, Preview, Development

### Passo 2: Verificar Configuração do Supabase

#### No Dashboard do Supabase:
1. Vá para Settings > API
2. Copie a "URL" para `NEXT_PUBLIC_SUPABASE_URL`
3. Copie a "service_role" key para `SUPABASE_SERVICE_ROLE_KEY`

#### Verificar RLS (Row Level Security):
- Certifique-se de que as políticas estão configuradas corretamente
- O código usa `supabaseAdmin` que deveria ignorar RLS, mas verifique se as tabelas têm as políticas corretas

### Passo 3: Logs de Debug

Para diagnosticar melhor, adicione logs temporários nas APIs. O código já tem alguns `console.log` que podem ajudar.

### Passo 4: Redeployar

Após configurar as variáveis de ambiente:
1. Force um novo deploy no Vercel
2. Ou rode `git commit --allow-empty -m "Force redeploy" && git push`

## Verificações Adicionais

### 1. **Verificar se as tabelas existem no Supabase**
- `produtos`
- `dependencias_produtos`
- `processos_fabricacao`
- `mao_de_obra`
- `pedidos`
- `processos_pedidos`
- `mao_de_obra_pedidos`

### 2. **Verificar permissões de RLS**
As políticas devem permitir operações para usuários autenticados.

### 3. **Testar uma API simples**
Crie uma rota de teste para verificar se o problema é específico ou geral:

```typescript
// src/app/api/test/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    return NextResponse.json({ 
      message: 'API funcionando',
      env: {
        supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        serviceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

## Logs do Vercel

Para ver os logs detalhados do erro:
1. Vá para o dashboard do Vercel
2. Acesse Functions > View Function Logs
3. Procure por erros relacionados às suas APIs

## Próximos Passos

1. **URGENTE**: Configurar as variáveis de ambiente no Vercel
2. Verificar logs do Vercel para erros específicos
3. Testar as APIs individualmente após o redeploy
4. Se o problema persistir, verificar as configurações do Supabase

## Comando de Emergência

Se precisar debuggar rapidamente, adicione esta rota temporária:

```typescript
// src/app/api/debug/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    env: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
    }
  });
}
```

Acesse `https://orcamento-dcwv.vercel.app/api/debug` para verificar se as variáveis estão sendo carregadas. 