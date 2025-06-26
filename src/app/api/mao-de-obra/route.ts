/**
 * API para gerenciamento de tipos de mão de obra
 * Endpoints para listar e cadastrar tipos de mão de obra
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { withAuth } from '../middleware';
import { logError, logInfo } from '@/utils/logger';
import { MaoDeObra } from '@/types';

/**
 * GET /api/mao-de-obra
 * Lista todos os tipos de mão de obra cadastrados
 */
export const GET = withAuth(async (req: NextRequest) => {
  try {
    // Obtém parâmetros de query da URL
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    const search = url.searchParams.get('search');
    
    // Calcula o offset para paginação
    const offset = (page - 1) * pageSize;
    
    // Constrói a query base
    let query = supabaseAdmin
      .from('mao_de_obra')
      .select('*', { count: 'exact' });
    
    // Aplica filtro de busca se fornecido
    if (search) {
      query = query.ilike('tipo', `%${search}%`);
    }
    
    // Aplica paginação e executa a query
    const { data, error, count } = await query
      .order('tipo')
      .range(offset, offset + pageSize - 1);
      
    if (error) {
      logError('Erro ao listar tipos de mão de obra', error);
      return NextResponse.json(
        { error: 'Erro ao obter lista de tipos de mão de obra' },
        { status: 500 }
      );
    }
    
    logInfo(`Listados ${data.length} tipos de mão de obra`);
    
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
    logError('Erro não tratado ao listar tipos de mão de obra', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/mao-de-obra
 * Cadastra um novo tipo de mão de obra (US-004)
 */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    // Parse do corpo da requisição
    const body = await req.json();
    console.log('Dados recebidos para cadastro de mão de obra:', body);
    
    // Validação dos campos obrigatórios
    if (!body.tipo) {
      return NextResponse.json(
        { error: 'Tipo de mão de obra é obrigatório' },
        { status: 400 }
      );
    }
    
    if (body.preco_por_hora === undefined || body.preco_por_hora <= 0) {
      return NextResponse.json(
        { error: 'Preço por hora deve ser um valor positivo' },
        { status: 400 }
      );
    }
    
    // Verifica se já existe um tipo de mão de obra com o mesmo nome (ignorando maiúsculas/minúsculas)
    const { data: tipoExistente } = await supabaseAdmin
      .from('mao_de_obra')
      .select('id')
      .ilike('tipo', body.tipo.trim())
      .maybeSingle();
      
    if (tipoExistente) {
      return NextResponse.json(
        { error: 'Já existe um tipo de mão de obra com este nome' },
        { status: 409 }
      );
    }
    
    // Prepara os dados para inserção
    const maoDeObraData: Partial<MaoDeObra> = {
      tipo: body.tipo,
      preco_por_hora: body.preco_por_hora
    };
    
    console.log('Dados formatados para inserção:', maoDeObraData);
    
    // Insere o tipo de mão de obra no banco de dados usando o cliente admin
    const { data, error } = await supabaseAdmin
      .from('mao_de_obra')
      .insert(maoDeObraData)
      .select()
      .single();
      
    if (error) {
      console.error('Erro do Supabase ao inserir mão de obra:', error);
      logError('Erro ao inserir tipo de mão de obra', error);
      
      // Verifica se o erro é de chave única violada
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Já existe um tipo de mão de obra com este nome' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: `Erro ao cadastrar tipo de mão de obra: ${error.message}` },
        { status: 500 }
      );
    }
    
    console.log('Tipo de mão de obra cadastrado com sucesso:', data);
    logInfo(`Tipo de mão de obra "${data.tipo}" cadastrado com sucesso`, { id: data.id });
    
    return NextResponse.json(
      { 
        message: 'Tipo de mão de obra cadastrado com sucesso', 
        data 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Exceção ao cadastrar tipo de mão de obra:', error);
    logError('Erro não tratado ao cadastrar tipo de mão de obra', error);
    return NextResponse.json(
      { 
        error: 'Erro interno ao processar a requisição',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}); 