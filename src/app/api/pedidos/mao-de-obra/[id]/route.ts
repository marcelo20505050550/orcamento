/**
 * API para gerenciamento de mão de obra específica de um pedido
 * Endpoints para atualizar e remover um tipo de mão de obra de um pedido
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/server';
import { withAuth } from '../../../middleware';
import { logError, logInfo } from '@/utils/logger';
import { StatusPedido } from '@/types';

// Função auxiliar para verificar se a mão de obra do pedido existe e pertence ao usuário
async function verificarMaoDeObraDoPedidoDoUsuario(id: string, userId: string) {
  console.log(`[DEBUG] Verificando mão de obra ${id} para usuário ${userId}`);
  
  const { data, error } = await supabaseAdmin
    .from('mao_de_obra_pedidos')
    .select(`
      id,
      pedido_id,
      mao_de_obra_id,
      horas,
      pedido:pedidos!mao_de_obra_pedidos_pedido_id_fkey(id, status, user_id)
    `)
    .eq('id', id)
    .maybeSingle();
    
  console.log(`[DEBUG] Resultado da consulta mão de obra:`, { data, error });
    
  if (error) {
    logError(`Erro ao verificar mão de obra de pedido ${id}`, error);
    throw new Error('Erro ao verificar mão de obra de pedido');
  }
  
  // Verifica se os dados existem
  if (!data) {
    console.log(`[DEBUG] Mão de obra ${id} não encontrada`);
    return null;
  }
  
  // Verifica se o pedido existe - pode ser array ou objeto
  const pedido = Array.isArray(data.pedido) ? data.pedido[0] : data.pedido;
  
  console.log(`[DEBUG] Pedido encontrado para mão de obra:`, pedido);
  
  if (!pedido || pedido.user_id !== userId) {
    console.log(`[DEBUG] Pedido não pertence ao usuário. Pedido user_id: ${pedido?.user_id}, Usuario atual: ${userId}`);
    return null;
  }
  
  console.log(`[DEBUG] Mão de obra válida encontrada`);
  
  return {
    id: data.id,
    pedido_id: data.pedido_id,
    mao_de_obra_id: data.mao_de_obra_id,
    horas: data.horas,
    status_pedido: pedido.status
  };
}

/**
 * PUT /api/pedidos/mao-de-obra/[id]
 * Atualiza as horas de um tipo de mão de obra associado a um pedido
 */
export const PUT = withAuth(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    // Verifica se o ID é válido
    if (!id) {
      return NextResponse.json(
        { error: 'ID da mão de obra de pedido não fornecido' },
        { status: 400 }
      );
    }
    
    // Parse do corpo da requisição
    const body = await req.json();
    
    // Validação dos campos obrigatórios
    if (!body.horas || body.horas <= 0) {
      return NextResponse.json(
        { error: 'Quantidade de horas deve ser um valor positivo' },
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
    
    // Verifica se a mão de obra de pedido existe e pertence ao usuário
    const maoDeObraDoPedido = await verificarMaoDeObraDoPedidoDoUsuario(id, user.id);
    
    if (!maoDeObraDoPedido) {
      return NextResponse.json(
        { error: 'Mão de obra de pedido não encontrada ou não pertence ao usuário atual' },
        { status: 404 }
      );
    }
    
    // Não permitir atualizar mão de obra de pedidos finalizados ou cancelados
    if (maoDeObraDoPedido.status_pedido === StatusPedido.FINALIZADO || 
        maoDeObraDoPedido.status_pedido === StatusPedido.CANCELADO) {
      return NextResponse.json(
        { error: `Não é possível atualizar mão de obra de pedido com status "${maoDeObraDoPedido.status_pedido}"` },
        { status: 409 }
      );
    }
    
    // Atualiza as horas da mão de obra
    const { data, error } = await supabaseAdmin
      .from('mao_de_obra_pedidos')
      .update({ horas: body.horas })
      .eq('id', id)
      .select(`
        *,
        mao_de_obra:mao_de_obra(*)
      `)
      .single();
      
    if (error) {
      logError(`Erro ao atualizar mão de obra de pedido com ID ${id}`, error);
      return NextResponse.json(
        { error: 'Erro ao atualizar mão de obra de pedido' },
        { status: 500 }
      );
    }
    
    logInfo(`Mão de obra de pedido ${id} atualizada com sucesso`, { 
      horas_anterior: maoDeObraDoPedido.horas, 
      horas_nova: body.horas 
    });
    
    return NextResponse.json({
      message: 'Mão de obra de pedido atualizada com sucesso',
      data
    });
  } catch (error) {
    logError('Erro não tratado ao atualizar mão de obra de pedido', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/pedidos/mao-de-obra/[id]
 * Remove um tipo de mão de obra associado a um pedido
 */
export const DELETE = withAuth(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    // Verifica se o ID é válido
    if (!id) {
      return NextResponse.json(
        { error: 'ID da mão de obra de pedido não fornecido' },
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
    
    // Verifica se a mão de obra de pedido existe e pertence ao usuário
    const maoDeObraDoPedido = await verificarMaoDeObraDoPedidoDoUsuario(id, user.id);
    
    if (!maoDeObraDoPedido) {
      return NextResponse.json(
        { error: 'Mão de obra de pedido não encontrada ou não pertence ao usuário atual' },
        { status: 404 }
      );
    }
    
    // Não permitir remover mão de obra de pedidos finalizados ou cancelados
    if (maoDeObraDoPedido.status_pedido === StatusPedido.FINALIZADO || 
        maoDeObraDoPedido.status_pedido === StatusPedido.CANCELADO) {
      return NextResponse.json(
        { error: `Não é possível remover mão de obra de pedido com status "${maoDeObraDoPedido.status_pedido}"` },
        { status: 409 }
      );
    }
    
    // Obter os detalhes da mão de obra antes de excluir (para logging)
    const { data: maoDeObraDetalhes } = await supabase
      .from('mao_de_obra_pedidos')
      .select(`
        mao_de_obra_id,
        mao_de_obra:mao_de_obra(tipo)
      `)
      .eq('id', id)
      .single();
    
    // Remove a mão de obra do pedido
    const { error } = await supabase
      .from('mao_de_obra_pedidos')
      .delete()
      .eq('id', id);
      
    if (error) {
      logError(`Erro ao remover mão de obra de pedido com ID ${id}`, error);
      return NextResponse.json(
        { error: 'Erro ao remover mão de obra de pedido' },
        { status: 500 }
      );
    }
    
    logInfo(`Mão de obra de pedido ${id} removida com sucesso`, {
      tipo: (maoDeObraDetalhes?.mao_de_obra as any)?.tipo || 'desconhecido',
      pedido_id: maoDeObraDoPedido.pedido_id
    });
    
    return NextResponse.json({
      message: 'Mão de obra removida do pedido com sucesso'
    });
  } catch (error) {
    logError('Erro não tratado ao remover mão de obra de pedido', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
}); 