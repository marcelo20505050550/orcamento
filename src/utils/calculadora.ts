/**
 * Utilitários para cálculos relacionados a produtos, dependências e orçamentos
 * Implementa lógicas de negócio complexas para o sistema de orçamentos
 */
import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError, logInfo } from './logger';
import { 
  DependenciaRecursiva, 
  MateriaPrimaNecessaria, 
  ProcessoOrcamento, 
  MaoDeObraOrcamento,
  OrcamentoCompleto
} from '@/types';

/**
 * Calcula todas as dependências recursivas de um produto
 * 
 * @param produtoId - ID do produto para calcular dependências
 * @param quantidade - Quantidade do produto solicitada
 * @param nivel - Nível atual da recursão (usado internamente)
 * @param caminho - Caminho percorrido para chegar ao produto atual (usado internamente)
 * @param dependenciasEncontradas - Mapa de dependências já encontradas (usado internamente)
 * @returns Promise com array de dependências
 */
export async function calcularDependenciasRecursivas(
  produtoId: string,
  quantidade: number,
  nivel: number = 0,
  caminho: string[] = [],
  dependenciasEncontradas: Map<string, DependenciaRecursiva> = new Map()
): Promise<Map<string, DependenciaRecursiva>> {
  try {
    // Verifica se estamos em um loop infinito (definindo um limite máximo de recursão)
    if (nivel > 20) {
      logError(`Limite de recursão atingido ao calcular dependências para o produto ${produtoId}`, 
        { caminho, nivel }
      );
      return dependenciasEncontradas;
    }

    // Verifica se este produto já está no caminho atual (evita ciclos)
    if (caminho.includes(produtoId)) {
      logError(`Ciclo de dependência detectado para o produto ${produtoId}`, 
        { caminho, produtoId }
      );
      return dependenciasEncontradas;
    }

    // Adiciona o produto atual ao caminho
    const novoCaminho = [...caminho, produtoId];

    // Busca as dependências diretas do produto
    const { data: dependencias, error } = await supabaseAdmin
      .from('dependencias_produtos')
      .select(`
        produto_filho_id,
        quantidade_necessaria,
        produto_filho:produto_filho_id (
          nome,
          e_materia_prima
        )
      `)
      .eq('produto_pai_id', produtoId);

    if (error) {
      logError(`Erro ao buscar dependências do produto ${produtoId}`, error);
      return dependenciasEncontradas;
    }

    // Para cada dependência direta
    if (dependencias && Array.isArray(dependencias)) {
      for (const dep of dependencias) {
        const filhoId = dep.produto_filho_id;
        const quantidadeFilho = dep.quantidade_necessaria * quantidade;
        
        // Acessa produto_filho de forma segura usando any
        const produtoFilho = dep.produto_filho as any;
        let eMateriaPrima = false;
        
        // Verifica se o produto filho é matéria prima
        if (produtoFilho && typeof produtoFilho === 'object') {
          eMateriaPrima = Boolean(produtoFilho.e_materia_prima);
        }

        // Registra a dependência atual
        const dependenciaExistente = dependenciasEncontradas.get(filhoId);
        if (dependenciaExistente) {
          // Se já temos esta dependência, somamos a quantidade
          dependenciasEncontradas.set(filhoId, {
            ...dependenciaExistente,
            quantidade_necessaria: dependenciaExistente.quantidade_necessaria + quantidadeFilho
          });
        } else {
          // Caso contrário, adicionamos como nova dependência
          dependenciasEncontradas.set(filhoId, {
            produto_id: filhoId,
            quantidade_necessaria: quantidadeFilho,
            nivel: nivel + 1,
            caminho: novoCaminho
          });
        }

        // Se o produto filho não é matéria-prima, busca suas dependências recursivamente
        if (!eMateriaPrima) {
          await calcularDependenciasRecursivas(
            filhoId,
            quantidadeFilho,
            nivel + 1,
            novoCaminho,
            dependenciasEncontradas
          );
        }
      }
    }

    return dependenciasEncontradas;
  } catch (error) {
    logError(`Erro não tratado ao calcular dependências recursivas para o produto ${produtoId}`, error);
    throw error;
  }
}

/**
 * Calcula os requisitos de matérias-primas para um produto
 * 
 * @param produtoId - ID do produto para calcular requisitos
 * @param quantidade - Quantidade do produto solicitada
 * @returns Promise com array de matérias-primas necessárias
 */
