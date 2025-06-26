/**
 * Este arquivo configura a conexão com o Supabase, nosso banco de dados e backend principal.
 * Ele permite interagir com o banco de dados, autenticação e outras funcionalidades.
 */
import { createClient } from '@supabase/supabase-js';

// Variáveis de ambiente necessárias para conexão com o Supabase
// Essas variáveis serão definidas no arquivo .env.local ou em variáveis de ambiente do ambiente de execução
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Verifica se as variáveis de ambiente estão definidas
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('As variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY precisam estar configuradas');
}

// Cria e exporta o cliente Supabase para uso em toda a aplicação
// Adicionando configurações de persistência para garantir que a sessão seja corretamente armazenada
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Persistir a sessão no localStorage
    autoRefreshToken: true, // Atualizar automaticamente o token quando necessário
    detectSessionInUrl: true, // Detectar sessão na URL (para autenticação social)
    storageKey: 'orcamentos-auth-token', // Chave personalizada para armazenamento
  }
});

// Função helper para verificar se a conexão com o Supabase está funcionando
export async function checkSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('produtos').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('Erro ao conectar com o Supabase:', error.message);
      return false;
    }
    
    console.log('Conexão com o Supabase estabelecida com sucesso!');
    return true;
  } catch (err) {
    console.error('Exceção ao conectar com o Supabase:', err);
    return false;
  }
}

// Exporta por padrão o cliente Supabase
export default supabase; 