/**
 * API para gerenciamento de produtos em pedidos
 * Endpoints para listar e adicionar produtos a um pedido específico
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { supabase } from '@/lib/supabase/client';
import { withAuth } from '../../../middleware';
import { logError, logInfo } from '@/utils/logger';

/**
 * GET /api/pedidos/[id]/produtos
 * Lista todos os produtos de um pedido específico
 */
export const GET = withAuth(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: pedidoId } = await params;
    
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
    const { data: pedido, error: pedidoError } = await supabaseAdmin
      .from('pedidos')
      .select('id, user_id')
      .eq('id', pedidoId)
      .eq('user_id', user.id)
      .maybeSingle();
      
    if (pedidoError) {
      logError('Erro ao verificar pedido', pedidoError);
      return NextResponse.json(
        { error: 'Erro ao verificar pedido' },
        { status: 500 }
      );
    }
    
    if (!pedido) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      );
    }
    
    // Busca os produtos do pedido
    console.log('Buscando produtos para pedido:', pedidoId);
    const { data, error } = await supabaseAdmin
      .from('produtos_pedidos')
      .select(`
        *,
        produto:produtos(*)
      `)
      .eq('pedido_id', pedidoId)
      .order('created_at', { ascending: true });
      
    console.log('Resultado da query produtos_pedidos:', { data, error, pedidoId });
    if (data && data.length > 0) {
      console.log('Primeiro produto encontrado:', JSON.stringify(data[0], null, 2));
    }
      
    if (error) {
      logError('Erro ao listar produtos do pedido', error);
      return NextResponse.json(
        { error: 'Erro ao obter produtos do pedido' },
        { status: 500 }
      );
    }
    
    logInfo(`Listados ${data.length} produtos para o pedido ${pedidoId}`);
    
    return NextResponse.json(data);
  } catch (error) {
    logError('Erro não tratado ao listar produtos do pedido', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/pedidos/[id]/produtos
 * Adiciona um produto a um pedido específico
 */
export const POST = withAuth(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  try {
    const { id: pedidoId } = await params;
    const body = await req.json();
    
    // Validação dos campos obrigatórios
    if (!body.produto_id) {
      return NextResponse.json(
        { error: 'ID do produto é obrigatório' },
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
    const { data: pedido, error: pedidoError } = await supabaseAdmin
      .from('pedidos')
      .select('id, user_id')
      .eq('id', pedidoId)
      .eq('user_id', user.id)
      .maybeSingle();
      
    if (pedidoError) {
      logError('Erro ao verificar pedido', pedidoError);
      return NextResponse.json(
        { error: 'Erro ao verificar pedido' },
        { status: 500 }
      );
    }
    
    if (!pedido) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      );
    }
    
    // Verifica se o produto existe
    const { data: produto, error: produtoError } = await supabaseAdmin
      .from('produtos')
      .select('id, nome')
      .eq('id', body.produto_id)
      .maybeSingle();
      
    if (produtoError) {
      logError('Erro ao verificar produto', produtoError);
      return NextResponse.json(
        { error: 'Erro ao verificar produto' },
        { status: 500 }
      );
    }
    
    if (!produto) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }
    
    // Verifica se o produto já foi adicionado ao pedido
    const { data: produtoExistente, error: existeError } = await supabaseAdmin
      .from('produtos_pedidos')
      .select('id')
      .eq('pedido_id', pedidoId)
      .eq('produto_id', body.produto_id)
      .maybeSingle();
      
    if (existeError) {
      logError('Erro ao verificar produto existente', existeError);
      return NextResponse.json(
        { error: 'Erro ao verificar produto existente' },
        { status: 500 }
      );
    }
    
    if (produtoExistente) {
      return NextResponse.json(
        { error: 'Este produto já foi adicionado ao pedido' },
        { status: 409 }
      );
    }
    
    // Prepara os dados para inserção
    const produtoPedidoData = {
      pedido_id: pedidoId,
      produto_id: body.produto_id,
      quantidade: body.quantidade
    };
    
    // Insere o produto no pedido
    const { data, error } = await supabaseAdmin
      .from('produtos_pedidos')
      .insert(produtoPedidoData)
      .select(`
        *,
        produto:produtos(*)
      `)
      .single();
      
    if (error) {
      logError('Erro ao adicionar produto ao pedido', error);
      return NextResponse.json(
        { error: 'Erro ao adicionar produto ao pedido' },
        { status: 500 }
      );
    }
    
    logInfo(`Produto ${produto.nome} adicionado ao pedido ${pedidoId}`, { 
      produto_id: body.produto_id,
      pedido_id: pedidoId,
      quantidade: body.quantidade
    });
    
    return NextResponse.json(
      { 
        message: 'Produto adicionado ao pedido com sucesso', 
        data 
      },
      { status: 201 }
    );
  } catch (error) {
    logError('Erro não tratado ao adicionar produto ao pedido', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
});