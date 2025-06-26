/**
 * API para gerenciamento de tipo de mão de obra específico
 * Endpoints para obter detalhes, atualizar e excluir um tipo de mão de obra
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { withAuth } from '../../middleware';
import { logError, logInfo } from '@/utils/logger';
import { MaoDeObra } from '@/types';

// Função auxiliar para verificar se o tipo de mão de obra existe
async function maoDeObraExists(id: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('mao_de_obra')
    .select('id')
    .eq('id', id)
    .maybeSingle();
    
  return !error && !!data;
}

// Função auxiliar para verificar se o tipo de mão de obra está sendo usado em pedidos
async function maoDeObraEmUso(id: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('mao_de_obra_pedidos')
    .select('id')
    .eq('mao_de_obra_id', id)
    .limit(1);
    
  return !error && data && data.length > 0;
}

/**
 * GET /api/mao-de-obra/[id]
 * Obtém detalhes de um tipo de mão de obra específico
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
        { error: 'ID do tipo de mão de obra não fornecido' },
        { status: 400 }
      );
    }
    
    // Busca o tipo de mão de obra no banco de dados
    const { data, error } = await supabaseAdmin
      .from('mao_de_obra')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      logError(`Erro ao buscar tipo de mão de obra com ID ${id}`, error);
      
      // Verifica se o erro é de registro não encontrado
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Tipo de mão de obra não encontrado' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Erro ao buscar tipo de mão de obra' },
        { status: 500 }
      );
    }
    
    logInfo(`Detalhes do tipo de mão de obra ${id} obtidos com sucesso`, { tipo: data.tipo });
    
    return NextResponse.json({ data });
  } catch (error) {
    logError('Erro não tratado ao buscar detalhes do tipo de mão de obra', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/mao-de-obra/[id]
 * Atualiza um tipo de mão de obra existente
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
        { error: 'ID do tipo de mão de obra não fornecido' },
        { status: 400 }
      );
    }
    
    // Verifica se o tipo de mão de obra existe
    const exists = await maoDeObraExists(id);
    if (!exists) {
      return NextResponse.json(
        { error: 'Tipo de mão de obra não encontrado' },
        { status: 404 }
      );
    }
    
    // Parse do corpo da requisição
    const body = await req.json();
    
    // Validação dos campos
    if (body.tipo === '') {
      return NextResponse.json(
        { error: 'Tipo de mão de obra não pode ser vazio' },
        { status: 400 }
      );
    }
    
    if (body.preco_por_hora !== undefined && body.preco_por_hora <= 0) {
      return NextResponse.json(
        { error: 'Preço por hora deve ser um valor positivo' },
        { status: 400 }
      );
    }
    
    // Verifica se já existe outro tipo com o mesmo nome (ignorando maiúsculas/minúsculas)
    if (body.tipo) {
      const { data: tipoExistente } = await supabaseAdmin
        .from('mao_de_obra')
        .select('id')
        .ilike('tipo', body.tipo.trim())
        .neq('id', id)
        .maybeSingle();
        
      if (tipoExistente) {
        return NextResponse.json(
          { error: 'Já existe outro tipo de mão de obra com este nome' },
          { status: 409 }
        );
      }
    }
    
    // Prepara os dados para atualização
    const updateData: Partial<MaoDeObra> = {};
    
    if (body.tipo !== undefined) updateData.tipo = body.tipo;
    if (body.preco_por_hora !== undefined) updateData.preco_por_hora = body.preco_por_hora;
    
    // Verifica se há dados para atualizar
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Nenhum dado fornecido para atualização' },
        { status: 400 }
      );
    }
    
    // Atualiza o tipo de mão de obra no banco de dados
    const { data, error } = await supabaseAdmin
      .from('mao_de_obra')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      logError(`Erro ao atualizar tipo de mão de obra com ID ${id}`, error);
      
      // Verifica se o erro é de chave única violada
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Já existe outro tipo de mão de obra com este nome' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Erro ao atualizar tipo de mão de obra' },
        { status: 500 }
      );
    }
    
    logInfo(`Tipo de mão de obra ${id} atualizado com sucesso`, { tipo: data.tipo });
    
    return NextResponse.json({
      message: 'Tipo de mão de obra atualizado com sucesso',
      data
    });
  } catch (error) {
    logError('Erro não tratado ao atualizar tipo de mão de obra', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/mao-de-obra/[id]
 * Remove um tipo de mão de obra existente
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
        { error: 'ID do tipo de mão de obra não fornecido' },
        { status: 400 }
      );
    }
    
    // Verifica se o tipo de mão de obra existe
    const exists = await maoDeObraExists(id);
    if (!exists) {
      return NextResponse.json(
        { error: 'Tipo de mão de obra não encontrado' },
        { status: 404 }
      );
    }
    
    // Verifica se o tipo de mão de obra está sendo usado em algum pedido
    const emUso = await maoDeObraEmUso(id);
    if (emUso) {
      return NextResponse.json(
        { error: 'Não é possível excluir o tipo de mão de obra pois ele está sendo usado em pedidos' },
        { status: 409 }
      );
    }
    
    // Obtém os detalhes do tipo de mão de obra antes de excluí-lo (para logging)
    const { data: maoDeObraDetalhes } = await supabaseAdmin
      .from('mao_de_obra')
      .select('tipo')
      .eq('id', id)
      .single();
    
    // Remove o tipo de mão de obra do banco de dados
    const { error } = await supabaseAdmin
      .from('mao_de_obra')
      .delete()
      .eq('id', id);
      
    if (error) {
      logError(`Erro ao remover tipo de mão de obra com ID ${id}`, error);
      return NextResponse.json(
        { error: 'Erro ao remover tipo de mão de obra' },
        { status: 500 }
      );
    }
    
    logInfo(`Tipo de mão de obra ${id} removido com sucesso`, { tipo: maoDeObraDetalhes?.tipo });
    
    return NextResponse.json({
      message: 'Tipo de mão de obra removido com sucesso'
    });
  } catch (error) {
    logError('Erro não tratado ao remover tipo de mão de obra', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
}); 