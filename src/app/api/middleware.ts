/**
 * Middleware para proteção e autenticação de rotas da API
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logError, logWarn } from '@/utils/logger';

// Verificações de saúde das variáveis de ambiente
const checkEnvironmentVariables = () => {
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    const errorMsg = `Variáveis de ambiente ausentes: ${missingVars.join(', ')}`;
    logError(errorMsg);
    throw new Error(errorMsg);
  }
};

// Função para verificar se o usuário está autenticado
export async function authMiddleware(req: NextRequest) {
  try {
    // Verifica variáveis de ambiente primeiro
    checkEnvironmentVariables();

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
      logWarn('Tentativa de acesso sem token de autorização');
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { status: 401 }
      );
    }

    // Extrai e verifica o token
    const token = authHeader.split(' ')[1];
    if (!token || token.length < 10) {
      logWarn('Token de autorização inválido ou muito curto');
      return NextResponse.json(
        { error: 'Token de autenticação malformado' },
        { status: 401 }
      );
    }

    const { data, error } = await supabase.auth.getUser(token);

    if (error) {
      logError('Erro na verificação do token', error);
      return NextResponse.json(
        { 
          error: 'Token de autenticação inválido ou expirado',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        },
        { status: 401 }
      );
    }

    if (!data.user) {
      logWarn('Token válido mas usuário não encontrado');
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 401 }
      );
    }

    // O usuário está autenticado, continua para o próximo handler
    return null;
  } catch (error) {
    logError('Erro crítico no middleware de autenticação', error);
    return NextResponse.json(
      { 
        error: 'Erro ao processar autenticação',
        details: process.env.NODE_ENV === 'development' ? 
          (error instanceof Error ? error.message : 'Erro desconhecido') : undefined
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
      // Verifica variáveis de ambiente críticas antes de processar a requisição
      checkEnvironmentVariables();
      
      return await handler(req, context);
    } catch (error) {
      logError('Erro não tratado na API', error);
      
      // Informações mais detalhadas para desenvolvimento
      const isDevelopment = process.env.NODE_ENV === 'development';
      const errorResponse: any = {
        error: 'Ocorreu um erro ao processar a requisição',
      };

      if (isDevelopment) {
        errorResponse.details = error instanceof Error ? error.message : 'Erro desconhecido';
        errorResponse.stack = error instanceof Error ? error.stack : undefined;
      }

      return NextResponse.json(errorResponse, { status: 500 });
    }
  };
}

// Helper para proteger rotas que exigem autenticação
export function withAuth(handler: RouteHandler) {
  return async (req: NextRequest, context?: { params?: Promise<Record<string, string>> }) => {
    try {
      // Verifica autenticação
      const authResponse = await authMiddleware(req);
      if (authResponse) {
        return authResponse; // Retorna resposta de erro de autenticação
      }
      
      // Passa o contexto original (que contém params) para o handler
      // Isso garante que o objeto params seja passado corretamente para rotas dinâmicas
      return errorHandlerMiddleware(handler)(req, context);
    } catch (error) {
      logError('Erro crítico no withAuth', error);
      return NextResponse.json(
        { 
          error: 'Erro crítico na autenticação',
          details: process.env.NODE_ENV === 'development' ? 
            (error instanceof Error ? error.message : 'Erro desconhecido') : undefined
        },
        { status: 500 }
      );
    }
  };
} 