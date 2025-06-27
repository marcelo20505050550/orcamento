import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Rota de teste simples para debug de autenticação
 * GET: Testa com autenticação (se token for fornecido)
 * POST: Testa sem autenticação (sempre funciona)
 */

export async function GET(req: NextRequest) {
  try {
    console.log('🔐 [AUTH-TEST] Starting simple auth test');
    
    // Obtém informações do cabeçalho
    const authHeader = req.headers.get('authorization');
    const userAgent = req.headers.get('user-agent');
    const contentType = req.headers.get('content-type');
    
    console.log('🔐 [AUTH-TEST] Headers info:', {
      hasAuth: !!authHeader,
      authType: authHeader?.split(' ')[0] || 'none',
      userAgent: userAgent?.substring(0, 50) || 'none'
    });

    // Se não há cabeçalho de autorização, retorna info básica
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({
        status: 'No authentication provided',
        headers: {
          authorization: authHeader || 'missing',
          userAgent: userAgent || 'missing',
          contentType: contentType || 'missing'
        },
        suggestion: 'Send Authorization: Bearer <token> header to test authentication',
        timestamp: new Date().toISOString()
      });
    }

    // Tenta validar o token
    const token = authHeader.split(' ')[1];
    console.log('🔐 [AUTH-TEST] Token info:', {
      length: token?.length || 0,
      prefix: token?.substring(0, 10) || 'empty'
    });

    // Verifica variáveis de ambiente
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('🔐 [AUTH-TEST] Missing environment variables');
      return NextResponse.json({
        error: 'Server configuration error',
        details: 'Missing Supabase environment variables'
      }, { status: 500 });
    }

    // Cria cliente Supabase
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // Valida o token
    const { data, error } = await supabase.auth.getUser(token);

    console.log('🔐 [AUTH-TEST] Token validation result:', {
      hasUser: !!data?.user,
      hasError: !!error,
      errorCode: error?.status,
      errorMessage: error?.message
    });

    if (error || !data.user) {
      return NextResponse.json({
        status: 'Authentication failed',
        error: error?.message || 'Invalid token',
        tokenInfo: {
          length: token.length,
          prefix: token.substring(0, 10) + '...'
        },
        supabaseError: error
      }, { status: 401 });
    }

    // Sucesso na autenticação
    return NextResponse.json({
      status: 'Authentication successful',
      user: {
        id: data.user.id,
        email: data.user.email,
        metadata: data.user.user_metadata
      },
      tokenInfo: {
        length: token.length,
        isValid: true
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('🔐 [AUTH-TEST] Exception:', error);
    return NextResponse.json({
      error: 'Authentication test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('🔓 [AUTH-TEST] Starting unprotected test');
    
    return NextResponse.json({
      status: 'Unprotected route test successful',
      message: 'This route works without authentication',
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercel: process.env.VERCEL,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('🔓 [AUTH-TEST] Exception:', error);
    return NextResponse.json({
      error: 'Unprotected test failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 