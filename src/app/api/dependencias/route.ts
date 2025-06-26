/**
 * API para gerenciamento de dependências entre produtos
 * Endpoints para listar e criar dependências
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { withAuth } from '../middleware';
import { logError, logInfo } from '@/utils/logger';
import { DependenciaProduto } from '@/types';

/**
 * GET /api/dependencias
 * Lista todas as dependências cadastradas com opção de filtro por produto pai
 */
export const GET = withAuth(async (req: NextRequest) => {
  try {
    // Debug logs for Vercel
    console.log('🔍 [VERCEL DEBUG] Starting GET /api/dependencias');
    console.log('🔍 [VERCEL DEBUG] Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: !!process.env.VERCEL,
      SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });
    
    // Obtém parâmetros de query da URL
    const url = new URL(req.url);
    const produtoPaiId = url.searchParams.get('produtoPaiId');
    const produtoFilhoId = url.searchParams.get('produtoFilhoId');
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    
    console.log('🔍 [VERCEL DEBUG] Query params:', { produtoPaiId, produtoFilhoId, page, pageSize });
    
    // Calcula o offset para paginação
    const offset = (page - 1) * pageSize;
    
    // Constrói a query base
    console.log('🔍 [VERCEL DEBUG] Building Supabase query...');
    let query = supabaseAdmin
      .from('dependencias_produtos')
      .select(`
        *,
        produto_pai:produto_pai_id(id, nome, preco_unitario, e_materia_prima),
        produto_filho:produto_filho_id(id, nome, preco_unitario, e_materia_prima)
      `, { count: 'exact' });
    
    // Aplica filtros conforme parâmetros
    if (produtoPaiId) {
      console.log('🔍 [VERCEL DEBUG] Applying produtoPaiId filter:', produtoPaiId);
      query = query.eq('produto_pai_id', produtoPaiId);
    }
    
    if (produtoFilhoId) {
      console.log('🔍 [VERCEL DEBUG] Applying produtoFilhoId filter:', produtoFilhoId);
      query = query.eq('produto_filho_id', produtoFilhoId);
    }
    
    // Aplica paginação e executa a query
    console.log('🔍 [VERCEL DEBUG] Executing query with pagination:', { offset, pageSize });
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);
      
    console.log('🔍 [VERCEL DEBUG] Query result:', { 
      dataLength: data?.length || 0, 
      count, 
      hasError: !!error,
      errorMessage: error?.message || 'no error'
    });
      
    if (error) {
      logError('Erro ao listar dependências de produtos', error);
      return NextResponse.json(
        { error: 'Erro ao obter lista de dependências' },
        { status: 500 }
      );
    }
    
    const mensagem = produtoPaiId 
      ? `Listadas ${data.length} dependências para o produto ${produtoPaiId}`
      : `Listadas ${data.length} dependências de produtos`;
      
    logInfo(mensagem);
    
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
    console.error('🚨 [VERCEL DEBUG] Caught exception in GET /api/dependencias:', error);
    console.error('🚨 [VERCEL DEBUG] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    logError('Erro não tratado ao listar dependências', error);
    return NextResponse.json(
      { 
        error: 'Erro interno ao processar a requisição',
        debug: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
});

/**
 * POST /api/dependencias
 * Cadastra uma nova dependência entre produtos
 */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    // Parse do corpo da requisição
    const body = await req.json();
    console.log('Dados recebidos para cadastro de dependência:', body);
    
    // Validação dos campos obrigatórios
    if (!body.produto_pai_id) {
      return NextResponse.json(
        { error: 'ID do produto pai é obrigatório' },
        { status: 400 }
      );
    }
    
    if (!body.produto_filho_id) {
      return NextResponse.json(
        { error: 'ID do produto filho é obrigatório' },
        { status: 400 }
      );
    }
    
    if (!body.quantidade_necessaria || body.quantidade_necessaria <= 0) {
      return NextResponse.json(
        { error: 'Quantidade necessária deve ser um valor positivo' },
        { status: 400 }
      );
    }
    
    // Verifica se os produtos pai e filho são diferentes
    if (body.produto_pai_id === body.produto_filho_id) {
      return NextResponse.json(
        { error: 'Um produto não pode depender de si mesmo' },
        { status: 400 }
      );
    }
    
    // Verifica se os produtos existem
    const { data: produtoPai, error: errorPai } = await supabaseAdmin
      .from('produtos')
      .select('id, nome')
      .eq('id', body.produto_pai_id)
      .single();
      
    if (errorPai || !produtoPai) {
      console.error('Erro ao verificar produto pai:', errorPai);
      return NextResponse.json(
        { error: 'Produto pai não encontrado' },
        { status: 404 }
      );
    }
    
    const { data: produtoFilho, error: errorFilho } = await supabaseAdmin
      .from('produtos')
      .select('id, nome')
      .eq('id', body.produto_filho_id)
      .single();
      
    if (errorFilho || !produtoFilho) {
      console.error('Erro ao verificar produto filho:', errorFilho);
      return NextResponse.json(
        { error: 'Produto filho não encontrado' },
        { status: 404 }
      );
    }
    
    console.log(`Verificação de produtos: Pai (${produtoPai.nome}) e Filho (${produtoFilho.nome}) encontrados`);
    
    // Verifica se já existe uma dependência entre esses produtos
    const { data: dependenciaExistente } = await supabaseAdmin
      .from('dependencias_produtos')
      .select('id')
      .eq('produto_pai_id', body.produto_pai_id)
      .eq('produto_filho_id', body.produto_filho_id)
      .maybeSingle();
      
    if (dependenciaExistente) {
      return NextResponse.json(
        { error: 'Já existe uma dependência entre esses produtos' },
        { status: 409 }
      );
    }
    
    // Verifica se a dependência criaria um ciclo
    // Isso requer uma consulta recursiva no banco de dados, que poderia ser implementada 
    // com uma stored procedure no PostgreSQL. Para simplificar, estamos apenas evitando 
    // ciclos diretos (A depende de B e B depende de A).
    const { data: dependenciaCiclica } = await supabaseAdmin
      .from('dependencias_produtos')
      .select('id')
      .eq('produto_pai_id', body.produto_filho_id)
      .eq('produto_filho_id', body.produto_pai_id)
      .maybeSingle();
      
    if (dependenciaCiclica) {
      return NextResponse.json(
        { error: 'Esta dependência criaria um ciclo no grafo de dependências' },
        { status: 400 }
      );
    }
    
    // Prepara os dados para inserção
    const dependenciaData: Partial<DependenciaProduto> = {
      produto_pai_id: body.produto_pai_id,
      produto_filho_id: body.produto_filho_id,
      quantidade_necessaria: body.quantidade_necessaria
    };
    
    console.log('Dados formatados para inserção:', dependenciaData);
    
    // Insere a dependência no banco de dados usando o cliente admin
    const { data, error } = await supabaseAdmin
      .from('dependencias_produtos')
      .insert(dependenciaData)
      .select(`
        *,
        produto_pai:produto_pai_id(id, nome),
        produto_filho:produto_filho_id(id, nome)
      `)
      .single();
      
    if (error) {
      console.error('Erro do Supabase ao inserir dependência:', error);
      logError('Erro ao inserir dependência', error);
      
      // Verifica se o erro é de chave única violada
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Já existe uma dependência entre esses produtos' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: `Erro ao cadastrar dependência: ${error.message}` },
        { status: 500 }
      );
    }
    
    console.log('Dependência cadastrada com sucesso:', data);
    logInfo('Dependência cadastrada com sucesso', { 
      id: data.id, 
      produto_pai: data.produto_pai?.nome,
      produto_filho: data.produto_filho?.nome
    });
    
    return NextResponse.json(
      { 
        message: 'Dependência cadastrada com sucesso', 
        data 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Exceção ao cadastrar dependência:', error);
    logError('Erro não tratado ao cadastrar dependência', error);
    return NextResponse.json(
      { 
        error: 'Erro interno ao processar a requisição',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}); 