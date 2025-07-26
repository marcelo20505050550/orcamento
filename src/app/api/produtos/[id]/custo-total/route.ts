/**
 * API para calcular o custo total de um produto
 * Calcula recursivamente o custo de produtos de cálculo considerando suas dependências
 * Agora salva os valores calculados diretamente na tabela produtos
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

// Função recursiva para calcular o custo total de um produto
async function calcularCustoTotalRecursivo(produtoId: string, visitados: Set<string> = new Set()): Promise<number> {
    // Evitar loops infinitos
    if (visitados.has(produtoId)) {
        console.log(`[CUSTO RECURSIVO] Loop detectado para produto ${produtoId}, retornando 0`);
        return 0;
    }
    visitados.add(produtoId);

    console.log(`[CUSTO RECURSIVO] Calculando custo para produto: ${produtoId}`);

    // Buscar informações do produto
    const { data: produto, error: produtoError } = await supabaseAdmin
        .from('produtos')
        .select('preco_unitario, quantidade_necessaria, tipo_produto, custo_total_calculado')
        .eq('id', produtoId)
        .single();

    if (produtoError || !produto) {
        console.error(`[CUSTO RECURSIVO] Erro ao buscar produto ${produtoId}:`, produtoError);
        return 0;
    }

    console.log(`[CUSTO RECURSIVO] Produto ${produtoId}: tipo=${produto.tipo_produto}`);

    if (produto.tipo_produto === 'simples') {
        // Para produtos simples: preço unitário × quantidade necessária
        const custo = (produto.preco_unitario || 0) * (produto.quantidade_necessaria || 1);
        console.log(`[CUSTO RECURSIVO] Produto simples ${produtoId}: R$ ${custo.toFixed(2)}`);
        return custo;
    }

    // Para produtos de cálculo, calcular soma de dependências + processos + mão de obra

    // 1. Calcular custo das dependências (matérias-primas)
    const { data: dependencias } = await supabaseAdmin
        .from('dependencias_produtos')
        .select(`
            quantidade_necessaria,
            produto_filho:produtos(id, tipo_produto, preco_unitario)
        `)
        .eq('produto_pai_id', produtoId);

    let custoMateriasPrimas = 0;
    if (dependencias && dependencias.length > 0) {
        for (const dep of dependencias) {
            if (dep.produto_filho) {
                const custoUnitarioDependencia = await calcularCustoTotalRecursivo(dep.produto_filho.id, visitados);
                const custoDependencia = custoUnitarioDependencia * dep.quantidade_necessaria;
                custoMateriasPrimas += custoDependencia;
                console.log(`[CUSTO RECURSIVO] Dependência ${dep.produto_filho.id}: R$ ${custoUnitarioDependencia.toFixed(2)} x ${dep.quantidade_necessaria} = R$ ${custoDependencia.toFixed(2)}`);
            }
        }
    }

    // 2. Calcular custo dos processos
    const { data: processos } = await supabaseAdmin
        .from('produto_processos')
        .select(`
            quantidade,
            processo:processos_fabricacao(preco_por_unidade)
        `)
        .eq('produto_id', produtoId);

    const custoProcessos = (processos || []).reduce((total: number, proc: any) => {
        const custo = (proc.processo?.preco_por_unidade || 0) * proc.quantidade;
        return total + custo;
    }, 0);

    // 3. Calcular custo da mão de obra
    const { data: maoDeObra } = await supabaseAdmin
        .from('produto_mao_de_obra')
        .select(`
            horas,
            mao_de_obra:mao_de_obra(preco_por_hora)
        `)
        .eq('produto_id', produtoId);

    const custoMaoDeObra = (maoDeObra || []).reduce((total: number, mao: any) => {
        const custo = (mao.mao_de_obra?.preco_por_hora || 0) * mao.horas;
        return total + custo;
    }, 0);

    const custoTotal = custoMateriasPrimas + custoProcessos + custoMaoDeObra;
    console.log(`[CUSTO RECURSIVO] Produto ${produtoId} - Matérias: R$ ${custoMateriasPrimas.toFixed(2)}, Processos: R$ ${custoProcessos.toFixed(2)}, Mão de obra: R$ ${custoMaoDeObra.toFixed(2)}, Total: R$ ${custoTotal.toFixed(2)}`);

    // Salvar os valores calculados na tabela produtos
    await supabaseAdmin
        .from('produtos')
        .update({
            custo_total_calculado: custoTotal,
            custo_materias_primas_calculado: custoMateriasPrimas,
            custo_processos_calculado: custoProcessos,
            custo_mao_de_obra_calculado: custoMaoDeObra,
            data_ultimo_calculo: new Date().toISOString()
        })
        .eq('id', produtoId);

    return custoTotal;
}

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: produtoId } = await params;
        console.log('[CUSTO API] Buscando custo para produto:', produtoId);

        if (!produtoId) {
            console.log('[CUSTO API] Erro: ID do produto não fornecido');
            return NextResponse.json(
                { error: 'ID do produto não fornecido' },
                { status: 400 }
            );
        }

        // Buscar informações do produto incluindo os campos calculados
        const { data: produto, error: produtoError } = await supabaseAdmin
            .from('produtos')
            .select(`
                preco_unitario, 
                quantidade_necessaria, 
                tipo_produto, 
                custo_total_calculado, 
                custo_materias_primas_calculado, 
                custo_processos_calculado, 
                custo_mao_de_obra_calculado, 
                data_ultimo_calculo
            `)
            .eq('id', produtoId)
            .single();

        if (produtoError || !produto) {
            console.error('[CUSTO API] Erro ao buscar produto:', produtoError);
            return NextResponse.json(
                { error: 'Produto não encontrado' },
                { status: 404 }
            );
        }

        // Se não há cálculo salvo ou é um produto de cálculo, forçar recálculo
        if (!produto.data_ultimo_calculo || produto.tipo_produto === 'calculo') {
            console.log('[CUSTO API] Forçando recálculo via função do banco...');
            
            // Chamar a função do banco para recalcular
            await supabaseAdmin.rpc('recalcular_custos_produto', {
                produto_id_param: produtoId
            });

            // Buscar os valores atualizados
            const { data: produtoAtualizado } = await supabaseAdmin
                .from('produtos')
                .select(`
                    custo_total_calculado, 
                    custo_materias_primas_calculado, 
                    custo_processos_calculado, 
                    custo_mao_de_obra_calculado
                `)
                .eq('id', produtoId)
                .single();

            if (produtoAtualizado) {
                produto.custo_total_calculado = produtoAtualizado.custo_total_calculado;
                produto.custo_materias_primas_calculado = produtoAtualizado.custo_materias_primas_calculado;
                produto.custo_processos_calculado = produtoAtualizado.custo_processos_calculado;
                produto.custo_mao_de_obra_calculado = produtoAtualizado.custo_mao_de_obra_calculado;
            }
        }

        // Para produtos simples, usar o preço unitário
        const custoTotal = produto.tipo_produto === 'simples' 
            ? (produto.preco_unitario || 0) * (produto.quantidade_necessaria || 1)
            : (produto.custo_total_calculado || 0);

        const resultado = {
            custo_total: custoTotal,
            detalhes: {
                tipo_produto: produto.tipo_produto,
                preco_unitario: produto.preco_unitario,
                quantidade_necessaria: produto.quantidade_necessaria,
                custo_materias_primas: produto.custo_materias_primas_calculado || 0,
                custo_processos: produto.custo_processos_calculado || 0,
                custo_mao_de_obra: produto.custo_mao_de_obra_calculado || 0,
                custo_total_calculado: custoTotal,
                fonte: 'banco_de_dados',
                data_ultimo_calculo: produto.data_ultimo_calculo
            }
        };

        console.log('[CUSTO API] ===== RESUMO FINAL =====');
        console.log(`[CUSTO API] Produto: ${produtoId}`);
        console.log(`[CUSTO API] Tipo: ${produto.tipo_produto}`);
        console.log(`[CUSTO API] Custo Total: R$ ${custoTotal.toFixed(2)}`);
        console.log(`[CUSTO API] Detalhamento:`);
        console.log(`[CUSTO API] - Matérias-primas: R$ ${(produto.custo_materias_primas_calculado || 0).toFixed(2)}`);
        console.log(`[CUSTO API] - Processos: R$ ${(produto.custo_processos_calculado || 0).toFixed(2)}`);
        console.log(`[CUSTO API] - Mão de obra: R$ ${(produto.custo_mao_de_obra_calculado || 0).toFixed(2)}`);
        console.log('[CUSTO API] ========================');

        return NextResponse.json(resultado);

    } catch (error) {
        console.error('[CUSTO API] Erro não tratado ao calcular custo total:', error);
        return NextResponse.json(
            { error: 'Erro interno ao processar a requisição' },
            { status: 500 }
        );
    }
}