/**
 * API para buscar produtos em estrutura hierárquica
 * Retorna apenas produtos raiz (que não são componentes de outros produtos)
 * com suas dependências aninhadas
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { withAuth } from '../../middleware';
import { logError, logInfo } from '@/utils/logger';

interface ProdutoHierarquia {
    id: string;
    nome: string;
    descricao: string;
    preco_unitario: number;
    quantidade_estoque: number;
    e_materia_prima: boolean;
    created_at: string;
    updated_at: string;
    nivel: number;
    quantidade_necessaria?: number;
    dependencias: ProdutoHierarquia[];
}

/**
 * GET /api/produtos/hierarquia
 * Retorna produtos em estrutura hierárquica
 */
export const GET = withAuth(async (_req: NextRequest, _context?: any) => {
    try {
        // Função recursiva para buscar dependências
        const buscarDependenciasRecursivas = async (
            produtoId: string,
            nivel: number = 0,
            visitados: Set<string> = new Set()
        ): Promise<ProdutoHierarquia[]> => {
            // Evitar loops infinitos
            if (visitados.has(produtoId)) {
                return [];
            }
            visitados.add(produtoId);

            // Buscar dependências diretas
            const { data: dependencias, error } = await supabaseAdmin
                .from('dependencias_produtos')
                .select(`
                    quantidade_necessaria,
                    produto_filho:produtos!dependencias_produtos_produto_filho_id_fkey (
                        id,
                        nome,
                        descricao,
                        preco_unitario,
                        quantidade_estoque,
                        e_materia_prima,
                        created_at,
                        updated_at
                    )
                `)
                .eq('produto_pai_id', produtoId);

            if (error) {
                logError(`Erro ao buscar dependências para hierarquia`, error);
                return [];
            }

            const resultado: ProdutoHierarquia[] = [];

            for (const dep of dependencias) {
                const produto = dep.produto_filho;
                
                if (!produto) continue;

                // Buscar dependências recursivas do produto filho
                const subDependencias = await buscarDependenciasRecursivas(
                    produto.id,
                    nivel + 1,
                    new Set(visitados)
                );

                resultado.push({
                    id: produto.id,
                    nome: produto.nome,
                    descricao: produto.descricao || '',
                    preco_unitario: produto.preco_unitario,
                    quantidade_estoque: produto.quantidade_estoque,
                    e_materia_prima: produto.e_materia_prima,
                    created_at: produto.created_at,
                    updated_at: produto.updated_at,
                    nivel: nivel + 1,
                    quantidade_necessaria: dep.quantidade_necessaria,
                    dependencias: subDependencias
                });
            }

            return resultado;
        };

        // Primeiro, buscar todos os produtos para debug
        const { data: todosProdutos, error: todosError } = await supabaseAdmin
            .from('produtos')
            .select('id, nome');

        if (todosError) {
            logError('Erro ao buscar todos os produtos', todosError);
        } else {
            logInfo('Produtos encontrados:', { total: todosProdutos?.length || 0, produtos: todosProdutos });
        }

        // Buscar todos os IDs de produtos que são filhos (componentes)
        const { data: produtosFilhos, error: filhosError } = await supabaseAdmin
            .from('dependencias_produtos')
            .select('produto_filho_id');

        if (filhosError) {
            logError('Erro ao buscar produtos filhos', filhosError);
        } else {
            logInfo('Produtos filhos encontrados:', { total: produtosFilhos?.length || 0, filhos: produtosFilhos });
        }

        const idsFilhos = produtosFilhos?.map(p => p.produto_filho_id) || [];

        // Buscar produtos que não são componentes de outros produtos (produtos raiz)
        let query = supabaseAdmin
            .from('produtos')
            .select(`
                id,
                nome,
                descricao,
                preco_unitario,
                quantidade_estoque,
                e_materia_prima,
                created_at,
                updated_at
            `);

        if (idsFilhos.length > 0) {
            query = query.not('id', 'in', `(${idsFilhos.join(',')})`);
        }

        const { data: produtosRaiz, error: produtosError } = await query;

        if (produtosError) {
            logError('Erro ao buscar produtos raiz', produtosError);
            return NextResponse.json(
                { error: 'Erro ao buscar produtos' },
                { status: 500 }
            );
        }

        logInfo('Produtos raiz encontrados:', { total: produtosRaiz?.length || 0, produtos: produtosRaiz });

        // Construir hierarquia para cada produto raiz
        const hierarquia: ProdutoHierarquia[] = [];

        if (produtosRaiz && produtosRaiz.length > 0) {
            for (const produto of produtosRaiz) {
                const dependencias = await buscarDependenciasRecursivas(produto.id);

                hierarquia.push({
                    id: produto.id,
                    nome: produto.nome,
                    descricao: produto.descricao || '',
                    preco_unitario: produto.preco_unitario,
                    quantidade_estoque: produto.quantidade_estoque,
                    e_materia_prima: produto.e_materia_prima,
                    created_at: produto.created_at,
                    updated_at: produto.updated_at,
                    nivel: 0,
                    dependencias: dependencias
                });
            }
        }

        logInfo(`Hierarquia de produtos gerada`, {
            totalProdutosRaiz: hierarquia.length
        });

        return NextResponse.json({ data: hierarquia });
    } catch (error) {
        logError('Erro não tratado ao buscar hierarquia de produtos', error);
        return NextResponse.json(
            { error: 'Erro interno ao processar a requisição' },
            { status: 500 }
        );
    }
});