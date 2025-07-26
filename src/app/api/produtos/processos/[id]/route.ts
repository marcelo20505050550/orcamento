/**
 * API para gerenciamento de processo específico associado a um produto
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { withAuth } from '../../../middleware';
import { logError, logInfo } from '@/utils/logger';

/**
 * PUT /api/produtos/processos/[id]
 * Atualiza um processo associado a um produto
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
    if (body.quantidade !== undefined && body.quantidade <= 0) {
      return NextResponse.json(
        { error: 'Quantidade deve ser um valor positivo' },
        { status: 400 }
      );
    }

    if (body.unidade_medida && !['horas', 'quilos'].includes(body.unidade_medida)) {
      return NextResponse.json(
        { error: 'Unidade de medida deve ser "horas" ou "quilos"' },
        { status: 400 }
      );
    }

    // Verificar se o relacionamento existe
    const { data: relacionamento, error: relacionamentoError } = await supabaseAdmin
      .from('produto_processos')
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
    if (body.quantidade !== undefined) updateData.quantidade = body.quantidade;
    if (body.unidade_medida !== undefined) updateData.unidade_medida = body.unidade_medida;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Nenhum dado fornecido para atualização' },
        { status: 400 }
      );
    }

    // Atualizar o relacionamento
    const { data, error } = await supabaseAdmin
      .from('produto_processos')
      .update(updateData)
      .eq('id', id)
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
      logError(`Erro ao atualizar processo do produto ${id}`, error);
      return NextResponse.json(
        { error: 'Erro ao atualizar processo do produto' },
        { status: 500 }
      );
    }

    logInfo(`Processo do produto atualizado ${id}`);
    
    return NextResponse.json({
      message: 'Processo atualizado com sucesso',
      data
    });
  } catch (error) {
    logError('Erro não tratado ao atualizar processo do produto', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/produtos/processos/[id]
 * Remove um processo associado a um produto
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
      .from('produto_processos')
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
      .from('produto_processos')
      .delete()
      .eq('id', id);

    if (error) {
      logError(`Erro ao excluir processo do produto ${id}`, error);
      return NextResponse.json(
        { error: 'Erro ao excluir processo do produto' },
        { status: 500 }
      );
    }

    logInfo(`Processo do produto excluído ${id}`);
    
    return NextResponse.json({
      message: 'Processo removido do produto com sucesso'
    });
  } catch (error) {
    logError('Erro não tratado ao excluir processo do produto', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
});