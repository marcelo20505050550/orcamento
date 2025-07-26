/**
 * API para verificar dependências circulares
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { withAuth } from '../../../../middleware';
import { logError, logInfo } from '@/utils/logger';

/**
 * POST /api/produtos/[id]/dependencias/circular-check
 * Verifica se adicionar uma dependência criaria um ciclo
 */
export const POST = withAuth(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id: produtoId } = await params;
    const body = await req.json();
    const { produto_filho_id } = body;
    
    if (!produtoId || !produto_filho_id) {
      return NextResponse.json(
        { error: 'IDs de produto são obrigatórios' },
        { status: 400 }
      );
    }

    // Função recursiva para verificar dependências circulares
    const verificarCiclo = async (produtoAtual: string, produtoAlvo: string, visitados: Set<string>): Promise<boolean> => {
      // Se chegamos ao produto alvo, há um ciclo
      if (produtoAtual === produtoAlvo) {
        return true;
      }

      // Se já visitamos este produto, evitar loop infinito
      if (visitados.has(produtoAtual)) {
        return false;
      }

      visitados.add(produtoAtual);

      // Buscar todas as dependências do produto atual
      const { data: dependencias, error } = await supabaseAdmin
        .from('dependencias_produtos')
        .select('produto_filho_id')
        .eq('produto_pai_id', produtoAtual);

      if (error) {
        logError(`Erro ao buscar dependências para verificação circular`, error);
        return false;
      }

      // Verificar recursivamente cada dependência
      for (const dep of dependencias) {
        if (await verificarCiclo(dep.produto_filho_id, produtoAlvo, new Set(visitados))) {
          return true;
        }
      }

      return false;
    };

    // Verificar se adicionar produto_filho_id como dependência de produtoId criaria um ciclo
    // Isso aconteceria se produto_filho_id já depende (direta ou indiretamente) de produtoId
    const temCiclo = await verificarCiclo(produto_filho_id, produtoId, new Set());

    logInfo(`Verificação de ciclo: ${produtoId} -> ${produto_filho_id} = ${temCiclo ? 'CICLO DETECTADO' : 'OK'}`);

    return NextResponse.json({
      temCiclo,
      message: temCiclo 
        ? 'Esta dependência criaria um ciclo circular' 
        : 'Dependência pode ser adicionada sem criar ciclos'
    });
  } catch (error) {
    logError('Erro não tratado ao verificar dependência circular', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
});