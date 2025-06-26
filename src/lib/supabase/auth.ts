/**
 * Funções de autenticação utilizando o Supabase Auth
 */
import { supabase } from './client';
import { Session, User, AuthError } from '@supabase/supabase-js';

// Interface para login com email e senha
export interface LoginCredentials {
  email: string;
  password: string;
}

// Interface para registro de novo usuário
export interface RegistrationData extends LoginCredentials {
  nome: string;
}

/**
 * Realiza login com email e senha
 * @param credentials Credenciais de login (email e senha)
 * @returns Objeto contendo o usuário, sessão ou erro
 */
export async function loginWithEmail({ email, password }: LoginCredentials): Promise<{
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return {
    user: data?.user || null,
    session: data?.session || null,
    error,
  };
}

/**
 * Registra um novo usuário com email e senha
 * @param userData Dados do usuário (nome, email e senha)
 * @returns Objeto contendo o usuário, sessão ou erro
 */
export async function registerWithEmail({ email, password, nome }: RegistrationData): Promise<{
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}> {
  // Primeiro, registra o usuário com email e senha
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nome,
      },
    },
  });

  return {
    user: data?.user || null,
    session: data?.session || null,
    error,
  };
}

/**
 * Faz logout do usuário atual
 * @returns Verdadeiro se o logout foi bem-sucedido, falso caso contrário
 */
export async function logout(): Promise<boolean> {
  const { error } = await supabase.auth.signOut();
  return !error;
}

/**
 * Obtém o usuário atual da sessão
 * @returns Objeto contendo o usuário atual ou null se não estiver autenticado
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Obtém a sessão atual
 * @returns Objeto de sessão ou null se não houver sessão ativa
 */
export async function getCurrentSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Verifica se o usuário está autenticado
 * @returns Verdadeiro se o usuário estiver autenticado, falso caso contrário
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getCurrentSession();
  return !!session;
}

/**
 * Inicia o processo de redefinição de senha
 * @param email Email do usuário
 * @returns Verdadeiro se o email foi enviado com sucesso, falso caso contrário
 */
export async function resetPassword(email: string): Promise<boolean> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  return !error;
}

/**
 * Atualiza a senha do usuário (usado após redefinição)
 * @param newPassword Nova senha do usuário
 * @returns Verdadeiro se a senha foi atualizada com sucesso, falso caso contrário
 */
export async function updatePassword(newPassword: string): Promise<boolean> {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return !error;
} 