export async function calcularRequisitosMateriasPrimas(
  produtoId: string,
  quantidade: number
): Promise<MateriaPrimaNecessaria[]> {
  try {
    // Calcula todas as dependências recursivas
    const dependencias = await calcularDependenciasRecursivas(produtoId, quantidade);
    
    // Filtra apenas produtos que são matérias-primas
    const materiasIds = Array.from(dependencias.keys());
    
    if (materiasIds.length === 0) {
      return [];
    }
    
    // Busca informações detalhadas das matérias-primas
    const { data: produtos, error } = await supabaseAdmin
      .from('produtos')
      .select('id, nome, preco_unitario, quantidade_estoque, e_materia_prima')
      .in('id', materiasIds)
      .eq('e_materia_prima', true);
      
    if (error) {
      logError(`Erro ao buscar detalhes das matérias-primas`, error);
      throw error;
    }
    
    // Mapeia os produtos para o formato desejado
    const materiasPrimas: MateriaPrimaNecessaria[] = [];
    
    if (produtos && Array.isArray(produtos)) {
      for (const produto of produtos) {
        const dependencia = dependencias.get(produto.id);
        if (dependencia) {
          materiasPrimas.push({
            produto_id: produto.id,
            nome: produto.nome,
            quantidade_necessaria: dependencia.quantidade_necessaria,
            preco_unitario: produto.preco_unitario,
            subtotal: produto.preco_unitario * dependencia.quantidade_necessaria,
            disponivel_estoque: produto.quantidade_estoque >= dependencia.quantidade_necessaria
          });
        }
      }
    }
    
    // Ordena por nome para facilitar a leitura
    return materiasPrimas.sort((a, b) => a.nome.localeCompare(b.nome));
  } catch (error) {
    logError(`Erro não tratado ao calcular requisitos de matérias-primas para o produto ${produtoId}`, error);
    throw error;
  }
}

/**
 * Calcula o custo total de materiais para um produto
 * 
 * @param produtoId - ID do produto para calcular custo
 * @param quantidade - Quantidade do produto solicitada
 * @returns Promise com o custo total
 */
export async function calcularCustoMateriais(
  produtoId: string,
  quantidade: number
): Promise<number> {
  try {
    const materiasPrimas = await calcularRequisitosMateriasPrimas(produtoId, quantidade);
    
    // Soma o subtotal de todas as matérias-primas
    return materiasPrimas.reduce((total, mp) => total + mp.subtotal, 0);
  } catch (error) {
    logError(`Erro não tratado ao calcular custo de materiais para o produto ${produtoId}`, error);
    throw error;
  }
}

/**
 * Calcula os custos de processos para um pedido
 * 
 * @param pedidoId - ID do pedido para calcular custos
 * @returns Promise com array de processos e seus custos
 */
export async function calcularCustosProcessos(
  pedidoId: string
): Promise<ProcessoOrcamento[]> {
  try {
    // Busca os processos associados ao pedido
    const { data: processosData, error } = await supabaseAdmin
      .from('processos_pedidos')
      .select(`
        processo_id,
        quantidade,
        processo:processo_id (
          nome,
          preco_por_unidade,
          tempo_estimado_minutos
        )
      `)
      .eq('pedido_id', pedidoId);
      
    if (error) {
      logError(`Erro ao buscar processos do pedido ${pedidoId}`, error);
      throw error;
    }
    
    // Mapeia os processos para o formato desejado
    const processos: ProcessoOrcamento[] = [];
    
    if (processosData && Array.isArray(processosData)) {
      for (const proc of processosData) {
        // Acessa os dados do processo de forma segura
        const processoInfo = proc.processo as any;
        
        if (processoInfo && typeof processoInfo === 'object') {
          const precoPorUnidade = processoInfo.preco_por_unidade || 0;
          const quantidade = proc.quantidade || 0;
          const tempoEstimado = processoInfo.tempo_estimado_minutos || 0;
          
          processos.push({
            processo_id: proc.processo_id,
            nome: processoInfo.nome || 'Processo sem nome',
            quantidade: quantidade,
            preco_por_unidade: precoPorUnidade,
            tempo_estimado_minutos: tempoEstimado,
            subtotal: precoPorUnidade * quantidade
          });
        }
      }
    }
    
    // Ordena por nome para facilitar a leitura
    return processos.sort((a, b) => a.nome.localeCompare(b.nome));
  } catch (error) {
    logError(`Erro não tratado ao calcular custos de processos para o pedido ${pedidoId}`, error);
    throw error;
  }
}

