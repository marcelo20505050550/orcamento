/**
 * API para gerenciamento de um processo específico de um pedido
 * Endpoints para atualizar e remover um processo de um pedido
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/server';
import { withAuth } from '../../../middleware';
import { logError, logInfo } from '@/utils/logger';
import { StatusPedido } from '@/types';

// Interfaces para os tipos de dados retornados
interface PedidoInfo {
  id: string;
  status: string;
  user_id: string;
}

interface ProcessoPedidoData {
  id: string;
  pedido_id: string;
  processo_id: string;
  quantidade: number;
  pedido: PedidoInfo;
}

interface ProcessoDetalhe {
  processo_id: string;
  processo: {
    nome: string;
  };
}

// Função auxiliar para verificar se o processo do pedido existe e pertence ao usuário
async function verificarProcessoDoPedidoDoUsuario(id: string, userId: string) {
  console.log(`[DEBUG] Verificando processo ${id} para usuário ${userId}`);
  
  const { data, error } = await supabaseAdmin
    .from('processos_pedidos')
    .select(`
      id,
      pedido_id,
      processo_id,
      quantidade,
      pedido:pedidos!processos_pedidos_pedido_id_fkey(id, status, user_id)
    `)
    .eq('id', id)
    .maybeSingle();
    
  console.log(`[DEBUG] Resultado da consulta:`, { data, error });
    
  if (error) {
    logError(`Erro ao verificar processo de pedido ${id}`, error);
    throw new Error('Erro ao verificar processo de pedido');
  }
  
  // Verifica se os dados existem
  if (!data) {
    console.log(`[DEBUG] Processo ${id} não encontrado`);
    return null;
  }
  
  // Verifica se o pedido existe - pode ser array ou objeto
  const pedido = Array.isArray(data.pedido) ? data.pedido[0] : data.pedido;
  
  console.log(`[DEBUG] Pedido encontrado:`, pedido);
  
  if (!pedido || pedido.user_id !== userId) {
    console.log(`[DEBUG] Pedido não pertence ao usuário. Pedido user_id: ${pedido?.user_id}, Usuario atual: ${userId}`);
    return null;
  }
  
  console.log(`[DEBUG] Processo válido encontrado`);
  
  return {
    id: data.id,
    pedido_id: data.pedido_id,
    processo_id: data.processo_id,
    quantidade: data.quantidade,
    status_pedido: pedido.status
  };
}

/**
 * PUT /api/pedidos/processos/[id]
 * Atualiza a quantidade de um processo associado a um pedido
 */
export const PUT = withAuth(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    // Aguarda o parâmetro id de forma assíncrona
    const { id } = await params;
    
    // Verifica se o ID é válido
    if (!id) {
      return NextResponse.json(
        { error: 'ID do processo de pedido não fornecido' },
        { status: 400 }
      );
    }
    
    // Parse do corpo da requisição
    const body = await req.json();
    
    // Validação dos campos obrigatórios
    if (!body.quantidade || body.quantidade <= 0) {
      return NextResponse.json(
        { error: 'Quantidade deve ser um valor positivo' },
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
    
    // Verifica se o processo de pedido existe e pertence ao usuário
    const processoDoPedido = await verificarProcessoDoPedidoDoUsuario(id, user.id);
    
    if (!processoDoPedido) {
      return NextResponse.json(
        { error: 'Processo de pedido não encontrado ou não pertence ao usuário atual' },
        { status: 404 }
      );
    }
    
    // Não permitir atualizar processos de pedidos finalizados ou cancelados
    if (processoDoPedido.status_pedido === StatusPedido.FINALIZADO || 
        processoDoPedido.status_pedido === StatusPedido.CANCELADO) {
      return NextResponse.json(
        { error: `Não é possível atualizar processos de pedido com status "${processoDoPedido.status_pedido}"` },
        { status: 409 }
      );
    }
    
    // Atualiza a quantidade do processo
    const { data, error } = await supabaseAdmin
      .from('processos_pedidos')
      .update({ quantidade: body.quantidade })
      .eq('id', id)
      .select(`
        *,
        processo:processos_fabricacao(*)
      `)
      .single();
      
    if (error) {
      logError(`Erro ao atualizar processo de pedido com ID ${id}`, error);
      return NextResponse.json(
        { error: 'Erro ao atualizar processo de pedido' },
        { status: 500 }
      );
    }
    
    logInfo(`Processo de pedido ${id} atualizado com sucesso`, { 
      quantidade_anterior: processoDoPedido.quantidade, 
      quantidade_nova: body.quantidade 
    });
    
    return NextResponse.json({
      message: 'Processo de pedido atualizado com sucesso',
      data
    });
  } catch (error) {
    logError('Erro não tratado ao atualizar processo de pedido', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/pedidos/processos/[id]
 * Remove um processo associado a um pedido
 */
export const DELETE = withAuth(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    // Aguarda o parâmetro id de forma assíncrona
    const { id } = await params;
    
    // Verifica se o ID é válido
    if (!id) {
      return NextResponse.json(
        { error: 'ID do processo de pedido não fornecido' },
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
    
    // Verifica se o processo de pedido existe e pertence ao usuário
    const processoDoPedido = await verificarProcessoDoPedidoDoUsuario(id, user.id);
    
    if (!processoDoPedido) {
      return NextResponse.json(
        { error: 'Processo de pedido não encontrado ou não pertence ao usuário atual' },
        { status: 404 }
      );
    }
    
    // Não permitir remover processos de pedidos finalizados ou cancelados
    if (processoDoPedido.status_pedido === StatusPedido.FINALIZADO || 
        processoDoPedido.status_pedido === StatusPedido.CANCELADO) {
      return NextResponse.json(
        { error: `Não é possível remover processos de pedido com status "${processoDoPedido.status_pedido}"` },
        { status: 409 }
      );
    }
    
    // Obter os detalhes do processo antes de excluir (para logging)
    const { data: processoDetalhes } = await supabaseAdmin
      .from('processos_pedidos')
      .select(`
        processo_id,
        processo:processos_fabricacao(nome)
      `)
      .eq('id', id)
      .single();
    
    // Remove o processo do pedido
    const { error } = await supabaseAdmin
      .from('processos_pedidos')
      .delete()
      .eq('id', id);
      
    if (error) {
      logError(`Erro ao remover processo de pedido com ID ${id}`, error);
      return NextResponse.json(
        { error: 'Erro ao remover processo de pedido' },
        { status: 500 }
      );
    }
    
    // Obtém o nome do processo de forma segura, considerando a estrutura real dos dados
    const nomeProcesso = processoDetalhes?.processo?.[0]?.nome || 'desconhecido';
    
    logInfo(`Processo de pedido ${id} removido com sucesso`, {
      processo: nomeProcesso,
      pedido_id: processoDoPedido.pedido_id
    });
    
    return NextResponse.json({
      message: 'Processo removido do pedido com sucesso'
    });
  } catch (error) {
    logError('Erro não tratado ao remover processo de pedido', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
}); 