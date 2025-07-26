/**
 * API para gerenciamento de dependências de produtos
 * Endpoints para listar, criar, atualizar e excluir dependências de um produto específico
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { withAuth } from '../../../middleware';
import { logError, logInfo } from '@/utils/logger';

/**
 * GET /api/produtos/[id]/dependencias
 * Lista todas as dependências de um produto específico
 */
export const GET = withAuth(async (req: NextRequest, context: { params?: Promise<Record<string, string>> } | undefined) => {
  try {
    // Aguarda os parâmetros de forma assíncrona (Next.js 15)
    const params = await context?.params;
    const id = params?.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID do produto é obrigatório' },
        { status: 400 }
      );
    }

    // Busca as dependências do produto
    const { data: dependenciasRaw, error } = await supabaseAdmin
      .from('dependencias_produtos')
      .select('id, quantidade_necessaria, created_at, produto_pai_id, produto_filho_id')
      .eq('produto_pai_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      logError('Erro ao buscar dependências do produto', error);
      return NextResponse.json(
        { error: 'Erro ao obter dependências do produto' },
        { status: 500 }
      );
    }

    // Se não há dependências, retorna array vazio
    if (!dependenciasRaw || dependenciasRaw.length === 0) {
      logInfo(`Nenhuma dependência encontrada para o produto ${id}`);
      return NextResponse.json([]);
    }

    // Busca informações dos produtos pai e filho
    const produtosPaiIds = [...new Set(dependenciasRaw.map(d => d.produto_pai_id))];
    const produtosFilhoIds = [...new Set(dependenciasRaw.map(d => d.produto_filho_id))];
    const todosProdutosIds = [...new Set([...produtosPaiIds, ...produtosFilhoIds])];

    const { data: produtos, error: produtosError } = await supabaseAdmin
      .from('produtos')
      .select('id, nome, e_materia_prima, preco_unitario')
      .in('id', todosProdutosIds);

    if (produtosError) {
      logError('Erro ao buscar informações dos produtos', produtosError);
      return NextResponse.json(
        { error: 'Erro ao obter informações dos produtos' },
        { status: 500 }
      );
    }

    // Monta o resultado final com as informações dos produtos
    const data = dependenciasRaw.map(dep => {
      const produtoPai = produtos?.find(p => p.id === dep.produto_pai_id);
      const produtoFilho = produtos?.find(p => p.id === dep.produto_filho_id);
      
      return {
        id: dep.id,
        quantidade_necessaria: dep.quantidade_necessaria,
        created_at: dep.created_at,
        produto_pai: produtoPai ? {
          id: produtoPai.id,
          nome: produtoPai.nome,
          e_materia_prima: produtoPai.e_materia_prima
        } : null,
        produto_filho: produtoFilho ? {
          id: produtoFilho.id,
          nome: produtoFilho.nome,
          e_materia_prima: produtoFilho.e_materia_prima,
          preco_unitario: produtoFilho.preco_unitario
        } : null
      };
    });

    logInfo(`Listadas ${data.length} dependências do produto ${id}`);
    
    return NextResponse.json(data);
  } catch (error) {
    logError('Erro não tratado ao listar dependências do produto', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
});

/**
 * POST /api/produtos/[id]/dependencias
 * Adiciona uma nova dependência ao produto
 */
export const POST = withAuth(async (req: NextRequest, context: { params?: Promise<Record<string, string>> } | undefined) => {
  try {
    // Aguarda os parâmetros de forma assíncrona (Next.js 15)
    const params = await context?.params;
    const id = params?.id;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID do produto é obrigatório' },
        { status: 400 }
      );
    }

    const body = await req.json();
    console.log('Dados recebidos para nova dependência:', body);

    // Validação dos campos obrigatórios
    if (!body.produto_filho_id) {
      return NextResponse.json(
        { error: 'ID do produto filho é obrigatório' },
        { status: 400 }
      );
    }

    if (!body.quantidade_necessaria || body.quantidade_necessaria <= 0) {
      return NextResponse.json(
        { error: 'Quantidade necessária deve ser maior que zero' },
        { status: 400 }
      );
    }

    // Verifica se o produto pai existe
    const { data: produtoPai, error: errorPai } = await supabaseAdmin
      .from('produtos')
      .select('id, nome')
      .eq('id', id)
      .single();

    if (errorPai || !produtoPai) {
      return NextResponse.json(
        { error: 'Produto pai não encontrado' },
        { status: 404 }
      );
    }

    // Verifica se o produto filho existe
    const { data: produtoFilho, error: errorFilho } = await supabaseAdmin
      .from('produtos')
      .select('id, nome, e_materia_prima, preco_unitario')
      .eq('id', body.produto_filho_id)
      .single();

    if (errorFilho || !produtoFilho) {
      return NextResponse.json(
        { error: 'Produto filho não encontrado' },
        { status: 404 }
      );
    }

    // Verifica se não é uma dependência circular (produto dependendo de si mesmo)
    if (id === body.produto_filho_id) {
      return NextResponse.json(
        { error: 'Um produto não pode depender de si mesmo' },
        { status: 400 }
      );
    }

    // Verifica se a dependência já existe
    const { data: dependenciaExistente } = await supabaseAdmin
      .from('dependencias_produtos')
      .select('id')
      .eq('produto_pai_id', id)
      .eq('produto_filho_id', body.produto_filho_id)
      .single();

    if (dependenciaExistente) {
      return NextResponse.json(
        { error: 'Esta dependência já existe para este produto' },
        { status: 409 }
      );
    }

    // Cria a nova dependência
    const dependenciaData = {
      produto_pai_id: id,
      produto_filho_id: body.produto_filho_id,
      quantidade_necessaria: body.quantidade_necessaria
    };

    const { data: novaDependencia, error } = await supabaseAdmin
      .from('dependencias_produtos')
      .insert(dependenciaData)
      .select('id, quantidade_necessaria, created_at, produto_pai_id, produto_filho_id')
      .single();

    if (error) {
      console.error('Erro do Supabase ao inserir dependência:', error);
      logError('Erro ao inserir dependência', error);
      return NextResponse.json(
        { error: `Erro ao criar dependência: ${error.message}` },
        { status: 500 }
      );
    }

    // Monta o resultado final com as informações dos produtos
    const data = {
      id: novaDependencia.id,
      quantidade_necessaria: novaDependencia.quantidade_necessaria,
      created_at: novaDependencia.created_at,
      produto_pai: {
        id: produtoPai.id,
        nome: produtoPai.nome,
        e_materia_prima: false // Assumindo que o produto pai não é matéria-prima
      },
      produto_filho: {
        id: produtoFilho.id,
        nome: produtoFilho.nome,
        e_materia_prima: produtoFilho.e_materia_prima || false,
        preco_unitario: produtoFilho.preco_unitario || 0
      }
    };

    console.log('Dependência criada com sucesso:', data);
    logInfo('Dependência criada com sucesso', { 
      id: data.id, 
      produto_pai: produtoPai.nome,
      produto_filho: produtoFilho.nome 
    });

    return NextResponse.json(
      { message: 'Dependência criada com sucesso', data },
      { status: 201 }
    );
  } catch (error) {
    console.error('Exceção ao criar dependência:', error);
    logError('Erro não tratado ao criar dependência', error);
    return NextResponse.json(
      { 
        error: 'Erro interno ao processar a requisição',
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    );
  }
});