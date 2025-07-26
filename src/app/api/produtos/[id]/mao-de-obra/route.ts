/**
 * API para gerenciamento de mão de obra associada a um produto
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { withAuth } from '../../../middleware';
import { logError, logInfo } from '@/utils/logger';

/**
 * GET /api/produtos/[id]/mao-de-obra
 * Lista toda a mão de obra associada a um produto
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

    // Buscar mão de obra associada ao produto
    const { data, error } = await supabaseAdmin
      .from('produto_mao_de_obra')
      .select(`
        id,
        horas,
        created_at,
        updated_at,
        mao_de_obra:mao_de_obra (
          id,
          tipo,
          preco_por_hora
        )
      `)
      .eq('produto_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      logError(`Erro ao buscar mão de obra do produto ${id}`, error);
      return NextResponse.json(
        { error: 'Erro ao buscar mão de obra do produto' },
        { status: 500 }
      );
    }

    logInfo(`Listada ${data.length} mão de obra para o produto ${id}`);
    
    return NextResponse.json({ data });
  } catch (error) {
    logError('Erro não tratado ao listar mão de obra do produto', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/produtos/[id]/mao-de-obra
 * Adiciona mão de obra ao produto
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
    if (!body.mao_de_obra_id) {
      return NextResponse.json(
        { error: 'ID da mão de obra é obrigatório' },
        { status: 400 }
      );
    }
    
    if (!body.horas || body.horas <= 0) {
      return NextResponse.json(
        { error: 'Horas deve ser um valor positivo' },
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

    // Verificar se a mão de obra existe
    const { data: maoDeObra, error: maoDeObraError } = await supabaseAdmin
      .from('mao_de_obra')
      .select('id')
      .eq('id', body.mao_de_obra_id)
      .single();

    if (maoDeObraError || !maoDeObra) {
      return NextResponse.json(
        { error: 'Mão de obra não encontrada' },
        { status: 404 }
      );
    }

    // Inserir o relacionamento
    const { data, error } = await supabaseAdmin
      .from('produto_mao_de_obra')
      .insert({
        produto_id: id,
        mao_de_obra_id: body.mao_de_obra_id,
        horas: body.horas
      })
      .select(`
        id,
        horas,
        created_at,
        updated_at,
        mao_de_obra:mao_de_obra (
          id,
          tipo,
          preco_por_hora
        )
      `)
      .single();

    if (error) {
      logError(`Erro ao adicionar mão de obra ao produto ${id}`, error);
      
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Esta mão de obra já está associada ao produto' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Erro ao adicionar mão de obra ao produto' },
        { status: 500 }
      );
    }

    logInfo(`Mão de obra adicionada ao produto ${id}`, { mao_de_obra_id: body.mao_de_obra_id });
    
    return NextResponse.json({
      message: 'Mão de obra adicionada com sucesso',
      data
    }, { status: 201 });
  } catch (error) {
    logError('Erro não tratado ao adicionar mão de obra ao produto', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
});