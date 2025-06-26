/**
 * API para exportação de orçamentos
 * Endpoint para exportar orçamento em formato estruturado (US-014)
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { supabaseAdmin } from '@/lib/supabase/server';
import { withAuth } from '../../middleware';
import { logError, logInfo } from '@/utils/logger';
import { gerarOrcamentoCompleto } from '@/utils/calculadora';

/**
 * GET /api/orcamentos/exportar
 * Exporta um orçamento em formato estruturado para compartilhar com clientes (US-014)
 */
export const GET = withAuth(async (req: NextRequest) => {
  try {
    // Obtém o ID do pedido como parâmetro de query
    const url = new URL(req.url);
    const pedidoId = url.searchParams.get('pedido_id');
    
    logInfo(`Iniciando exportação de orçamento para pedido: ${pedidoId}`);
    
    // Verifica se o ID do pedido foi fornecido
    if (!pedidoId) {
      logError('ID do pedido não fornecido na exportação');
      return NextResponse.json(
        { error: 'ID do pedido não fornecido. Use o parâmetro pedido_id.' },
        { status: 400 }
      );
    }
    
    // Obtém o usuário atual a partir do token
    const authHeader = req.headers.get('authorization')!;
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      logError('Erro ao identificar usuário na exportação', userError);
      return NextResponse.json(
        { error: 'Erro ao identificar o usuário' },
        { status: 401 }
      );
    }
    
    logInfo(`Usuário identificado: ${user.id}`);
    
    // Busca as informações do pedido incluindo os novos campos
    const { data: pedidoSimples, error: pedidoError } = await supabaseAdmin
      .from('pedidos')
      .select(`
        id, 
        produto_id, 
        quantidade, 
        status, 
        observacoes, 
        user_id,
        tem_frete,
        valor_frete,
        margem_lucro_percentual,
        impostos_percentual
      `)
      .eq('id', pedidoId)
      .single();
      
    if (pedidoError || !pedidoSimples) {
      logError(`Erro ao buscar pedido ${pedidoId}`, pedidoError);
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      );
    }
    
    // Verifica se o pedido pertence ao usuário atual
    if (pedidoSimples.user_id !== user.id) {
      logError(`Pedido ${pedidoId} não pertence ao usuário ${user.id}`);
      return NextResponse.json(
        { error: 'Pedido não pertence ao usuário atual' },
        { status: 403 }
      );
    }

    // Busca as informações do produto separadamente
    const { data: produto, error: produtoError } = await supabaseAdmin
      .from('produtos')
      .select('id, nome, descricao, preco_unitario')
      .eq('id', pedidoSimples.produto_id)
      .single();

    // Monta o objeto pedido completo
    const pedido = {
      ...pedidoSimples,
      produto: produto || null
    };
    
    logInfo(`Pedido encontrado: ${pedido.id}, quantidade: ${pedido.quantidade}`);
    
    // Extrai informações do produto de forma segura
    const produtoInfo = {
      id: produto?.id || 'N/A',
      nome: produto?.nome || 'N/A',
      descricao: produto?.descricao || 'N/A',
      preco_unitario: produto?.preco_unitario || 0
    };
    
    logInfo(`Produto extraído: ${produtoInfo.nome}`);
    
    // Usa a função gerarOrcamentoCompleto para obter todos os dados incluindo frete, margem e impostos
    try {
      const orcamentoCompleto = await gerarOrcamentoCompleto(pedidoId);
      
      logInfo(`Orçamento completo gerado para o pedido ${pedidoId}`);
      
      // Calcula a data de validade (30 dias a partir de hoje)
      const dataAtual = new Date();
      const dataValidade = new Date();
      dataValidade.setDate(dataAtual.getDate() + 30);
      
      // Formata as datas
      const formatoData = new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      // Processa materiais
      const materiais = orcamentoCompleto.detalhes_materiais?.map(material => ({
        nome: material.nome,
        quantidade: material.quantidade_necessaria,
        preco_unitario: material.preco_unitario,
        subtotal: material.subtotal
      })) || [];
      
      // Processa processos
      const processos = orcamentoCompleto.detalhes_processos?.map(proc => ({
        nome: proc.nome,
        quantidade: proc.quantidade,
        preco_por_unidade: proc.preco_por_unidade,
        subtotal: proc.subtotal
      })) || [];
      
      // Processa mão de obra
      const maoDeObra = orcamentoCompleto.detalhes_mao_de_obra?.map(mdo => ({
        tipo: mdo.tipo,
        horas: mdo.horas,
        preco_por_hora: mdo.preco_por_hora,
        subtotal: mdo.subtotal
      })) || [];
      
      // Processa itens extras
      const itensExtras = orcamentoCompleto.detalhes_itens_extras?.map(item => ({
        nome: item.nome,
        descricao: item.descricao,
        valor: item.valor
      })) || [];
      
      // Cria o objeto formatado para exportação
      const orcamentoExportado = {
        informacoes_gerais: {
          codigo_orcamento: `ORC-${pedidoId}`,
          data_geracao: formatoData.format(dataAtual),
          data_validade: formatoData.format(dataValidade),
          valido_por_dias: 30
        },
        cliente: {
          id: user.id,
          email: user.email,
          nome: user.user_metadata?.nome || user.email
        },
        produto: {
          id: produtoInfo.id,
          nome: produtoInfo.nome,
          descricao: produtoInfo.descricao,
          quantidade: pedido.quantidade,
          preco_unitario: produtoInfo.preco_unitario
        },
        pedido: {
          id: pedido.id,
          status: pedido.status,
          observacoes: pedido.observacoes || '',
          tem_frete: pedido.tem_frete,
          valor_frete: pedido.valor_frete,
          margem_lucro_percentual: pedido.margem_lucro_percentual,
          impostos_percentual: pedido.impostos_percentual
        },
        detalhamento: {
          materiais: materiais,
          processos: processos,
          mao_de_obra: maoDeObra,
          itens_extras: itensExtras
        },
        resumo: {
          custo_total_materiais: orcamentoCompleto.custo_total_materiais,
          custo_total_processos: orcamentoCompleto.custo_total_processos,
          custo_total_mao_de_obra: orcamentoCompleto.custo_total_mao_de_obra,
          custo_total_itens_extras: orcamentoCompleto.custo_total_itens_extras,
          valor_frete: orcamentoCompleto.valor_frete,
          subtotal: orcamentoCompleto.subtotal,
          margem_lucro_percentual: orcamentoCompleto.margem_lucro_percentual,
          valor_margem_lucro: orcamentoCompleto.valor_margem_lucro,
          total_com_margem: orcamentoCompleto.total_com_margem,
          impostos_percentual: orcamentoCompleto.impostos_percentual,
          valor_impostos: orcamentoCompleto.valor_impostos,
          custo_total: orcamentoCompleto.custo_total
        },
        observacoes: [
          "Preços sujeitos a alteração após a data de validade.",
          "Orçamento não constitui compromisso de execução.",
          `Margem de lucro aplicada: ${orcamentoCompleto.margem_lucro_percentual}%`,
          `Impostos aplicados: ${orcamentoCompleto.impostos_percentual}%`,
          orcamentoCompleto.valor_frete > 0 ? `Frete incluído: R$ ${orcamentoCompleto.valor_frete.toFixed(2)}` : "Frete não aplicado"
        ].filter(obs => obs !== "Frete não aplicado") // Remove a observação se não há frete
      };
      
      logInfo(`Orçamento exportado com sucesso para o pedido ${pedidoId}`, {
        custo_total: orcamentoExportado.resumo.custo_total,
        materiais: materiais.length,
        processos: processos.length,
        mao_de_obra: maoDeObra.length,
        itens_extras: itensExtras.length,
        valor_frete: orcamentoCompleto.valor_frete,
        margem_lucro: orcamentoCompleto.valor_margem_lucro,
        impostos: orcamentoCompleto.valor_impostos
      });
      
      return NextResponse.json({
        data: orcamentoExportado
      });
    } catch (orcamentoError) {
      logError(`Erro ao gerar orçamento para o pedido ${pedidoId}`, orcamentoError);
      return NextResponse.json(
        { error: 'Erro ao gerar orçamento detalhado' },
        { status: 500 }
      );
    }
  } catch (error) {
    logError('Erro não tratado ao exportar orçamento', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
}); 