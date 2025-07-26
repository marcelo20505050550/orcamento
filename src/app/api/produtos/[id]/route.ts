/**
 * API para gerenciamento de produto específico
 * Endpoints para obter detalhes, atualizar e excluir um produto
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/server';
import { withAuth } from '../../middleware';
import { logError, logInfo } from '@/utils/logger';
import { Produto } from '@/types';

// Função auxiliar para verificar se o produto existe
async function produtoExists(id: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('produtos')
    .select('id')
    .eq('id', id)
    .maybeSingle();
    
  return !error && !!data;
}

/**
 * GET /api/produtos/[id]
 * Obtém detalhes de um produto específico
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
        { error: 'ID do produto não fornecido' },
        { status: 400 }
      );
    }
    
    // Busca o produto no banco de dados
    const { data, error } = await supabaseAdmin
      .from('produtos')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      logError(`Erro ao buscar produto com ID ${id}`, error);
      
      // Verifica se o erro é de registro não encontrado
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Produto não encontrado' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Erro ao buscar produto' },
        { status: 500 }
      );
    }
    
    logInfo(`Detalhes do produto ${id} obtidos com sucesso`);
    
    return NextResponse.json({ data });
  } catch (error) {
    logError('Erro não tratado ao buscar detalhes do produto', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/produtos/[id]
 * Atualiza um produto existente
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
        { error: 'ID do produto não fornecido' },
        { status: 400 }
      );
    }
    
    // Verifica se o produto existe
    const exists = await produtoExists(id);
    if (!exists) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }
    
    // Parse do corpo da requisição
    const body = await req.json();
    
    // Validação dos campos obrigatórios
    if (body.nome === '') {
      return NextResponse.json(
        { error: 'Nome do produto não pode ser vazio' },
        { status: 400 }
      );
    }
    
    if (body.preco_unitario !== undefined && body.preco_unitario < 0) {
      return NextResponse.json(
        { error: 'Preço unitário deve ser um valor positivo' },
        { status: 400 }
      );
    }
    
    if (body.quantidade_necessaria !== undefined && body.quantidade_necessaria < 0) {
      return NextResponse.json(
        { error: 'Quantidade necessária deve ser um valor positivo' },
        { status: 400 }
      );
    }
    
    if (body.margem_lucro_percentual !== undefined && body.margem_lucro_percentual < 0) {
      return NextResponse.json(
        { error: 'Margem de lucro deve ser um valor positivo ou zero' },
        { status: 400 }
      );
    }
    
    // Validação específica para produtos simples
    if (body.tipo_produto === 'simples') {
      if (!body.preco_unitario || body.preco_unitario <= 0) {
        return NextResponse.json(
          { error: 'Preço unitário é obrigatório e deve ser maior que zero para produtos simples' },
          { status: 400 }
        );
      }
      if (!body.quantidade_necessaria || body.quantidade_necessaria <= 0) {
        return NextResponse.json(
          { error: 'Quantidade necessária é obrigatória e deve ser maior que zero para produtos simples' },
          { status: 400 }
        );
      }
    }
    
    // Prepara os dados para atualização
    const updateData: any = {};
    
    // Inclui apenas os campos que foram fornecidos
    if (body.nome !== undefined) updateData.nome = body.nome;
    if (body.codigo_produto !== undefined) updateData.codigo_produto = body.codigo_produto;
    if (body.descricao !== undefined) updateData.descricao = body.descricao;
    if (body.preco_unitario !== undefined) updateData.preco_unitario = body.preco_unitario;
    if (body.quantidade_necessaria !== undefined) updateData.quantidade_necessaria = body.quantidade_necessaria;
    if (body.e_materia_prima !== undefined) updateData.e_materia_prima = body.e_materia_prima;
    if (body.tipo_produto !== undefined) updateData.tipo_produto = body.tipo_produto;
    if (body.margem_lucro_percentual !== undefined) updateData.margem_lucro_percentual = body.margem_lucro_percentual;
    
    // Atualiza o produto no banco de dados
    const { data, error } = await supabaseAdmin
      .from('produtos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      logError(`Erro ao atualizar produto com ID ${id}`, error);
      
      // Verifica se o erro é de chave única violada
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Já existe um produto com este nome' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Erro ao atualizar produto' },
        { status: 500 }
      );
    }
    
    logInfo(`Produto ${id} atualizado com sucesso`);
    
    return NextResponse.json({
      message: 'Produto atualizado com sucesso',
      data
    });
  } catch (error) {
    logError('Erro não tratado ao atualizar produto', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/produtos/[id]
 * Exclui um produto existente
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
        { error: 'ID do produto não fornecido' },
        { status: 400 }
      );
    }
    
    // Verifica se o produto existe
    const exists = await produtoExists(id);
    if (!exists) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }
    
    // Verifica se o produto está sendo usado em dependências
    const { data: dependencias } = await supabaseAdmin
      .from('dependencias_produtos')
      .select('id')
      .or(`produto_pai_id.eq.${id},produto_filho_id.eq.${id}`)
      .limit(1);
      
    if (dependencias && dependencias.length > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir o produto pois ele está sendo usado em dependências de outros produtos' },
        { status: 409 }
      );
    }
    
    // Verifica se o produto está sendo usado em pedidos
    const { data: pedidos } = await supabaseAdmin
      .from('pedidos')
      .select('id')
      .eq('produto_id', id)
      .limit(1);
      
    if (pedidos && pedidos.length > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir o produto pois ele está sendo usado em pedidos' },
        { status: 409 }
      );
    }
    
    // Obtém os detalhes do produto antes de excluí-lo (para logging)
    const { data: produto } = await supabaseAdmin
      .from('produtos')
      .select('nome')
      .eq('id', id)
      .single();
    
    // Tenta excluir o produto
    const { error } = await supabaseAdmin
      .from('produtos')
      .delete()
      .eq('id', id);
      
    if (error) {
      logError(`Erro ao excluir produto com ID ${id}`, error);
      
      // Verifica se o erro é de violação de chave estrangeira
      if (error.code === '23503') {
        return NextResponse.json(
          { error: 'Não é possível excluir o produto pois ele está sendo usado em outros registros' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Erro ao excluir produto' },
        { status: 500 }
      );
    }
    
    logInfo(`Produto ${id} excluído com sucesso`, { nome: produto?.nome });
    
    return NextResponse.json({
      message: 'Produto excluído com sucesso'
    });
  } catch (error) {
    logError('Erro não tratado ao excluir produto', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
}); 