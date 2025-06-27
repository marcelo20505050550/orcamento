/**
 * Cliente Supabase para uso exclusivo no servidor
 * Usa a service role key para ter acesso completo ao banco de dados sem restrições RLS
 */
import { createClient } from '@supabase/supabase-js';

// Verifica se as variáveis de ambiente necessárias estão disponíveis
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('🚨 [SUPABASE-SERVER] Missing required environment variables:', {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceKey,
    nodeEnv: process.env.NODE_ENV
  });
  throw new Error('Missing Supabase environment variables');
}

console.log('✅ [SUPABASE-SERVER] Environment variables loaded successfully');

// Cria um cliente Supabase com a service role key (apenas para uso no servidor)
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
); 