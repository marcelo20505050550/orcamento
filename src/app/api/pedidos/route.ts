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
    
    // Constrói a query base
    let query = supabaseAdmin
      .from('pedidos')
      .select(`
        *,
        produto:produtos(*),
        processos:processos_pedidos(
          *,
          processo:processos_fabricacao(*)
        ),
        mao_de_obra:mao_de_obra_pedidos(
          *,
          mao_de_obra:mao_de_obra(*)
        )
      `, { count: 'exact' })
      .eq('user_id', user.id);
    
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
    
    // Validação dos novos campos opcionais
    const temFrete = Boolean(body.tem_frete);
    const valorFrete = temFrete ? (body.valor_frete || 0) : 0;
    const margemLucroPercentual = body.margem_lucro_percentual || 0;
    const impostosPercentual = body.impostos_percentual || 0;
    
    // Validações dos novos campos
    if (valorFrete < 0) {
      return NextResponse.json(
        { error: 'Valor do frete deve ser positivo ou zero' },
        { status: 400 }
      );
    }
    
    if (margemLucroPercentual < 0) {
      return NextResponse.json(
        { error: 'Margem de lucro deve ser positiva ou zero' },
        { status: 400 }
      );
    }
    
    if (impostosPercentual < 0) {
      return NextResponse.json(
        { error: 'Impostos devem ser positivos ou zero' },
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
    
    // Verifica se o produto existe
    const { data: produtoExistente, error: errorProduto } = await supabaseAdmin
      .from('produtos')
      .select('id, nome, e_materia_prima')
      .eq('id', body.produto_id)
      .maybeSingle();
      
    if (errorProduto) {
      logError('Erro ao verificar produto', errorProduto);
      return NextResponse.json(
        { error: 'Erro ao verificar produto' },
        { status: 500 }
      );
    }
    
    if (!produtoExistente) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }
    
    // Verifica se o produto não é uma matéria-prima
    if (produtoExistente.e_materia_prima) {
      return NextResponse.json(
        { error: 'Não é possível criar pedido para matéria-prima' },
        { status: 400 }
      );
    }
    
    // Prepara os dados para inserção
    const pedidoData = {
      produto_id: body.produto_id,
      quantidade: body.quantidade,
      status: StatusPedido.PENDENTE,
      observacoes: body.observacoes || null,
      tem_frete: temFrete,
      valor_frete: valorFrete,
      margem_lucro_percentual: margemLucroPercentual,
      impostos_percentual: impostosPercentual,
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
    
    logInfo(`Pedido ${pedido.id} criado com sucesso para o produto ${produtoExistente.nome}`, { 
      produto_id: produtoExistente.id,
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