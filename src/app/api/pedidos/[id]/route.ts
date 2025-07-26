/**
 * API para gerenciamento de pedido específico
 * Endpoints para obter detalhes, atualizar status e excluir um pedido
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/server';
import { withAuth } from '../../middleware';
import { logError, logInfo } from '@/utils/logger';
import { StatusPedido } from '@/types';

interface ProcessoPedidoData {
  id: string;
  pedido_id: string;
  processo_id: string;
  quantidade: number;
  processo: {
    id: string;
    nome: string;
    preco_por_unidade: number;
    tempo_estimado_minutos: number;
  };
}

interface MaoDeObraPedidoData {
  id: string;
  pedido_id: string;
  mao_de_obra_id: string;
  horas: number;
  mao_de_obra: {
    id: string;
    tipo: string;
    preco_por_hora: number;
  };
}

// Função auxiliar para verificar se o pedido existe e pertence ao usuário
async function verificarPedidoDoUsuario(id: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from('pedidos')
    .select('id, status')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();
    
  if (error) {
    logError(`Erro ao verificar pedido ${id}`, error);
    throw new Error('Erro ao verificar pedido');
  }
  
  return data;
}

/**
 * GET /api/pedidos/[id]
 * Obtém detalhes de um pedido específico (US-035)
 */
