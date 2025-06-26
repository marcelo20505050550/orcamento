/**
 * Middleware para proteção e autenticação de rotas da API
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logError } from '@/utils/logger';

// Função para verificar se o usuário está autenticado
export async function authMiddleware(req: NextRequest) {
  try {
    // Cria um cliente Supabase para verificação do token usando a service role key
    // que tem permissões mais amplas para operações de autenticação
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    // Obtém o token do cabeçalho de autorização
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { status: 401 }
      );
    }

    // Extrai e verifica o token
    const token = authHeader.split(' ')[1];
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      console.error('Erro de autenticação:', error);
      return NextResponse.json(
        { error: 'Token de autenticação inválido ou expirado' },
        { status: 401 }
      );
    }

    // O usuário está autenticado, continua para o próximo handler
    return null;
  } catch (error) {
    logError('Erro no middleware de autenticação', error);
    return NextResponse.json(
      { error: 'Erro ao processar autenticação' },
      { status: 500 }
    );
  }
}

// Middleware para lidar com erros em rotas da API
export function errorHandlerMiddleware(handler: Function) {
  return async (req: NextRequest, ...args: any[]) => {
    try {
      return await handler(req, ...args);
    } catch (error) {
      logError('Erro não tratado na API', error);
      return NextResponse.json(
        {
          error: 'Ocorreu um erro ao processar a requisição',
          message: error instanceof Error ? error.message : 'Erro desconhecido',
        },
        { status: 500 }
      );
    }
  };
}

// Helper para proteger rotas que exigem autenticação
export function withAuth(handler: Function) {
  return async (req: NextRequest, context: any) => {
    // Verifica autenticação
    const authResponse = await authMiddleware(req);
    if (authResponse) {
      return authResponse; // Retorna resposta de erro de autenticação
    }
    
    // Passa o contexto original (que contém params) para o handler
    // Isso garante que o objeto params seja passado corretamente para rotas dinâmicas
    return errorHandlerMiddleware(handler)(req, context);
  };
} 