import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    console.log('🧪 [PRODUTOS-TEST] Starting produtos test route');
    
    // Testa consulta simples sem autenticação
    const { data, error, count } = await supabaseAdmin
      .from('produtos')
      .select('*', { count: 'exact' })
      .limit(5);
    
    console.log('🧪 [PRODUTOS-TEST] Query result:', { 
      dataLength: data?.length || 0, 
      count, 
      hasError: !!error 
    });
    
    if (error) {
      console.error('🧪 [PRODUTOS-TEST] Database error:', error);
      return NextResponse.json({
        error: 'Database query failed',
        message: error.message,
        details: error
      }, { status: 500 });
    }
    
    return NextResponse.json({
      status: 'Produtos test successful',
      data: data || [],
      count: count || 0,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('🧪 [PRODUTOS-TEST] Exception:', error);
    return NextResponse.json({
      error: 'Produtos test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack'
    }, { status: 500 });
  }
}
