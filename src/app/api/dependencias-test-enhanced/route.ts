import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    console.log('🧪 [DEPENDENCIAS-ENHANCED] Starting enhanced dependencias test');
    console.log('🧪 [DEPENDENCIAS-ENHANCED] URL:', req.url);
    console.log('🧪 [DEPENDENCIAS-ENHANCED] Environment:', {
      nodeEnv: process.env.NODE_ENV,
      vercel: process.env.VERCEL,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });

    // Teste 1: Verificar se consegue conectar com o Supabase
    console.log('🧪 [DEPENDENCIAS-ENHANCED] Test 1: Testing Supabase connection');
    
    // Teste 2: Consulta simples na tabela dependencias_produtos
    console.log('🧪 [DEPENDENCIAS-ENHANCED] Test 2: Querying dependencias_produtos table');
    const { data: dependencias, error: depError, count } = await supabaseAdmin
      .from('dependencias_produtos')
      .select('*', { count: 'exact' })
      .limit(3);
    
    console.log('🧪 [DEPENDENCIAS-ENHANCED] Dependencias query result:', {
      dataLength: dependencias?.length || 0,
      count,
      hasError: !!depError,
      error: depError?.message
    });

    if (depError) {
      console.error('🧪 [DEPENDENCIAS-ENHANCED] Database error:', depError);
      return NextResponse.json({
        error: 'Database query failed',
        message: depError.message,
        test: 'dependencias_produtos',
        details: depError
      }, { status: 500 });
    }

    // Teste 3: Consulta com join (similar à rota real)
    console.log('🧪 [DEPENDENCIAS-ENHANCED] Test 3: Testing complex query with joins');
    const { data: dependenciasJoin, error: joinError } = await supabaseAdmin
      .from('dependencias_produtos')
      .select(`
        *,
        produto_pai:produtos!produto_pai_id(id, nome, preco_unitario, e_materia_prima),
        produto_filho:produtos!produto_filho_id(id, nome, preco_unitario, e_materia_prima)
      `)
      .limit(2);

    console.log('🧪 [DEPENDENCIAS-ENHANCED] Join query result:', {
      dataLength: dependenciasJoin?.length || 0,
      hasError: !!joinError,
      error: joinError?.message
    });

    if (joinError) {
      console.error('🧪 [DEPENDENCIAS-ENHANCED] Join query error:', joinError);
      return NextResponse.json({
        error: 'Join query failed',
        message: joinError.message,
        test: 'dependencias_with_joins',
        details: joinError
      }, { status: 500 });
    }

    // Teste 4: Verificar tabela produtos
    console.log('🧪 [DEPENDENCIAS-ENHANCED] Test 4: Testing produtos table');
    const { data: produtos, error: prodError, count: prodCount } = await supabaseAdmin
      .from('produtos')
      .select('*', { count: 'exact' })
      .limit(2);

    console.log('🧪 [DEPENDENCIAS-ENHANCED] Produtos query result:', {
      dataLength: produtos?.length || 0,
      count: prodCount,
      hasError: !!prodError,
      error: prodError?.message
    });

    return NextResponse.json({
      status: 'Enhanced dependencias test successful',
      tests: {
        dependencias_basic: {
          success: !depError,
          count: count || 0,
          data: dependencias || []
        },
        dependencias_with_joins: {
          success: !joinError,
          count: dependenciasJoin?.length || 0,
          data: dependenciasJoin || []
        },
        produtos_basic: {
          success: !prodError,
          count: prodCount || 0,
          data: produtos || []
        }
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        vercel: process.env.VERCEL
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('🧪 [DEPENDENCIAS-ENHANCED] Exception:', error);
    return NextResponse.json({
      error: 'Enhanced dependencias test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 