/**
 * Calcula o custo total de processos para um pedido
 * 
 * @param pedidoId - ID do pedido para calcular custo
 * @returns Promise com o custo total
 */
export async function calcularCustoTotalProcessos(
  pedidoId: string
): Promise<number> {
  try {
    const processos = await calcularCustosProcessos(pedidoId);
    
    // Soma o subtotal de todos os processos
    return processos.reduce((total, proc) => total + proc.subtotal, 0);
  } catch (error) {
    logError(`Erro não tratado ao calcular custo total de processos para o pedido ${pedidoId}`, error);
    throw error;
  }
}

/**
 * Calcula os custos de mão de obra para um pedido
 * 
 * @param pedidoId - ID do pedido para calcular custos
 * @returns Promise com array de tipos de mão de obra e seus custos
 */
export async function calcularCustosMaoDeObra(
  pedidoId: string
): Promise<MaoDeObraOrcamento[]> {
  try {
    // Busca os tipos de mão de obra associados ao pedido
    const { data: maoDeObraData, error } = await supabaseAdmin
      .from('mao_de_obra_pedidos')
      .select(`
        mao_de_obra_id,
        horas,
        mao_de_obra:mao_de_obra_id (
          tipo,
          preco_por_hora
        )
      `)
      .eq('pedido_id', pedidoId);
      
    if (error) {
      logError(`Erro ao buscar mão de obra do pedido ${pedidoId}`, error);
      throw error;
    }
    
    // Mapeia os tipos de mão de obra para o formato desejado
    const tiposMaoDeObra: MaoDeObraOrcamento[] = [];
    
    if (maoDeObraData && Array.isArray(maoDeObraData)) {
      for (const mdo of maoDeObraData) {
        // Acessa os dados do tipo de mão de obra de forma segura
        const maoDeObraInfo = mdo.mao_de_obra as any;
        
        if (maoDeObraInfo && typeof maoDeObraInfo === 'object') {
          const precoPorHora = maoDeObraInfo.preco_por_hora || 0;
          const horas = mdo.horas || 0;
          
          tiposMaoDeObra.push({
            mao_de_obra_id: mdo.mao_de_obra_id,
            tipo: maoDeObraInfo.tipo || 'Tipo sem nome',
            horas: horas,
            preco_por_hora: precoPorHora,
            subtotal: precoPorHora * horas
          });
        }
      }
    }
    
    // Ordena por tipo para facilitar a leitura
    return tiposMaoDeObra.sort((a, b) => a.tipo.localeCompare(b.tipo));
  } catch (error) {
    logError(`Erro não tratado ao calcular custos de mão de obra para o pedido ${pedidoId}`, error);
    throw error;
  }
}

/**
 * Calcula o custo total de mão de obra para um pedido
 * 
 * @param pedidoId - ID do pedido para calcular custo
 * @returns Promise com o custo total
 */
export async function calcularCustoTotalMaoDeObra(
  pedidoId: string
): Promise<number> {
  try {
    const tiposMaoDeObra = await calcularCustosMaoDeObra(pedidoId);
    
    // Soma o subtotal de todos os tipos de mão de obra
    return tiposMaoDeObra.reduce((total, mdo) => total + mdo.subtotal, 0);
  } catch (error) {
    logError(`Erro não tratado ao calcular custo total de mão de obra para o pedido ${pedidoId}`, error);
    throw error;
  }
}

/**
 * Gera um orçamento completo para um pedido
 * 
 * @param pedidoId - ID do pedido para gerar orçamento
 * @returns Promise com o orçamento completo
 */
