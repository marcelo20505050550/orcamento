/**
 * Middleware para proteção e autenticação de rotas da API - Versão corrigida para Vercel
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Função simplificada de logging para produção
const logError = (message: string, error: any) => {
  console.error(message, error instanceof Error ? error.message : error);
};

// Função para verificar se o usuário está autenticado
export async function authMiddleware(req: NextRequest) {
  try {
    // Verifica variáveis de ambiente
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json(
        { error: 'Configuração do servidor incompleta' },
        { status: 500 }
      );
    }

    // Cria um cliente Supabase para verificação do token
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

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
    
    if (!token || token.trim() === '') {
      return NextResponse.json(
        { error: 'Token de autenticação vazio' },
        { status: 401 }
      );
    }

    // Verifica o token com o Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return NextResponse.json(
        { error: 'Token de autenticação inválido ou expirado' },
        { status: 401 }
      );
    }

    // Token válido, continua
    return null;
  } catch (error) {
    logError('Erro no middleware de autenticação', error);
    return NextResponse.json(
      { error: 'Erro ao processar autenticação' },
      { status: 500 }
    );
  }
}

// Tipo para os handlers de rota
type RouteHandler = (req: NextRequest, context?: { params?: Promise<Record<string, string>> }) => Promise<NextResponse>;

// Middleware para lidar com erros em rotas da API
export function errorHandlerMiddleware(handler: RouteHandler) {
  return async (req: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    try {
      return await handler(req, context);
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
export function withAuth(handler: RouteHandler) {
  return async (req: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    // Verifica autenticação
    const authResponse = await authMiddleware(req);
    if (authResponse) {
      return authResponse; // Retorna resposta de erro de autenticação
    }
    
    // Passa o contexto original (que contém params) para o handler
    return errorHandlerMiddleware(handler)(req, context);
  };
}
