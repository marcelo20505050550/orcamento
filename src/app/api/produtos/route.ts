/**
 * API para gerenciamento de produtos
 * Endpoints para listar e criar produtos
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/server';
import { withAuth } from '../middleware';
import { logError, logInfo } from '@/utils/logger';
import { Produto } from '@/types';

/**
 * GET /api/produtos
 * Lista todos os produtos cadastrados
 */
export const GET = withAuth(async (req: NextRequest) => {
  try {
    // Obtém parâmetros de query da URL
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    const materiaPrimaParam = url.searchParams.get('materiaPrima');
    const search = url.searchParams.get('search') || '';
    
    // Calcula o offset para paginação
    const offset = (page - 1) * pageSize;
    
    // Constrói a query base
    let query = supabaseAdmin
      .from('produtos')
      .select('*', { count: 'exact' });
    
    // Aplica filtros conforme parâmetros
    if (materiaPrimaParam === 'true') {
      query = query.eq('e_materia_prima', true);
    } else if (materiaPrimaParam === 'false') {
      query = query.eq('e_materia_prima', false);
    }
    
    if (search) {
      query = query.ilike('nome', `%${search}%`);
    }
    
    // Aplica paginação e executa a query
    const { data, error, count } = await query
      .order('nome')
      .range(offset, offset + pageSize - 1);
      
    if (error) {
      logError('Erro ao listar produtos', error);
      return NextResponse.json(
        { error: 'Erro ao obter lista de produtos' },
        { status: 500 }
      );
    }
    
    logInfo(`Listados ${data.length} produtos com sucesso`);
    
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
    logError('Erro não tratado ao listar produtos', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/produtos
 * Cadastra um novo produto
 */
export const POST = withAuth(async (req: NextRequest) => {
  try {
    // Verifica o cabeçalho de autorização para diagnóstico
    const authHeader = req.headers.get('authorization');
    console.log('Cabeçalho de autorização:', authHeader ? 'Presente' : 'Ausente');
    
    // Parse do corpo da requisição
    const body = await req.json();
    console.log('Dados recebidos para cadastro de produto:', body);
    
    // Validação dos campos obrigatórios
    if (!body.nome) {
      return NextResponse.json(
        { error: 'Nome do produto é obrigatório' },
        { status: 400 }
      );
    }
    
    // Validação do preço unitário apenas para matérias-primas
    if (body.e_materia_prima && (body.preco_unitario === undefined || body.preco_unitario < 0)) {
      return NextResponse.json(
        { error: 'Preço unitário deve ser um valor positivo para matérias-primas' },
        { status: 400 }
      );
    }
    
    // Valores padrão para campos opcionais
    const produtoData: Partial<Produto> = {
      nome: body.nome,
      descricao: body.descricao || '',
      preco_unitario: body.preco_unitario || 0,
      quantidade_estoque: body.quantidade_estoque || 0,
      e_materia_prima: body.e_materia_prima || false
    };
    
    console.log('Dados formatados para inserção:', produtoData);
    
    // Insere o produto no banco de dados usando o cliente admin que ignora RLS
    const { data, error } = await supabaseAdmin
      .from('produtos')
      .insert(produtoData)
      .select()
      .single();
      
    if (error) {
      console.error('Erro do Supabase ao inserir produto:', error);
      logError('Erro ao inserir produto', error);
      
      // Verifica se o erro é de chave única violada
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Já existe um produto com este nome' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: `Erro ao cadastrar produto: ${error.message}` },
        { status: 500 }
      );
    }
    
    console.log('Produto cadastrado com sucesso:', data);
    logInfo('Produto cadastrado com sucesso', { id: data.id, nome: data.nome });
    
    return NextResponse.json(
      { message: 'Produto cadastrado com sucesso', data },
      { status: 201 }
    );
  } catch (error) {
    console.error('Exceção ao cadastrar produto:', error);
    logError('Erro não tratado ao cadastrar produto', error);
    return NextResponse.json(
      { 
        error: 'Erro interno ao processar a requisição',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
}); 