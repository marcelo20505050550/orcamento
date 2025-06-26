import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    console.log(' [DEPS-TEST] Starting dependencies test route');
    
    // Testa consulta simples sem autenticação
    const { data, error, count } = await supabaseAdmin
      .from('dependencias_produtos')
      .select('*', { count: 'exact' })
      .limit(5);
    
    console.log(' [DEPS-TEST] Query result:', { 
      dataLength: data?.length || 0, 
      count, 
      hasError: !!error 
    });
    
    if (error) {
      console.error(' [DEPS-TEST] Database error:', error);
      return NextResponse.json({
        error: 'Database query failed',
        message: error.message,
        details: error
      }, { status: 500 });
    }
    
    return NextResponse.json({
      status: 'Dependencies test successful',
      data: data || [],
      count: count || 0,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error(' [DEPS-TEST] Exception:', error);
    return NextResponse.json({
      error: 'Dependencies test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack'
    }, { status: 500 });
  }
}