export const GET = withAuth(async (
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    // Aguarda o parâmetro id de forma assíncrona
    const { id } = await params;
    
    // Verifica se o ID é válido
    if (!id) {
      return NextResponse.json(
        { error: 'ID do pedido não fornecido' },
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
    
    // Busca o pedido no banco de dados
    const { data, error } = await supabaseAdmin
      .from('pedidos')
      .select(`
        *,
        produto:produtos(*),
        cliente:clientes(*),
        processos:processos_pedidos(
          *,
          processo:processos_fabricacao(*)
        ),
        mao_de_obra:mao_de_obra_pedidos(
          *,
          mao_de_obra:mao_de_obra(*)
        ),
        historico:historico_status_pedidos(*)
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
      
    if (error) {
      logError(`Erro ao buscar pedido com ID ${id}`, error);
      
      // Verifica se o erro é de registro não encontrado
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Pedido não encontrado ou não pertence ao usuário atual' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Erro ao buscar pedido' },
        { status: 500 }
      );
    }
    
    // Gera um orçamento detalhado para o pedido
    let orcamento = null;
    try {
      const { data: orcamentoData, error: orcamentoError } = await supabaseAdmin
        .rpc('gerar_orcamento_detalhado', { pedido_id: id });
        
      if (!orcamentoError && orcamentoData) {
        orcamento = orcamentoData;
      }
    } catch (orcamentoError) {
      logError(`Erro ao gerar orçamento para pedido ${id}`, orcamentoError);
      // Não retornamos erro aqui, apenas continuamos sem o orçamento
    }
    
    logInfo(`Detalhes do pedido ${id} obtidos com sucesso`);
    
    return NextResponse.json({ 
      data,
      orcamento
    });
  } catch (error) {
    logError('Erro não tratado ao buscar detalhes do pedido', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/pedidos/[id]
 * Atualiza informações de um pedido (US-010)
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
        { error: 'ID do pedido não fornecido' },
        { status: 400 }
      );
    }
    
    // Parse do corpo da requisição
    const body = await req.json();
    
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
    
    // Verifica se o pedido existe e pertence ao usuário
    const pedidoExistente = await verificarPedidoDoUsuario(id, user.id);
    
    if (!pedidoExistente) {
      return NextResponse.json(
        { error: 'Pedido não encontrado ou não pertence ao usuário atual' },
        { status: 404 }
      );
    }
    
    // Prepara os dados para atualização
    const updateData: Partial<{
      status: StatusPedido;
      quantidade: number;
      observacoes: string;
      tem_frete: boolean;
      valor_frete: number;
      margem_lucro_percentual: number;
      impostos_percentual: number;
    }> = {};
    
    // Atualização de status (se fornecido)
    if (body.status !== undefined) {
      // Verifica se o status é válido
      if (!Object.values(StatusPedido).includes(body.status)) {
        return NextResponse.json(
          { error: 'Status inválido. Use: pendente, em_producao, finalizado ou cancelado' },
          { status: 400 }
        );
      }
      updateData.status = body.status;
    }
    
    // Atualização de quantidade (se fornecido)
    if (body.quantidade !== undefined) {
      if (body.quantidade <= 0) {
        return NextResponse.json(
          { error: 'Quantidade deve ser maior que zero' },
          { status: 400 }
        );
      }
      updateData.quantidade = body.quantidade;
    }
    
    // Atualização de observações (se fornecido)
    if (body.observacoes !== undefined) {
      updateData.observacoes = body.observacoes;
    }
    
    // Atualização de frete (se fornecido)
    if (body.tem_frete !== undefined) {
      updateData.tem_frete = Boolean(body.tem_frete);
      
      if (updateData.tem_frete && body.valor_frete !== undefined) {
        if (body.valor_frete < 0) {
          return NextResponse.json(
            { error: 'Valor do frete deve ser positivo ou zero' },
            { status: 400 }
          );
        }
        updateData.valor_frete = body.valor_frete;
      } else if (!updateData.tem_frete) {
        updateData.valor_frete = 0;
      }
    }
    
    // Atualização de margem de lucro (se fornecido)
    if (body.margem_lucro_percentual !== undefined) {
      if (body.margem_lucro_percentual < 0) {
        return NextResponse.json(
          { error: 'Margem de lucro deve ser positiva ou zero' },
          { status: 400 }
        );
      }
      updateData.margem_lucro_percentual = body.margem_lucro_percentual;
    }
    
    // Atualização de impostos (se fornecido)
    if (body.impostos_percentual !== undefined) {
      if (body.impostos_percentual < 0) {
        return NextResponse.json(
          { error: 'Impostos devem ser positivos ou zero' },
          { status: 400 }
        );
      }
      updateData.impostos_percentual = body.impostos_percentual;
    }
    
    // Verifica se há dados para atualizar
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Nenhum campo válido fornecido para atualização' },
        { status: 400 }
      );
    }
    
    // Atualiza o pedido
    const { data, error } = await supabaseAdmin
      .from('pedidos')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();
      
    if (error) {
      logError(`Erro ao atualizar pedido ${id}`, error);
      return NextResponse.json(
        { error: 'Erro ao atualizar pedido' },
        { status: 500 }
      );
    }
    
    // Se o status foi alterado, registra no histórico
    if (updateData.status && updateData.status !== pedidoExistente.status) {
      const historicoData = {
        pedido_id: id,
        status_anterior: pedidoExistente.status,
        status_novo: updateData.status,
        user_id: user.id
      };
      
      await supabaseAdmin
        .from('historico_status_pedidos')
        .insert(historicoData);
      
      logInfo(`Status do pedido ${id} atualizado de ${pedidoExistente.status} para ${updateData.status}`);
    }
    
    logInfo(`Pedido ${id} atualizado com sucesso`);
    
    return NextResponse.json({
      message: 'Pedido atualizado com sucesso',
      data
    });
  } catch (error) {
    logError('Erro não tratado ao atualizar pedido', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/pedidos/[id]
 * Remove um pedido existente (US-037)
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
        { error: 'ID do pedido não fornecido' },
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
    
    // Verifica se o pedido existe e pertence ao usuário
    const pedidoExistente = await verificarPedidoDoUsuario(id, user.id);
    
    if (!pedidoExistente) {
      return NextResponse.json(
        { error: 'Pedido não encontrado ou não pertence ao usuário atual' },
        { status: 404 }
      );
    }
    
    // Não permitir excluir pedidos com status diferente de pendente ou cancelado
    if (pedidoExistente.status !== StatusPedido.PENDENTE && 
        pedidoExistente.status !== StatusPedido.CANCELADO) {
      return NextResponse.json(
        { error: `Não é possível excluir pedido com status "${pedidoExistente.status}". Apenas pedidos pendentes ou cancelados podem ser excluídos.` },
        { status: 409 }
      );
    }
    
    // Remove o pedido e todas as suas associações (processos e mão de obra)
    // Isso é feito automaticamente pelas foreign keys com ON DELETE CASCADE
    const { error } = await supabaseAdmin
      .from('pedidos')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
      
    if (error) {
      logError(`Erro ao excluir pedido com ID ${id}`, error);
      return NextResponse.json(
        { error: 'Erro ao excluir pedido' },
        { status: 500 }
      );
    }
    
    logInfo(`Pedido ${id} excluído com sucesso`);
    
    return NextResponse.json({
      message: 'Pedido excluído com sucesso'
    });
  } catch (error) {
    logError('Erro não tratado ao excluir pedido', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
}); 