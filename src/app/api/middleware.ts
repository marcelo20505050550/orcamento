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
    console.log('🔐 [AUTH] Starting authentication middleware for:', req.url);
    
    // Verifica variáveis de ambiente
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('🔐 [AUTH] Environment check:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey,
      nodeEnv: process.env.NODE_ENV,
      vercel: process.env.VERCEL
    });
    
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
    
    console.log('🔐 [AUTH] Authorization header check:', {
      hasHeader: !!authHeader,
      startsWithBearer: authHeader?.startsWith('Bearer '),
      headerLength: authHeader?.length || 0
    });
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('🔐 [AUTH] Missing or invalid authorization header');
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { status: 401 }
      );
    }

    // Extrai e verifica o token
    const token = authHeader.split(' ')[1];
    
    console.log('🔐 [AUTH] Token extraction:', {
      hasToken: !!token,
      tokenLength: token?.length || 0,
      tokenPrefix: token?.substring(0, 10) + '...' || 'empty'
    });
    
    if (!token || token.trim() === '') {
      console.error('🔐 [AUTH] Empty or invalid token');
      return NextResponse.json(
        { error: 'Token de autenticação vazio' },
        { status: 401 }
      );
    }

    // Verifica o token com o Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      console.error('🔐 [AUTH] Token verification failed:', {
        hasError: !!error,
        errorMessage: error?.message,
        hasUser: !!data?.user,
        tokenLength: token?.length || 0
      });
      
      return NextResponse.json(
        { 
          error: 'Token de autenticação inválido ou expirado'
        },
        { status: 401 }
      );
    }

    console.log('🔐 [AUTH] Token verification successful for user:', data.user.id);

    // O usuário está autenticado, continua para o próximo handler
    return null;
  } catch (error) {
    logError('Erro no middleware de autenticação', error);
    return NextResponse.json(
      { 
        error: 'Erro ao processar autenticação'
      },
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