export async function gerarOrcamentoCompleto(
  pedidoId: string
): Promise<OrcamentoCompleto> {
  try {
    // Busca informações do pedido incluindo os novos campos
    const { data: pedido, error: pedidoError } = await supabaseAdmin
      .from('pedidos')
      .select(`
        id,
        produto_id,
        quantidade,
        tem_frete,
        valor_frete,
        margem_lucro_percentual,
        impostos_percentual,
        produto:produto_id (
          nome,
          preco_unitario
        )
      `)
      .eq('id', pedidoId)
      .single();
      
    if (pedidoError || !pedido) {
      logError(`Erro ao buscar pedido ${pedidoId}`, pedidoError);
      throw new Error(`Pedido ${pedidoId} não encontrado`);
    }
    
    // Calcula os detalhes dos processos e mão de obra
    const detalhesProcessos = await calcularCustosProcessos(pedidoId);
    const detalhesMaoDeObra = await calcularCustosMaoDeObra(pedidoId);
    
    // Calcula os detalhes dos materiais
    const detalhesMateriais = await calcularRequisitosMateriasPrimas(
      pedido.produto_id,
      pedido.quantidade
    );
    
    // Busca os itens extras do pedido (com tratamento de erro robusto)
    let detalhesItensExtras: any[] = [];
    try {
      const { data: itensExtras, error: itensExtrasError } = await supabaseAdmin
        .from('itens_extras_pedidos')
        .select('*')
        .eq('pedido_id', pedidoId)
        .order('created_at', { ascending: false });
        
      if (itensExtrasError) {
        logError(`Erro ao buscar itens extras do pedido ${pedidoId}`, itensExtrasError);
        detalhesItensExtras = [];
      } else {
        detalhesItensExtras = itensExtras || [];
      }
    } catch (error) {
      logError(`Erro crítico ao buscar itens extras do pedido ${pedidoId}`, error);
      detalhesItensExtras = [];
    }
    
    // Calcula os custos totais base
    const custoTotalMateriais = detalhesMateriais.reduce((total, mp) => total + mp.subtotal, 0);
    const custoTotalProcessos = detalhesProcessos.reduce((total, proc) => total + proc.subtotal, 0);
    const custoTotalMaoDeObra = detalhesMaoDeObra.reduce((total, mdo) => total + mdo.subtotal, 0);
    const custoTotalItensExtras = detalhesItensExtras.reduce((total, item) => total + item.valor, 0);
    
    // Calcula o frete
    const valorFrete = pedido.tem_frete ? (pedido.valor_frete || 0) : 0;
    
    // Calcula o subtotal (antes da margem)
    const subtotal = custoTotalMateriais + custoTotalProcessos + custoTotalMaoDeObra + custoTotalItensExtras + valorFrete;
    
    // Calcula a margem de lucro usando a fórmula correta
    const margemLucroPercentual = pedido.margem_lucro_percentual || 0;
    let totalComMargem: number;
    let valorMargemLucro: number;
    
    if (margemLucroPercentual > 0) {
      // Fórmula correta: subtotal / (100% - margem%)
      // Exemplo: R$ 60.470,00 / (100% - 42%) = R$ 60.470,00 / 0,58 = R$ 104.258,62
      totalComMargem = subtotal / ((100 - margemLucroPercentual) / 100);
      valorMargemLucro = totalComMargem - subtotal;
    } else {
      totalComMargem = subtotal;
      valorMargemLucro = 0;
    }
    
    // Calcula os impostos usando a fórmula correta (aplicados sobre o total com margem)
    const impostosPercentual = pedido.impostos_percentual || 0;
    let custoTotal: number;
    let valorImpostos: number;
    
    if (impostosPercentual > 0) {
      // Fórmula correta: totalComMargem / (100% - impostos%)
      // Exemplo: R$ 104.258,62 / (100% - 18%) = R$ 104.258,62 / 0,82 = R$ 127.144,17
      custoTotal = totalComMargem / ((100 - impostosPercentual) / 100);
      valorImpostos = custoTotal - totalComMargem;
    } else {
      custoTotal = totalComMargem;
      valorImpostos = 0;
    }
    
    // Monta o objeto de orçamento
    const orcamento: OrcamentoCompleto = {
      pedido_id: pedidoId,
      custo_total_materiais: custoTotalMateriais,
      custo_total_processos: custoTotalProcessos,
      custo_total_mao_de_obra: custoTotalMaoDeObra,
      custo_total_itens_extras: custoTotalItensExtras,
      valor_frete: valorFrete,
      subtotal: subtotal,
      margem_lucro_percentual: margemLucroPercentual,
      valor_margem_lucro: valorMargemLucro,
      total_com_margem: totalComMargem,
      impostos_percentual: impostosPercentual,
      valor_impostos: valorImpostos,
      custo_total: custoTotal,
      detalhes_materiais: detalhesMateriais,
      detalhes_processos: detalhesProcessos,
      detalhes_mao_de_obra: detalhesMaoDeObra,
      detalhes_itens_extras: detalhesItensExtras
    };
    
    return orcamento;
  } catch (error) {
    logError(`Erro não tratado ao gerar orçamento completo para o pedido ${pedidoId}`, error);
    throw error;
  }
} 