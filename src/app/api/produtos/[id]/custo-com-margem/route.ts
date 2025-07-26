/**
 * API para calcular o custo total de um produto COM margem de lucro aplicada
 * Usa a mesma lógica do custo-total mas aplica a margem de lucro do produto
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: produtoId } = await params;
        console.log('[CUSTO COM MARGEM API] Buscando custo com margem para produto:', produtoId);

        if (!produtoId) {
            console.log('[CUSTO COM MARGEM API] Erro: ID do produto não fornecido');
            return NextResponse.json(
                { error: 'ID do produto não fornecido' },
                { status: 400 }
            );
        }

        // Buscar informações do produto incluindo margem de lucro
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
                margem_lucro_percentual,
                data_ultimo_calculo
            `)
            .eq('id', produtoId)
            .single();

        if (produtoError || !produto) {
            console.error('[CUSTO COM MARGEM API] Erro ao buscar produto:', produtoError);
            return NextResponse.json(
                { error: 'Produto não encontrado' },
                { status: 404 }
            );
        }

        // Se não há cálculo salvo ou é um produto de cálculo, forçar recálculo
        if (!produto.data_ultimo_calculo || produto.tipo_produto === 'calculo') {
            console.log('[CUSTO COM MARGEM API] Forçando recálculo via função do banco...');
            
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
        const custoBase = produto.tipo_produto === 'simples' 
            ? (produto.preco_unitario || 0) * (produto.quantidade_necessaria || 1)
            : (produto.custo_total_calculado || 0);

        // Aplicar margem de lucro: valor_com_margem = valor_total / (1 - margem_percentual/100)
        const margemLucroPercentual = produto.margem_lucro_percentual || 0;
        const margemDecimal = margemLucroPercentual / 100;
        
        const custoComMargem = margemDecimal > 0 && margemDecimal < 1 
            ? custoBase / (1 - margemDecimal)
            : custoBase;

        const valorMargemLucro = custoComMargem - custoBase;

        const resultado = {
            custo_base: custoBase,
            margem_lucro_percentual: margemLucroPercentual,
            valor_margem_lucro: valorMargemLucro,
            custo_com_margem: custoComMargem,
            detalhes: {
                tipo_produto: produto.tipo_produto,
                preco_unitario: produto.preco_unitario,
                quantidade_necessaria: produto.quantidade_necessaria,
                custo_materias_primas: produto.custo_materias_primas_calculado || 0,
                custo_processos: produto.custo_processos_calculado || 0,
                custo_mao_de_obra: produto.custo_mao_de_obra_calculado || 0,
                fonte: 'banco_de_dados',
                data_ultimo_calculo: produto.data_ultimo_calculo
            }
        };

        console.log('[CUSTO COM MARGEM API] ===== RESUMO FINAL =====');
        console.log(`[CUSTO COM MARGEM API] Produto: ${produtoId}`);
        console.log(`[CUSTO COM MARGEM API] Tipo: ${produto.tipo_produto}`);
        console.log(`[CUSTO COM MARGEM API] Custo Base: R$ ${custoBase.toFixed(2)}`);
        console.log(`[CUSTO COM MARGEM API] Margem de Lucro: ${margemLucroPercentual.toFixed(2)}%`);
        console.log(`[CUSTO COM MARGEM API] Valor da Margem: R$ ${valorMargemLucro.toFixed(2)}`);
        console.log(`[CUSTO COM MARGEM API] Custo com Margem: R$ ${custoComMargem.toFixed(2)}`);
        console.log('[CUSTO COM MARGEM API] ========================');

        return NextResponse.json(resultado);

    } catch (error) {
        console.error('[CUSTO COM MARGEM API] Erro não tratado ao calcular custo com margem:', error);
        return NextResponse.json(
            { error: 'Erro interno ao processar a requisição' },
            { status: 500 }
        );
    }
}