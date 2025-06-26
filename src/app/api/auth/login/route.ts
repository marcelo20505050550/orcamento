/**
 * API para autenticação de usuários (login)
 */
import { NextRequest, NextResponse } from 'next/server';
import { loginWithEmail } from '@/lib/supabase/auth';
import { errorHandlerMiddleware } from '../../middleware';
import { logError, logInfo } from '@/utils/logger';

async function handler(req: NextRequest) {
  // Verifica se a requisição é do tipo POST
  if (req.method !== 'POST') {
    return NextResponse.json(
      { error: 'Método não permitido' },
      { status: 405 }
    );
  }

  try {
    // Extrai credenciais do corpo da requisição
    const { email, password } = await req.json();

    // Valida os dados de entrada
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Tenta realizar o login
    const { user, session, error } = await loginWithEmail({ email, password });

    // Verifica se houve erro na autenticação
    if (error) {
      logError('Erro durante o login', error);
      return NextResponse.json(
        { error: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // Se a autenticação foi bem-sucedida, retorna os dados do usuário e sessão
    logInfo('Login bem-sucedido', { userId: user?.id });
    return NextResponse.json({
      user,
      session,
    });
  } catch (error) {
    logError('Erro inesperado no login', error);
    return NextResponse.json(
      { error: 'Erro ao processar a requisição de login' },
      { status: 500 }
    );
  }
}

// Exporta o handler com o middleware de tratamento de erros
export const POST = errorHandlerMiddleware(handler); 