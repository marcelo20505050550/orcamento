/**
 * Rota de teste para verificar se a API de produtos está funcionando
 * Esta rota não requer autenticação para facilitar o debug
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    console.log('🧪 [PRODUTOS-TEST] Iniciando teste da API de produtos...');
    
    // Verificar variáveis de ambiente
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log('🧪 [PRODUTOS-TEST] Variáveis de ambiente:', {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      urlLength: supabaseUrl?.length || 0,
      serviceKeyLength: supabaseServiceKey?.length || 0
    });
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        error: 'Variáveis de ambiente não configuradas',
        details: {
          hasUrl: !!supabaseUrl,
          hasServiceKey: !!supabaseServiceKey
        }
      }, { status: 500 });
    }
    
    // Testar conexão com o banco
    console.log('🧪 [PRODUTOS-TEST] Testando conexão com o banco...');
    const { data: produtos, error, count } = await supabaseAdmin
      .from('produtos')
      .select('*', { count: 'exact' })
      .limit(5);
      
    if (error) {
      console.error('🧪 [PRODUTOS-TEST] Erro ao consultar produtos:', error);
      return NextResponse.json({
        error: 'Erro ao consultar produtos',
        details: error
      }, { status: 500 });
    }
    
    console.log('🧪 [PRODUTOS-TEST] Produtos encontrados:', produtos?.length || 0);
    
    return NextResponse.json({
      success: true,
      message: 'API de produtos funcionando',
      data: {
        totalProdutos: count || 0,
        produtosAmostra: produtos || [],
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('🧪 [PRODUTOS-TEST] Erro não tratado:', error);
    return NextResponse.json({
      error: 'Erro interno no teste',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}