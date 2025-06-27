import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { withAuth } from '../middleware';

/**
 * Rota de teste protegida que simula o comportamento das rotas reais
 * Usa o middleware withAuth para testar a autenticação
 */
export const GET = withAuth(async (req: NextRequest) => {
  try {
    console.log('🔒 [PROTECTED-TEST] Starting protected route test');
    console.log('🔒 [PROTECTED-TEST] Request URL:', req.url);
    
    // Se chegou até aqui, a autenticação foi bem-sucedida
    console.log('🔒 [PROTECTED-TEST] Authentication successful - proceeding with database operations');
    
    // Teste de consulta simples ao banco
    const { data: produtos, error: prodError, count } = await supabaseAdmin
      .from('produtos')
      .select('*', { count: 'exact' })
      .limit(3);
    
    console.log('🔒 [PROTECTED-TEST] Database query result:', {
      success: !prodError,
      dataLength: produtos?.length || 0,
      count,
      error: prodError?.message
    });
    
    if (prodError) {
      console.error('🔒 [PROTECTED-TEST] Database error:', prodError);
      return NextResponse.json({
        error: 'Database query failed in protected route',
        message: prodError.message,
        details: prodError
      }, { status: 500 });
    }
    
    // Teste de consulta mais complexa (processos)
    const { data: processos, error: procError } = await supabaseAdmin
      .from('processos_fabricacao')
      .select('*')
      .limit(2);
    
    console.log('🔒 [PROTECTED-TEST] Processos query result:', {
      success: !procError,
      dataLength: processos?.length || 0,
      error: procError?.message
    });
    
    return NextResponse.json({
      message: 'Protected route test successful',
      authentication: 'passed',
      databaseTests: {
        produtos: {
          success: !prodError,
          count: count || 0,
          sample: produtos?.slice(0, 1) || []
        },
        processos: {
          success: !procError,
          count: processos?.length || 0,
          sample: processos?.slice(0, 1) || []
        }
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercel: process.env.VERCEL
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('🔒 [PROTECTED-TEST] Exception in protected route:', error);
    return NextResponse.json({
      error: 'Protected route test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});

/**
 * Rota de teste sem autenticação para comparação
 */
export async function POST(req: NextRequest) {
  try {
    console.log('🔓 [UNPROTECTED-TEST] Starting unprotected route test');
    
    // Mesmo teste de banco sem autenticação
    const { data: produtos, error: prodError, count } = await supabaseAdmin
      .from('produtos')
      .select('*', { count: 'exact' })
      .limit(2);
    
    console.log('🔓 [UNPROTECTED-TEST] Database query result:', {
      success: !prodError,
      dataLength: produtos?.length || 0,
      count,
      error: prodError?.message
    });
    
    return NextResponse.json({
      message: 'Unprotected route test successful',
      authentication: 'bypassed',
      databaseTest: {
        success: !prodError,
        count: count || 0,
        sample: produtos?.slice(0, 1) || []
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('🔓 [UNPROTECTED-TEST] Exception:', error);
    return NextResponse.json({
      error: 'Unprotected route test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 