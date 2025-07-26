/**
 * API para gerenciamento de dependência específica
 * Endpoints para obter, atualizar e excluir uma dependência específica
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { withAuth } from '../../../middleware';
import { logError, logInfo } from '@/utils/logger';

/**
 * GET /api/produtos/dependencias/[id]
 * Obtém uma dependência específica
 */
export const GET = withAuth(async (req: NextRequest, context: { params?: Promise<Record<string, string>> }) => {
  try {
    // Aguarda os parâmetros de forma assíncrona (Next.js 15)
    const params = await context.params;
    const id = params?.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID da dependência é obrigatório' },
        { status: 400 }
      );
    }

    // Busca a dependência com informações dos produtos relacionados
    const { data, error } = await supabaseAdmin
      .from('dependencias_produtos')
      .select(`
        id,
        quantidade_necessaria,
        created_at,
        updated_at,
        produto_pai:produto_pai_id(id, nome, e_materia_prima),
        produto_filho:produto_filho_id(id, nome, e_materia_prima, preco_unitario)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Dependência não encontrada' },
          { status: 404 }
        );
      }
      
      logError('Erro ao buscar dependência', error);
      return NextResponse.json(
        { error: 'Erro ao obter dependência' },
        { status: 500 }
      );
    }

    logInfo(`Dependência ${id} obtida com sucesso`);
    
    return NextResponse.json(data);
  } catch (error) {
    logError('Erro não tratado ao obter dependência', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
});

/**
 * PUT /api/produtos/dependencias/[id]
 * Atualiza uma dependência específica
 */
export const PUT = withAuth(async (req: NextRequest, context: { params?: Promise<Record<string, string>> }) => {
  try {
    // Aguarda os parâmetros de forma assíncrona (Next.js 15)
    const params = await context.params;
    const id = params?.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID da dependência é obrigatório' },
        { status: 400 }
      );
    }

    const body = await req.json();
    console.log('Dados recebidos para atualização da dependência:', body);

    // Validação dos campos obrigatórios
    if (!body.quantidade_necessaria || body.quantidade_necessaria <= 0) {
      return NextResponse.json(
        { error: 'Quantidade necessária deve ser maior que zero' },
        { status: 400 }
      );
    }

    // Verifica se a dependência existe
    const { data: dependenciaExistente, error: errorExistente } = await supabaseAdmin
      .from('dependencias_produtos')
      .select('id, produto_pai_id, produto_filho_id')
      .eq('id', id)
      .single();

    if (errorExistente || !dependenciaExistente) {
      return NextResponse.json(
        { error: 'Dependência não encontrada' },
        { status: 404 }
      );
    }

    // Se o produto filho está sendo alterado, fazer validações
    if (body.produto_filho_id && body.produto_filho_id !== dependenciaExistente.produto_filho_id) {
      // Verifica se o novo produto filho existe
      const { data: produtoFilho, error: errorFilho } = await supabaseAdmin
        .from('produtos')
        .select('id, nome')
        .eq('id', body.produto_filho_id)
        .single();

      if (errorFilho || !produtoFilho) {
        return NextResponse.json(
          { error: 'Produto filho não encontrado' },
          { status: 404 }
        );
      }

      // Verifica se não é uma dependência circular
      if (dependenciaExistente.produto_pai_id === body.produto_filho_id) {
        return NextResponse.json(
          { error: 'Um produto não pode depender de si mesmo' },
          { status: 400 }
        );
      }

      // Verifica se já existe uma dependência com o novo produto filho
      const { data: dependenciaDuplicada } = await supabaseAdmin
        .from('dependencias_produtos')
        .select('id')
        .eq('produto_pai_id', dependenciaExistente.produto_pai_id)
        .eq('produto_filho_id', body.produto_filho_id)
        .neq('id', id)
        .single();

      if (dependenciaDuplicada) {
        return NextResponse.json(
          { error: 'Já existe uma dependência com este produto filho' },
          { status: 409 }
        );
      }
    }

    // Prepara os dados para atualização
    const updateData: any = {
      quantidade_necessaria: body.quantidade_necessaria,
      updated_at: new Date().toISOString()
    };

    if (body.produto_filho_id) {
      updateData.produto_filho_id = body.produto_filho_id;
    }

    // Atualiza a dependência
    const { data, error } = await supabaseAdmin
      .from('dependencias_produtos')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        quantidade_necessaria,
        created_at,
        updated_at,
        produto_pai:produto_pai_id(id, nome, e_materia_prima),
        produto_filho:produto_filho_id(id, nome, e_materia_prima, preco_unitario)
      `)
      .single();

    if (error) {
      console.error('Erro do Supabase ao atualizar dependência:', error);
      logError('Erro ao atualizar dependência', error);
      return NextResponse.json(
        { error: `Erro ao atualizar dependência: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('Dependência atualizada com sucesso:', data);
    logInfo('Dependência atualizada com sucesso', { id: data.id });

    return NextResponse.json(
      { message: 'Dependência atualizada com sucesso', data }
    );
  } catch (error) {
    console.error('Exceção ao atualizar dependência:', error);
    logError('Erro não tratado ao atualizar dependência', error);
    return NextResponse.json(
      { 
        error: 'Erro interno ao processar a requisição',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/produtos/dependencias/[id]
 * Exclui uma dependência específica
 */
export const DELETE = withAuth(async (req: NextRequest, context: { params?: Promise<Record<string, string>> }) => {
  try {
    // Aguarda os parâmetros de forma assíncrona (Next.js 15)
    const params = await context.params;
    const id = params?.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID da dependência é obrigatório' },
        { status: 400 }
      );
    }

    // Verifica se a dependência existe antes de excluir
    const { data: dependenciaExistente, error: errorExistente } = await supabaseAdmin
      .from('dependencias_produtos')
      .select(`
        id,
        produto_pai:produto_pai_id(nome),
        produto_filho:produto_filho_id(nome)
      `)
      .eq('id', id)
      .single();

    if (errorExistente || !dependenciaExistente) {
      return NextResponse.json(
        { error: 'Dependência não encontrada' },
        { status: 404 }
      );
    }

    // Exclui a dependência
    const { error } = await supabaseAdmin
      .from('dependencias_produtos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro do Supabase ao excluir dependência:', error);
      logError('Erro ao excluir dependência', error);
      return NextResponse.json(
        { error: `Erro ao excluir dependência: ${error.message}` },
        { status: 500 }
      );
    }

    console.log('Dependência excluída com sucesso:', id);
    logInfo('Dependência excluída com sucesso', { 
      id,
      produto_pai: dependenciaExistente.produto_pai?.nome,
      produto_filho: dependenciaExistente.produto_filho?.nome
    });

    return NextResponse.json(
      { message: 'Dependência excluída com sucesso' }
    );
  } catch (error) {
    console.error('Exceção ao excluir dependência:', error);
    logError('Erro não tratado ao excluir dependência', error);
    return NextResponse.json(
      { 
        error: 'Erro interno ao processar a requisição',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
});