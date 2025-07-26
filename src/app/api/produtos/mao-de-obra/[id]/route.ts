/**
 * API para gerenciamento de mão de obra específica associada a um produto
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { withAuth } from '../../../middleware';
import { logError, logInfo } from '@/utils/logger';

/**
 * PUT /api/produtos/mao-de-obra/[id]
 * Atualiza mão de obra associada a um produto
 */
export const PUT = withAuth(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID do relacionamento não fornecido' },
        { status: 400 }
      );
    }

    const body = await req.json();
    
    // Validação dos campos
    if (body.horas !== undefined && body.horas <= 0) {
      return NextResponse.json(
        { error: 'Horas deve ser um valor positivo' },
        { status: 400 }
      );
    }

    // Verificar se o relacionamento existe
    const { data: relacionamento, error: relacionamentoError } = await supabaseAdmin
      .from('produto_mao_de_obra')
      .select('id')
      .eq('id', id)
      .single();

    if (relacionamentoError || !relacionamento) {
      return NextResponse.json(
        { error: 'Relacionamento não encontrado' },
        { status: 404 }
      );
    }

    // Preparar dados para atualização
    const updateData: any = {};
    if (body.horas !== undefined) updateData.horas = body.horas;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Nenhum dado fornecido para atualização' },
        { status: 400 }
      );
    }

    // Atualizar o relacionamento
    const { data, error } = await supabaseAdmin
      .from('produto_mao_de_obra')
      .update(updateData)
      .eq('id', id)
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
      logError(`Erro ao atualizar mão de obra do produto ${id}`, error);
      return NextResponse.json(
        { error: 'Erro ao atualizar mão de obra do produto' },
        { status: 500 }
      );
    }

    logInfo(`Mão de obra do produto atualizada ${id}`);
    
    return NextResponse.json({
      message: 'Mão de obra atualizada com sucesso',
      data
    });
  } catch (error) {
    logError('Erro não tratado ao atualizar mão de obra do produto', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/produtos/mao-de-obra/[id]
 * Remove mão de obra associada a um produto
 */
export const DELETE = withAuth(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID do relacionamento não fornecido' },
        { status: 400 }
      );
    }

    // Verificar se o relacionamento existe
    const { data: relacionamento, error: relacionamentoError } = await supabaseAdmin
      .from('produto_mao_de_obra')
      .select('id')
      .eq('id', id)
      .single();

    if (relacionamentoError || !relacionamento) {
      return NextResponse.json(
        { error: 'Relacionamento não encontrado' },
        { status: 404 }
      );
    }

    // Excluir o relacionamento
    const { error } = await supabaseAdmin
      .from('produto_mao_de_obra')
      .delete()
      .eq('id', id);

    if (error) {
      logError(`Erro ao excluir mão de obra do produto ${id}`, error);
      return NextResponse.json(
        { error: 'Erro ao excluir mão de obra do produto' },
        { status: 500 }
      );
    }

    logInfo(`Mão de obra do produto excluída ${id}`);
    
    return NextResponse.json({
      message: 'Mão de obra removida do produto com sucesso'
    });
  } catch (error) {
    logError('Erro não tratado ao excluir mão de obra do produto', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
});