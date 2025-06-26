/**
 * API para gerenciamento de processos associados a um pedido
 * Endpoints para listar e adicionar processos a um pedido
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
 * GET /api/pedidos/[id]/processos
 * Lista todos os processos associados a um pedido
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
    
    // Busca os processos associados ao pedido
    const { data, error } = await supabaseAdmin
      .from('processos_pedidos')
      .select(`
        *,
        processo:processos_fabricacao(*)
      `)
      .eq('pedido_id', id);
      
    if (error) {
      logError(`Erro ao listar processos do pedido ${id}`, error);
      return NextResponse.json(
        { error: 'Erro ao listar processos do pedido' },
        { status: 500 }
      );
    }
    
    logInfo(`Listados ${data.length} processos para o pedido ${id}`);
    
    return NextResponse.json({ data });
  } catch (error) {
    logError('Erro não tratado ao listar processos do pedido', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/pedidos/[id]/processos
 * Adiciona um processo a um pedido (US-006)
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
    if (!body.processo_id) {
      return NextResponse.json(
        { error: 'ID do processo é obrigatório' },
        { status: 400 }
      );
    }
    
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
    
    // Verifica se o pedido existe e pertence ao usuário
    const pedidoExistente = await verificarPedidoDoUsuario(id, user.id);
    
    if (!pedidoExistente) {
      return NextResponse.json(
        { error: 'Pedido não encontrado ou não pertence ao usuário atual' },
        { status: 404 }
      );
    }
    
    // Não permitir adicionar processos a pedidos finalizados ou cancelados
    if (pedidoExistente.status === StatusPedido.FINALIZADO || 
        pedidoExistente.status === StatusPedido.CANCELADO) {
      return NextResponse.json(
        { error: `Não é possível adicionar processos a pedido com status "${pedidoExistente.status}"` },
        { status: 409 }
      );
    }
    
    // Verifica se o processo existe
    const { data: processoExistente, error: errorProcesso } = await supabaseAdmin
      .from('processos_fabricacao')
      .select('id, nome')
      .eq('id', body.processo_id)
      .maybeSingle();
      
    if (errorProcesso) {
      logError('Erro ao verificar processo', errorProcesso);
      return NextResponse.json(
        { error: 'Erro ao verificar processo' },
        { status: 500 }
      );
    }
    
    if (!processoExistente) {
      return NextResponse.json(
        { error: 'Processo não encontrado' },
        { status: 404 }
      );
    }
    
    // Verifica se já existe este processo associado ao pedido
    const { data: processoExistenteNoPedido, error: errorVerificacao } = await supabaseAdmin
      .from('processos_pedidos')
      .select('id')
      .eq('pedido_id', id)
      .eq('processo_id', body.processo_id)
      .maybeSingle();
      
    if (processoExistenteNoPedido) {
      return NextResponse.json(
        { error: 'Este processo já está associado ao pedido' },
        { status: 409 }
      );
    }
    
    // Prepara os dados para inserção
    const processoPedidoData = {
      pedido_id: id,
      processo_id: body.processo_id,
      quantidade: body.quantidade
    };
    
    // Insere a associação no banco de dados
    const { data, error } = await supabaseAdmin
      .from('processos_pedidos')
      .insert(processoPedidoData)
      .select(`
        *,
        processo:processos_fabricacao(*)
      `)
      .single();
      
    if (error) {
      logError('Erro ao associar processo ao pedido', error);
      
      // Verifica se o erro é de chave única violada
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Este processo já está associado ao pedido' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Erro ao associar processo ao pedido' },
        { status: 500 }
      );
    }
    
    logInfo(`Processo ${body.processo_id} associado ao pedido ${id} com quantidade ${body.quantidade}`, {
      processo: processoExistente.nome
    });
    
    return NextResponse.json({
      message: 'Processo associado ao pedido com sucesso',
      data
    });
  } catch (error) {
    logError('Erro não tratado ao associar processo ao pedido', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
}); 