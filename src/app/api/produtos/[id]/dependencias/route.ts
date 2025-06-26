/**
 * API para gerenciamento de dependências de um produto específico
 * Endpoint para listar todas as dependências de um produto
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/server';
import { withAuth } from '../../../middleware';
import { logError, logInfo } from '@/utils/logger';

/**
 * GET /api/produtos/[id]/dependencias
 * Lista todas as dependências de um produto específico
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
    
    // Verifica se o produto existe
    const { data: produto, error: errorProduto } = await supabaseAdmin
      .from('produtos')
      .select('id, nome')
      .eq('id', id)
      .single();
      
    if (errorProduto || !produto) {
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }
    
    // Obtém as dependências onde o produto é pai (produtos que ele necessita)
    const { data: componentesNecessarios, error: errorComponentes } = await supabaseAdmin
      .from('dependencias_produtos')
      .select(`
        id,
        quantidade_necessaria,
        produto_filho:produto_filho_id(
          id, 
          nome, 
          descricao, 
          preco_unitario, 
          quantidade_estoque, 
          e_materia_prima
        )
      `)
      .eq('produto_pai_id', id)
      .order('id');
      
    if (errorComponentes) {
      logError(`Erro ao buscar componentes do produto ${id}`, errorComponentes);
      return NextResponse.json(
        { error: 'Erro ao buscar componentes do produto' },
        { status: 500 }
      );
    }
    
    // Obtém as dependências onde o produto é filho (produtos que o utilizam)
    const { data: utilizadoEm, error: errorUtilizacoes } = await supabaseAdmin
      .from('dependencias_produtos')
      .select(`
        id,
        quantidade_necessaria,
        produto_pai:produto_pai_id(
          id, 
          nome, 
          descricao, 
          preco_unitario, 
          quantidade_estoque, 
          e_materia_prima
        )
      `)
      .eq('produto_filho_id', id)
      .order('id');
      
    if (errorUtilizacoes) {
      logError(`Erro ao buscar utilizações do produto ${id}`, errorUtilizacoes);
      return NextResponse.json(
        { error: 'Erro ao buscar utilizações do produto' },
        { status: 500 }
      );
    }
    
    logInfo(`Dependências do produto ${id} (${produto.nome}) obtidas com sucesso`);
    
    // Retorna as dependências organizadas
    return NextResponse.json({
      data: {
        produto: {
          id: produto.id,
          nome: produto.nome
        },
        componentes_necessarios: componentesNecessarios,
        utilizado_em: utilizadoEm
      }
    });
  } catch (error) {
    logError('Erro não tratado ao buscar dependências do produto', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
}); 