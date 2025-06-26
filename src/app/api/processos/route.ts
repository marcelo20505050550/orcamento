/**
 * API para gerenciamento de processos de fabricação
 * Endpoints para listar e cadastrar processos
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/server';
import { withAuth } from '../middleware';
import { logError, logInfo } from '@/utils/logger';
import { ProcessoFabricacao } from '@/types';

/**
 * GET /api/processos
 * Lista todos os processos de fabricação cadastrados
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
      .from('processos_fabricacao')
      .select('*', { count: 'exact' });
    
    // Aplica filtro de busca se fornecido
    if (search) {
      query = query.ilike('nome', `%${search}%`);
    }
    
    // Aplica paginação e executa a query
    const { data, error, count } = await query
      .order('nome')
      .range(offset, offset + pageSize - 1);
      
    if (error) {
      logError('Erro ao listar processos de fabricação', error);
      return NextResponse.json(
        { error: 'Erro ao obter lista de processos' },
        { status: 500 }
      );
    }
    
    logInfo(`Listados ${data.length} processos de fabricação`);
    
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
    logError('Erro não tratado ao listar processos', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/processos
 * Cadastra um novo processo de fabricação (US-003)
 */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    // Parse do corpo da requisição
    const body = await req.json();
    console.log('Dados recebidos para cadastro de processo:', body);
    
    // Validação dos campos obrigatórios
    if (!body.nome) {
      return NextResponse.json(
        { error: 'Nome do processo é obrigatório' },
        { status: 400 }
      );
    }
    
    if (body.preco_por_unidade === undefined || body.preco_por_unidade < 0) {
      return NextResponse.json(
        { error: 'Preço por hora deve ser um valor positivo ou zero' },
        { status: 400 }
      );
    }
    
    if (!body.tempo_estimado_minutos || body.tempo_estimado_minutos <= 0) {
      return NextResponse.json(
        { error: 'Tempo estimado deve ser um valor positivo' },
        { status: 400 }
      );
    }
    
    // Verifica se já existe um processo com o mesmo nome
    const { data: processoExistente, error: errorVerificacao } = await supabaseAdmin
      .from('processos_fabricacao')
      .select('id')
      .ilike('nome', body.nome)
      .maybeSingle();
      
    if (processoExistente) {
      return NextResponse.json(
        { error: 'Já existe um processo com este nome' },
        { status: 409 }
      );
    }
    
    // Prepara os dados para inserção
    const processoData: Partial<ProcessoFabricacao> = {
      nome: body.nome,
      preco_por_unidade: body.preco_por_unidade,
      tempo_estimado_minutos: body.tempo_estimado_minutos
    };
    
    console.log('Dados formatados para inserção:', processoData);
    
    // Insere o processo no banco de dados usando o cliente admin
    const { data, error } = await supabaseAdmin
      .from('processos_fabricacao')
      .insert(processoData)
      .select()
      .single();
      
    if (error) {
      console.error('Erro do Supabase ao inserir processo:', error);
      logError('Erro ao inserir processo de fabricação', error);
      
      // Verifica se o erro é de chave única violada
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Já existe um processo com este nome' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: `Erro ao cadastrar processo: ${error.message}` },
        { status: 500 }
      );
    }
    
    console.log('Processo cadastrado com sucesso:', data);
    logInfo(`Processo de fabricação "${data.nome}" cadastrado com sucesso`, { id: data.id });
    
    return NextResponse.json(
      { 
        message: 'Processo cadastrado com sucesso', 
        data 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Exceção ao cadastrar processo:', error);
    logError('Erro não tratado ao cadastrar processo', error);
    return NextResponse.json(
      { 
        error: 'Erro interno ao processar a requisição',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}); 