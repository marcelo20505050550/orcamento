/**
 * API para registro de novos usuários
 */
import { NextRequest, NextResponse } from 'next/server';
import { registerWithEmail } from '@/lib/supabase/auth';
import { logError, logInfo } from '@/utils/logger';

/**
 * POST /api/auth/register
 * Endpoint público para registro de novos usuários
 */
export async function POST(req: NextRequest) {
  try {
    // Extrai dados do usuário do corpo da requisição
    const { email, password, nome } = await req.json();

    // Valida os dados de entrada
    if (!email || !password || !nome) {
      return NextResponse.json(
        { error: 'Todos os campos são obrigatórios (email, senha e nome)' },
        { status: 400 }
      );
    }

    // Valida o formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Formato de email inválido' },
        { status: 400 }
      );
    }

    // Valida a força da senha
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 8 caracteres' },
        { status: 400 }
      );
    }

    // Tenta registrar o novo usuário
    const { user, session, error } = await registerWithEmail({
      email,
      password,
      nome,
    });

    // Verifica se houve erro no registro
    if (error) {
      logError('Erro durante o registro', error);
      
      // Identifica erros comuns para fornecer mensagens mais claras
      if (error.message.includes('email already')) {
        return NextResponse.json(
          { error: 'Este email já está em uso' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Não foi possível registrar o usuário' },
        { status: 400 }
      );
    }

    // Se o registro foi bem-sucedido, retorna os dados do usuário e sessão
    logInfo('Registro bem-sucedido', { userId: user?.id });
    return NextResponse.json({
      user,
      session,
      message: 'Usuário registrado com sucesso',
    });
  } catch (error) {
    logError('Erro inesperado no registro', error);
    return NextResponse.json(
      { error: 'Erro ao processar a requisição de registro' },
      { status: 500 }
    );
  }
} 