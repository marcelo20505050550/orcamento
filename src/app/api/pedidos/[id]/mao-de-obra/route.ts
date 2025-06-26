/**
 * API para gerenciamento de tipos de mão de obra associados a um pedido
 * Endpoints para listar e adicionar tipos de mão de obra a um pedido
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/server';
import { withAuth } from '../../../middleware';
import { logError, logInfo } from '@/utils/logger';
import { StatusPedido } from '@/types';

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
 * GET /api/pedidos/[id]/mao-de-obra
 * Lista todos os tipos de mão de obra associados a um pedido
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
    
    // Verifica se o pedido existe e pertence ao usuário
    const pedidoExistente = await verificarPedidoDoUsuario(id, user.id);
    
    if (!pedidoExistente) {
      return NextResponse.json(
        { error: 'Pedido não encontrado ou não pertence ao usuário atual' },
        { status: 404 }
      );
    }
    
    // Busca os tipos de mão de obra associados ao pedido
    const { data, error } = await supabaseAdmin
      .from('mao_de_obra_pedidos')
      .select(`
        *,
        mao_de_obra:mao_de_obra(*)
      `)
      .eq('pedido_id', id);
      
    if (error) {
      logError(`Erro ao listar tipos de mão de obra do pedido ${id}`, error);
      return NextResponse.json(
        { error: 'Erro ao listar tipos de mão de obra do pedido' },
        { status: 500 }
      );
    }
    
    logInfo(`Listados ${data.length} tipos de mão de obra para o pedido ${id}`);
    
    return NextResponse.json({ data });
  } catch (error) {
    logError('Erro não tratado ao listar tipos de mão de obra do pedido', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/pedidos/[id]/mao-de-obra
 * Adiciona um tipo de mão de obra a um pedido (US-007)
 */
export const POST = withAuth(async (
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
    
    // Validação dos campos obrigatórios
    if (!body.mao_de_obra_id) {
      return NextResponse.json(
        { error: 'ID do tipo de mão de obra é obrigatório' },
        { status: 400 }
      );
    }
    
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
    
    // Verifica se o pedido existe e pertence ao usuário
    const pedidoExistente = await verificarPedidoDoUsuario(id, user.id);
    
    if (!pedidoExistente) {
      return NextResponse.json(
        { error: 'Pedido não encontrado ou não pertence ao usuário atual' },
        { status: 404 }
      );
    }
    
    // Não permitir adicionar mão de obra a pedidos finalizados ou cancelados
    if (pedidoExistente.status === StatusPedido.FINALIZADO || 
        pedidoExistente.status === StatusPedido.CANCELADO) {
      return NextResponse.json(
        { error: `Não é possível adicionar mão de obra a pedido com status "${pedidoExistente.status}"` },
        { status: 409 }
      );
    }
    
    // Verifica se o tipo de mão de obra existe
    const { data: maoDeObraExistente, error: errorMaoDeObra } = await supabaseAdmin
      .from('mao_de_obra')
      .select('id, tipo')
      .eq('id', body.mao_de_obra_id)
      .maybeSingle();
      
    if (errorMaoDeObra) {
      logError('Erro ao verificar tipo de mão de obra', errorMaoDeObra);
      return NextResponse.json(
        { error: 'Erro ao verificar tipo de mão de obra' },
        { status: 500 }
      );
    }
    
    if (!maoDeObraExistente) {
      return NextResponse.json(
        { error: 'Tipo de mão de obra não encontrado' },
        { status: 404 }
      );
    }
    
    // Verifica se este tipo de mão de obra já está associado ao pedido
    const { data: maoDeObraExistenteNoPedido } = await supabaseAdmin
      .from('mao_de_obra_pedidos')
      .select('id')
      .eq('pedido_id', id)
      .eq('mao_de_obra_id', body.mao_de_obra_id)
      .maybeSingle();
      
    if (maoDeObraExistenteNoPedido) {
      return NextResponse.json(
        { error: 'Este tipo de mão de obra já está associado ao pedido' },
        { status: 409 }
      );
    }
    
    // Prepara os dados para inserção
    const maoDeObraPedidoData = {
      pedido_id: id,
      mao_de_obra_id: body.mao_de_obra_id,
      horas: body.horas
    };
    
    // Insere a associação no banco de dados
    const { data, error } = await supabaseAdmin
      .from('mao_de_obra_pedidos')
      .insert(maoDeObraPedidoData)
      .select(`
        *,
        mao_de_obra:mao_de_obra(*)
      `)
      .single();
      
    if (error) {
      logError('Erro ao associar mão de obra ao pedido', error);
      
      // Verifica se o erro é de chave única violada
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Este tipo de mão de obra já está associado ao pedido' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Erro ao associar mão de obra ao pedido' },
        { status: 500 }
      );
    }
    
    logInfo(`Mão de obra ${body.mao_de_obra_id} associada ao pedido ${id} com ${body.horas} horas`, {
      tipo_mao_de_obra: maoDeObraExistente.tipo
    });
    
    return NextResponse.json({
      message: 'Mão de obra associada ao pedido com sucesso',
      data
    });
  } catch (error) {
    logError('Erro não tratado ao associar mão de obra ao pedido', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
}); 