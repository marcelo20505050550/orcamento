/**
 * API para gerenciamento de orçamentos
 * Endpoint para gerar orçamento detalhado (US-008)
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/server';
import { withAuth } from '../middleware';
import { logError, logInfo } from '@/utils/logger';
import { gerarOrcamentoCompleto } from '@/utils/calculadora';

/**
 * GET /api/orcamentos
 * Gera um orçamento detalhado para um pedido (US-008)
 */
export const GET = withAuth(async (req: NextRequest) => {
  try {
    // Obtém o ID do pedido como parâmetro de query
    const url = new URL(req.url);
    const pedidoId = url.searchParams.get('pedido_id');
    
    // Verifica se o ID do pedido foi fornecido
    if (!pedidoId) {
      return NextResponse.json(
        { error: 'ID do pedido não fornecido. Use o parâmetro pedido_id.' },
        { status: 400 }
      );
    }
    
    // Obtém o usuário atual a partir do token
    const authHeader = req.headers.get('authorization')!;
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Erro ao identificar o usuário' },
        { status: 401 }
      );
    }
    
    // Verifica se o pedido existe e pertence ao usuário atual
    const { data: pedido, error: pedidoError } = await supabaseAdmin
      .from('pedidos')
      .select('id, status')
      .eq('id', pedidoId)
      .eq('user_id', user.id)
      .single();
      
    if (pedidoError || !pedido) {
      return NextResponse.json(
        { error: 'Pedido não encontrado ou não pertence ao usuário atual' },
        { status: 404 }
      );
    }
    
    // Usa a nova implementação para gerar o orçamento detalhado
    try {
      const orcamento = await gerarOrcamentoCompleto(pedidoId);
      
      logInfo(`Orçamento detalhado gerado com sucesso para o pedido ${pedidoId}`);
      
      return NextResponse.json({
        data: orcamento
      });
    } catch (orcamentoError) {
      logError(`Erro ao gerar orçamento para o pedido ${pedidoId}`, orcamentoError);
      return NextResponse.json(
        { error: 'Erro ao gerar orçamento detalhado' },
        { status: 500 }
      );
    }
  } catch (error) {
    logError('Erro não tratado ao gerar orçamento detalhado', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
}); 