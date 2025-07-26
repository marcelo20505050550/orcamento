/**
 * API para gerenciamento de pedidos
 * Endpoints para listar e criar pedidos
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/server';
import { withAuth } from '../middleware';
import { logError, logInfo } from '@/utils/logger';
import { StatusPedido } from '@/types';

/**
 * GET /api/pedidos
 * Lista todos os pedidos do usuário atual (US-013)
 */
export const GET = withAuth(async (req: NextRequest) => {
  try {
    // Obtém parâmetros de query da URL
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    const status = url.searchParams.get('status');
    const produtoId = url.searchParams.get('produto_id');
    
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
    
    // Calcula o offset para paginação
    const offset = (page - 1) * pageSize;
    
    // Constrói a query base - REMOVIDO FILTRO POR USUÁRIO para mostrar todos os pedidos
    let query = supabaseAdmin
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
        )
      `, { count: 'exact' });
    
    // Aplica filtros se fornecidos
    if (status) {
      query = query.eq('status', status);
    }
    
    if (produtoId) {
      query = query.eq('produto_id', produtoId);
    }
    
    // Aplica paginação e executa a query
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);
      
    if (error) {
      logError('Erro ao listar pedidos', error);
      return NextResponse.json(
        { error: 'Erro ao obter lista de pedidos' },
        { status: 500 }
      );
    }
    
    logInfo(`Listados ${data.length} pedidos para o usuário ${user.id}`);
    
    // Retorna dados com metadados de paginação
    return NextResponse.json({
      data,
      pagination: {
        total: count || 0,
        page,
        pageSize,
        totalPages: count ? Math.ceil(count / pageSize) : 0
      }
    });
  } catch (error) {
    logError('Erro não tratado ao listar pedidos', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/pedidos
 * Cria um novo pedido (US-005)
 */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    // Parse do corpo da requisição
    const body = await req.json();
    
    // Validação dos campos obrigatórios
    if (!body.cliente_id) {
      return NextResponse.json(
        { error: 'ID do cliente é obrigatório' },
        { status: 400 }
      );
    }
    
    if (!body.quantidade || body.quantidade <= 0) {
      return NextResponse.json(
        { error: 'Quantidade deve ser um valor positivo' },
        { status: 400 }
      );
    }
    
    // Validação dos campos opcionais
    const temFrete = Boolean(body.tem_frete);
    const valorFrete = temFrete ? (body.valor_frete || 0) : 0;
    
    // Validações dos campos
    if (valorFrete < 0) {
      return NextResponse.json(
        { error: 'Valor do frete deve ser positivo ou zero' },
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
    
    // Verifica se o cliente existe
    const { data: clienteExistente, error: errorCliente } = await supabaseAdmin
      .from('clientes')
      .select('id, nome_cliente_empresa')
      .eq('id', body.cliente_id)
      .maybeSingle();
      
    if (errorCliente) {
      logError('Erro ao verificar cliente', errorCliente);
      return NextResponse.json(
        { error: 'Erro ao verificar cliente' },
        { status: 500 }
      );
    }
    
    if (!clienteExistente) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      );
    }
    
    // Se produto_id não foi fornecido, busca ou cria um produto padrão
    let produtoExistente = null;
    let produtoId = body.produto_id;
    
    if (!produtoId) {
      // Busca um produto padrão existente
      const { data: produtoPadrao, error: errorPadrao } = await supabaseAdmin
        .from('produtos')
        .select('id, nome, e_materia_prima')
        .eq('nome', 'Produto Personalizado')
        .eq('e_materia_prima', false)
        .maybeSingle();
        
      if (errorPadrao) {
        logError('Erro ao buscar produto padrão', errorPadrao);
        return NextResponse.json(
          { error: 'Erro ao buscar produto padrão' },
          { status: 500 }
        );
      }
      
      if (produtoPadrao) {
        produtoId = produtoPadrao.id;
        produtoExistente = produtoPadrao;
      } else {
        // Cria um produto padrão se não existir
        const { data: novoProduto, error: errorNovo } = await supabaseAdmin
          .from('produtos')
          .insert({
            nome: 'Produto Personalizado',
            descricao: 'Produto criado automaticamente para pedidos sem produto específico',
            preco_unitario: 0,
            quantidade_estoque: 0,
            e_materia_prima: false
          })
          .select('id, nome, e_materia_prima')
          .single();
          
        if (errorNovo) {
          logError('Erro ao criar produto padrão', errorNovo);
          return NextResponse.json(
            { error: 'Erro ao criar produto padrão' },
            { status: 500 }
          );
        }
        
        produtoId = novoProduto.id;
        produtoExistente = novoProduto;
      }
    } else {
      // Se produto_id foi fornecido, verifica se existe e não é matéria-prima
      const { data: produto, error: errorProduto } = await supabaseAdmin
        .from('produtos')
        .select('id, nome, e_materia_prima')
        .eq('id', produtoId)
        .maybeSingle();
        
      if (errorProduto) {
        logError('Erro ao verificar produto', errorProduto);
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
      
      // Verifica se o produto não é uma matéria-prima
      if (produto.e_materia_prima) {
        return NextResponse.json(
          { error: 'Não é possível criar pedido para matéria-prima' },
          { status: 400 }
        );
      }
      
      produtoExistente = produto;
    }
    
    // Prepara os dados para inserção
    const pedidoData = {
      cliente_id: body.cliente_id,
      produto_id: produtoId,
      quantidade: body.quantidade,
      status: StatusPedido.PENDENTE,
      observacoes: body.observacoes || null,
      tem_frete: temFrete,
      valor_frete: valorFrete,
      user_id: user.id
    };
    
    // Insere o pedido no banco de dados
    const { data: pedido, error } = await supabaseAdmin
      .from('pedidos')
      .insert(pedidoData)
      .select()
      .single();
      
    if (error) {
      logError('Erro ao inserir pedido', error);
      return NextResponse.json(
        { error: 'Erro ao cadastrar pedido' },
        { status: 500 }
      );
    }
    
    // Registra o histórico de status inicial
    const historicoData = {
      pedido_id: pedido.id,
      status_anterior: null,
      status_novo: StatusPedido.PENDENTE,
      user_id: user.id
    };
    
    await supabaseAdmin
      .from('historico_status_pedidos')
      .insert(historicoData);
    
    logInfo(`Pedido ${pedido.id} criado com sucesso para o cliente ${clienteExistente.nome_cliente_empresa}`, { 
      cliente_id: clienteExistente.id,
      produto_id: produtoExistente?.id || null,
      usuario_id: user.id
    });
    
    return NextResponse.json(
      { 
        message: 'Pedido criado com sucesso', 
        data: pedido 
      },
      { status: 201 }
    );
  } catch (error) {
    logError('Erro não tratado ao criar pedido', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
}); 