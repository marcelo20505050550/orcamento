/**
 * API para gerenciamento de dependência específica
 * Endpoints para obter detalhes, atualizar e remover uma dependência
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { withAuth } from '../../middleware';
import { logError, logInfo } from '@/utils/logger';
import { DependenciaProduto } from '@/types';

// Função auxiliar para verificar se a dependência existe
async function dependenciaExists(id: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('dependencias_produtos')
    .select('id')
    .eq('id', id)
    .maybeSingle();
    
  return !error && !!data;
}

/**
 * GET /api/dependencias/[id]
 * Obtém detalhes de uma dependência específica
 */
export const GET = withAuth(async (
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    // Verifica se o ID é válido
    if (!id) {
      return NextResponse.json(
        { error: 'ID da dependência não fornecido' },
        { status: 400 }
      );
    }
    
    // Busca a dependência no banco de dados com os dados dos produtos relacionados
    const { data, error } = await supabaseAdmin
      .from('dependencias_produtos')
      .select(`
        *,
        produto_pai:produto_pai_id(id, nome, preco_unitario, e_materia_prima),
        produto_filho:produto_filho_id(id, nome, preco_unitario, e_materia_prima)
      `)
      .eq('id', id)
      .single();
      
    if (error) {
      logError(`Erro ao buscar dependência com ID ${id}`, error);
      
      // Verifica se o erro é de registro não encontrado
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Dependência não encontrada' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Erro ao buscar dependência' },
        { status: 500 }
      );
    }
    
    logInfo(`Detalhes da dependência ${id} obtidos com sucesso`);
    
    return NextResponse.json({ data });
  } catch (error) {
    logError('Erro não tratado ao buscar detalhes da dependência', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/dependencias/[id]
 * Atualiza uma dependência existente
 * Só é possível atualizar a quantidade necessária
 */
export const PUT = withAuth(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    // Verifica se o ID é válido
    if (!id) {
      return NextResponse.json(
        { error: 'ID da dependência não fornecido' },
        { status: 400 }
      );
    }
    
    // Verifica se a dependência existe
    const exists = await dependenciaExists(id);
    if (!exists) {
      return NextResponse.json(
        { error: 'Dependência não encontrada' },
        { status: 404 }
      );
    }
    
    // Parse do corpo da requisição
    const body = await req.json();
    
    // Validação dos campos
    if (!body.quantidade_necessaria || body.quantidade_necessaria <= 0) {
      return NextResponse.json(
        { error: 'Quantidade necessária deve ser um valor positivo' },
        { status: 400 }
      );
    }
    
    // Prepara os dados para atualização
    // Nota: Apenas permitimos atualizar a quantidade, não os produtos relacionados
    const updateData: Partial<DependenciaProduto> = {
      quantidade_necessaria: body.quantidade_necessaria
    };
    
    // Atualiza a dependência no banco de dados
    const { data, error } = await supabaseAdmin
      .from('dependencias_produtos')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        produto_pai:produto_pai_id(id, nome),
        produto_filho:produto_filho_id(id, nome)
      `)
      .single();
      
    if (error) {
      logError(`Erro ao atualizar dependência com ID ${id}`, error);
      return NextResponse.json(
        { error: 'Erro ao atualizar dependência' },
        { status: 500 }
      );
    }
    
    logInfo(`Dependência ${id} atualizada com sucesso`, {
      quantidade_anterior: data.quantidade_necessaria,
      quantidade_nova: body.quantidade_necessaria
    });
    
    return NextResponse.json({
      message: 'Dependência atualizada com sucesso',
      data
    });
  } catch (error) {
    logError('Erro não tratado ao atualizar dependência', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/dependencias/[id]
 * Remove uma dependência existente
 */
export const DELETE = withAuth(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id } = await params;
    
    // Verifica se o ID é válido
    if (!id) {
      return NextResponse.json(
        { error: 'ID da dependência não fornecido' },
        { status: 400 }
      );
    }
    
    // Verifica se a dependência existe
    const exists = await dependenciaExists(id);
    if (!exists) {
      return NextResponse.json(
        { error: 'Dependência não encontrada' },
        { status: 404 }
      );
    }
    
    // Obtém os detalhes da dependência antes de excluí-la (para logging)
    const { data: dependenciaDetalhes } = await supabaseAdmin
      .from('dependencias_produtos')
      .select(`
        *,
        produto_pai:produto_pai_id(id, nome),
        produto_filho:produto_filho_id(id, nome)
      `)
      .eq('id', id)
      .single();
    
    // Remove a dependência do banco de dados
    const { error } = await supabaseAdmin
      .from('dependencias_produtos')
      .delete()
      .eq('id', id);
      
    if (error) {
      logError(`Erro ao remover dependência com ID ${id}`, error);
      return NextResponse.json(
        { error: 'Erro ao remover dependência' },
        { status: 500 }
      );
    }
    
    logInfo(`Dependência ${id} removida com sucesso`, {
      produto_pai: dependenciaDetalhes?.produto_pai?.nome,
      produto_filho: dependenciaDetalhes?.produto_filho?.nome
    });
    
    return NextResponse.json({
      message: 'Dependência removida com sucesso'
    });
  } catch (error) {
    logError('Erro não tratado ao remover dependência', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
}); 