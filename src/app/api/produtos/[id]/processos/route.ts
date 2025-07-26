/**
 * API para gerenciamento de processos associados a um produto
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { withAuth } from '../../../middleware';
import { logError, logInfo } from '@/utils/logger';

/**
 * GET /api/produtos/[id]/processos
 * Lista todos os processos associados a um produto
 */
export const GET = withAuth(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID do produto não fornecido' },
        { status: 400 }
      );
    }

    // Buscar processos associados ao produto
    const { data, error } = await supabaseAdmin
      .from('produto_processos')
      .select(`
        id,
        quantidade,
        unidade_medida,
        created_at,
        updated_at,
        processo:processos_fabricacao (
          id,
          nome,
          preco_por_unidade,
          tempo_estimado_minutos
        )
      `)
      .eq('produto_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      logError(`Erro ao buscar processos do produto ${id}`, error);
      return NextResponse.json(
        { error: 'Erro ao buscar processos do produto' },
        { status: 500 }
      );
    }

    logInfo(`Listados ${data.length} processos para o produto ${id}`);
    
    return NextResponse.json({ data });
  } catch (error) {
    logError('Erro não tratado ao listar processos do produto', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/produtos/[id]/processos
 * Adiciona um processo ao produto
 */
export const POST = withAuth(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID do produto não fornecido' },
        { status: 400 }
      );
    }

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

    if (!body.unidade_medida || !['horas', 'quilos'].includes(body.unidade_medida)) {
      return NextResponse.json(
        { error: 'Unidade de medida deve ser "horas" ou "quilos"' },
        { status: 400 }
      );
    }

    // Verificar se o produto existe
    const { data: produto, error: produtoError } = await supabaseAdmin
      .from('produtos')
      .select('id')
      .eq('id', id)
      .single();

    if (produtoError || !produto) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se o processo existe
    const { data: processo, error: processoError } = await supabaseAdmin
      .from('processos_fabricacao')
      .select('id')
      .eq('id', body.processo_id)
      .single();

    if (processoError || !processo) {
      return NextResponse.json(
        { error: 'Processo não encontrado' },
        { status: 404 }
      );
    }

    // Inserir o relacionamento
    const { data, error } = await supabaseAdmin
      .from('produto_processos')
      .insert({
        produto_id: id,
        processo_id: body.processo_id,
        quantidade: body.quantidade,
        unidade_medida: body.unidade_medida
      })
      .select(`
        id,
        quantidade,
        unidade_medida,
        created_at,
        updated_at,
        processo:processos_fabricacao (
          id,
          nome,
          preco_por_unidade,
          tempo_estimado_minutos
        )
      `)
      .single();

    if (error) {
      logError(`Erro ao adicionar processo ao produto ${id}`, error);
      
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Este processo já está associado ao produto' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Erro ao adicionar processo ao produto' },
        { status: 500 }
      );
    }

    logInfo(`Processo adicionado ao produto ${id}`, { processo_id: body.processo_id });
    
    return NextResponse.json({
      message: 'Processo adicionado com sucesso',
      data
    }, { status: 201 });
  } catch (error) {
    logError('Erro não tratado ao adicionar processo ao produto', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
});