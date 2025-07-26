/**
 * API para gerenciamento de produto específico em pedido
 * Endpoint para remover um produto específico de um pedido
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { supabase } from '@/lib/supabase/client';
import { withAuth } from '../../../middleware';
import { logError, logInfo } from '@/utils/logger';

/**
 * DELETE /api/pedidos/produtos/[id]
 * Remove um produto específico de um pedido
 */
export const DELETE = withAuth(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: produtoPedidoId } = await params;
    
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
    
    // Verifica se o produto do pedido existe e se o pedido pertence ao usuário
    const { data: produtoPedido, error: produtoPedidoError } = await supabaseAdmin
      .from('produtos_pedidos')
      .select(`
        *,
        pedido:pedidos!inner(id, user_id),
        produto:produtos(nome)
      `)
      .eq('id', produtoPedidoId)
      .eq('pedido.user_id', user.id)
      .maybeSingle();
      
    if (produtoPedidoError) {
      logError('Erro ao verificar produto do pedido', produtoPedidoError);
      return NextResponse.json(
        { error: 'Erro ao verificar produto do pedido' },
        { status: 500 }
      );
    }
    
    if (!produtoPedido) {
      return NextResponse.json(
        { error: 'Produto do pedido não encontrado' },
        { status: 404 }
      );
    }
    
    // Remove o produto do pedido
    const { error } = await supabaseAdmin
      .from('produtos_pedidos')
      .delete()
      .eq('id', produtoPedidoId);
      
    if (error) {
      logError('Erro ao remover produto do pedido', error);
      return NextResponse.json(
        { error: 'Erro ao remover produto do pedido' },
        { status: 500 }
      );
    }
    
    logInfo(`Produto ${produtoPedido.produto?.nome} removido do pedido ${produtoPedido.pedido_id}`, { 
      produto_pedido_id: produtoPedidoId,
      pedido_id: produtoPedido.pedido_id
    });
    
    return NextResponse.json(
      { message: 'Produto removido do pedido com sucesso' },
      { status: 200 }
    );
  } catch (error) {
    logError('Erro não tratado ao remover produto do pedido', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
});