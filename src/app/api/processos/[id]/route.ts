/**
 * API para gerenciamento de processo de fabricação específico
 * Endpoints para obter detalhes, atualizar e excluir um processo
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/server';
import { withAuth } from '../../middleware';
import { logError, logInfo } from '@/utils/logger';
import { ProcessoFabricacao } from '@/types';

// Função auxiliar para verificar se o processo existe
async function processoExists(id: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('processos_fabricacao')
    .select('id')
    .eq('id', id)
    .maybeSingle();
    
  return !error && !!data;
}

// Função auxiliar para verificar se o processo está sendo usado em pedidos
async function processoEmUso(id: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('processos_pedidos')
    .select('id')
    .eq('processo_id', id)
    .limit(1);
    
  return !error && data && data.length > 0;
}

/**
 * GET /api/processos/[id]
 * Obtém detalhes de um processo de fabricação específico
 */
export const GET = withAuth(async (
  req: NextRequest, 
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    // Aguarda o parâmetro id de forma assíncrona
    const { id } = await params;
    
    // Verifica se o ID é válido
    if (!id) {
      return NextResponse.json(
        { error: 'ID do processo não fornecido' },
        { status: 400 }
      );
    }
    
    // Busca o processo no banco de dados
    const { data, error } = await supabaseAdmin
      .from('processos_fabricacao')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      logError(`Erro ao buscar processo com ID ${id}`, error);
      
      // Verifica se o erro é de registro não encontrado
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Processo não encontrado' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Erro ao buscar processo' },
        { status: 500 }
      );
    }
    
    logInfo(`Detalhes do processo ${id} obtidos com sucesso`, { nome: data.nome });
    
    return NextResponse.json({ data });
  } catch (error) {
    logError('Erro não tratado ao buscar detalhes do processo', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/processos/[id]
 * Atualiza um processo de fabricação existente
 */
export const PUT = withAuth(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    // Aguarda o parâmetro id de forma assíncrona
    const { id } = await params;
    
    // Verifica se o ID é válido
    if (!id) {
      return NextResponse.json(
        { error: 'ID do processo não fornecido' },
        { status: 400 }
      );
    }
    
    // Verifica se o processo existe
    const exists = await processoExists(id);
    if (!exists) {
      return NextResponse.json(
        { error: 'Processo não encontrado' },
        { status: 404 }
      );
    }
    
    // Parse do corpo da requisição
    const body = await req.json();
    
    // Validação dos campos
    if (body.nome === '') {
      return NextResponse.json(
        { error: 'Nome do processo não pode ser vazio' },
        { status: 400 }
      );
    }
    
    if (body.preco_por_unidade !== undefined && body.preco_por_unidade < 0) {
      return NextResponse.json(
        { error: 'Preço por hora deve ser um valor positivo ou zero' },
        { status: 400 }
      );
    }
    
    if (body.tempo_estimado_minutos !== undefined && body.tempo_estimado_minutos <= 0) {
      return NextResponse.json(
        { error: 'Tempo estimado deve ser um valor positivo' },
        { status: 400 }
      );
    }
    
    // Se o nome foi fornecido, verifica se já existe outro processo com o mesmo nome
    if (body.nome) {
      const { data: processoExistente, error: errorVerificacao } = await supabaseAdmin
        .from('processos_fabricacao')
        .select('id')
        .ilike('nome', body.nome)
        .neq('id', id)
        .maybeSingle();
        
      if (processoExistente) {
        return NextResponse.json(
          { error: 'Já existe outro processo com este nome' },
          { status: 409 }
        );
      }
    }
    
    // Prepara os dados para atualização
    const updateData: Partial<ProcessoFabricacao> = {};
    
    if (body.nome !== undefined) updateData.nome = body.nome;
    if (body.preco_por_unidade !== undefined) updateData.preco_por_unidade = body.preco_por_unidade;
    if (body.tempo_estimado_minutos !== undefined) updateData.tempo_estimado_minutos = body.tempo_estimado_minutos;
    if (body.unidade_medida !== undefined) updateData.unidade_medida = body.unidade_medida;
    
    // Verifica se há dados para atualizar
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Nenhum dado fornecido para atualização' },
        { status: 400 }
      );
    }
    
    // Atualiza o processo no banco de dados
    const { data, error } = await supabaseAdmin
      .from('processos_fabricacao')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      logError(`Erro ao atualizar processo com ID ${id}`, error);
      
      // Verifica se o erro é de chave única violada
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Já existe outro processo com este nome' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Erro ao atualizar processo' },
        { status: 500 }
      );
    }
    
    logInfo(`Processo ${id} atualizado com sucesso`, { nome: data.nome });
    
    return NextResponse.json({
      message: 'Processo atualizado com sucesso',
      data
    });
  } catch (error) {
    logError('Erro não tratado ao atualizar processo', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/processos/[id]
 * Remove um processo de fabricação existente
 */
export const DELETE = withAuth(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    // Aguarda o parâmetro id de forma assíncrona
    const { id } = await params;
    
    // Verifica se o ID é válido
    if (!id) {
      return NextResponse.json(
        { error: 'ID do processo não fornecido' },
        { status: 400 }
      );
    }
    
    // Verifica se o processo existe
    const exists = await processoExists(id);
    if (!exists) {
      return NextResponse.json(
        { error: 'Processo não encontrado' },
        { status: 404 }
      );
    }
    
    // Verifica se o processo está sendo usado em algum pedido
    const emUso = await processoEmUso(id);
    if (emUso) {
      return NextResponse.json(
        { error: 'Não é possível excluir o processo pois ele está sendo usado em pedidos' },
        { status: 409 }
      );
    }
    
    // Obtém os detalhes do processo antes de excluí-lo (para logging)
    const { data: processo } = await supabaseAdmin
      .from('processos_fabricacao')
      .select('nome')
      .eq('id', id)
      .single();
    
    // Exclui o processo
    const { error } = await supabaseAdmin
      .from('processos_fabricacao')
      .delete()
      .eq('id', id);
    
    if (error) {
      logError(`Erro ao excluir processo com ID ${id}`, error);
      return NextResponse.json(
        { error: 'Erro ao excluir processo' },
        { status: 500 }
      );
    }
    
    logInfo(`Processo ${id} excluído com sucesso`, { nome: processo?.nome });
    
    return NextResponse.json({
      message: 'Processo removido com sucesso'
    });
  } catch (error) {
    logError('Erro não tratado ao excluir processo', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
}); 