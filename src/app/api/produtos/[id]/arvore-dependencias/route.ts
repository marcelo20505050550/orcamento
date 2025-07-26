/**
 * API para buscar árvore completa de dependências de um produto
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { withAuth } from '../../../middleware';

interface DependenciaArvore {
    id: string;
    nome: string;
    preco_unitario: number;
    e_materia_prima: boolean;
    quantidade_necessaria: number;
    nivel: number;
    dependencias: DependenciaArvore[];
}

/**
 * GET /api/produtos/[id]/arvore-dependencias
 * Retorna a árvore completa de dependências de um produto
 */
export const GET = withAuth(async (
    _req: NextRequest,
    context?: { params?: Promise<Record<string, string>> }
) => {
    try {
        if (!context?.params) {
            return NextResponse.json(
                { error: 'Parâmetros não fornecidos' },
                { status: 400 }
            );
        }

        const params = await context.params;
        const produtoId = params?.id;

        if (!produtoId) {
            return NextResponse.json(
                { error: 'ID do produto não fornecido' },
                { status: 400 }
            );
        }

        // Função recursiva para buscar dependências - versão simplificada
        const buscarDependenciasRecursivas = async (
            produtoId: string,
            nivel: number = 0,
            visitados: Set<string> = new Set()
        ): Promise<DependenciaArvore[]> => {
            // Evitar loops infinitos
            if (visitados.has(produtoId)) {
                return [];
            }
            visitados.add(produtoId);

            // Buscar dependências diretas
            console.log(`🔍 [API] Buscando dependências para produto ${produtoId}, nível ${nivel}`)
            const { data: dependencias, error } = await supabaseAdmin
                .from('dependencias_produtos')
                .select('quantidade_necessaria, produto_filho_id')
                .eq('produto_pai_id', produtoId);

            console.log(`🔍 [API] Dependências encontradas:`, dependencias)
            console.log(`🔍 [API] Erro na consulta:`, error)

            if (error) {
                console.error(`Erro ao buscar dependências para árvore:`, error);
                return [];
            }

            const resultado: DependenciaArvore[] = [];

            if (dependencias && dependencias.length > 0) {
                for (const dep of dependencias) {
                    // Buscar informações do produto filho
                    const { data: produto, error: produtoError } = await supabaseAdmin
                        .from('produtos')
                        .select('id, nome, preco_unitario, e_materia_prima')
                        .eq('id', dep.produto_filho_id)
                        .single();

                    if (produtoError || !produto) {
                        console.error('Erro ao buscar produto filho:', produtoError);
                        continue;
                    }

                    // Buscar dependências recursivas do produto filho
                    const subDependencias = await buscarDependenciasRecursivas(
                        produto.id,
                        nivel + 1,
                        new Set(visitados)
                    );

                    resultado.push({
                        id: produto.id,
                        nome: produto.nome,
                        preco_unitario: produto.preco_unitario,
                        e_materia_prima: produto.e_materia_prima,
                        quantidade_necessaria: dep.quantidade_necessaria,
                        nivel: nivel,
                        dependencias: subDependencias
                    });
                }
            }

            return resultado;
        };

        // Buscar informações do produto principal
        const { data: produto, error: produtoError } = await supabaseAdmin
            .from('produtos')
            .select('id, nome, preco_unitario, e_materia_prima')
            .eq('id', produtoId)
            .single();

        if (produtoError || !produto) {
            return NextResponse.json(
                { error: 'Produto não encontrado' },
                { status: 404 }
            );
        }

        // Buscar árvore de dependências
        console.log('🔍 [API] Iniciando busca de dependências para produto:', produtoId)
        const arvore = await buscarDependenciasRecursivas(produtoId);
        console.log('🔍 [API] Árvore de dependências encontrada:', arvore)

        const resultado = {
            produto: {
                id: produto.id,
                nome: produto.nome,
                preco_unitario: produto.preco_unitario,
                e_materia_prima: produto.e_materia_prima,
                nivel: 0
            },
            dependencias: arvore
        };

        console.log('🔍 [API] Resultado final sendo retornado:', resultado)
        return NextResponse.json(resultado);
    } catch (error) {
        console.error('Erro não tratado ao buscar árvore de dependências:', error);
        return NextResponse.json(
            { error: 'Erro interno ao processar a requisição' },
            { status: 500 }
        );
    }
});