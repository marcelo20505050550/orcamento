/**
 * API para autenticação de usuários (login)
 */
import { NextRequest, NextResponse } from 'next/server';
import { loginWithEmail } from '@/lib/supabase/auth';
import { logError, logInfo } from '@/utils/logger';

/**
 * POST /api/auth/login
 * Endpoint público para autenticação de usuários
 */
export async function POST(req: NextRequest) {
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