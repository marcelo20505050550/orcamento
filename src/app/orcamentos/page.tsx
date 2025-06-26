'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { ItemExtraPedido } from '@/types'

type Material = {
  produto_id: string
  nome: string
  quantidade: number
  preco_unitario: number
  subtotal: number
}

type Processo = {
  processo_id: string
  nome: string
  quantidade: number
  preco_por_unidade: number
  subtotal: number
}

type MaoDeObra = {
  mao_de_obra_id: string
  tipo: string
  horas: number
  preco_por_hora: number
  subtotal: number
}

type Orcamento = {
  pedido_id: string
  custo_total_materiais: number
  custo_total_processos: number
  custo_total_mao_de_obra: number
  custo_total_itens_extras: number
  valor_frete: number
  subtotal: number // materiais + processos + mão de obra + itens extras + frete
  margem_lucro_percentual: number
  valor_margem_lucro: number
  total_com_margem: number // subtotal + margem
  impostos_percentual: number
  valor_impostos: number
  custo_total: number // total final com impostos
  detalhes_materiais: Material[]
  detalhes_processos: Processo[]
  detalhes_mao_de_obra: MaoDeObra[]
  detalhes_itens_extras: ItemExtraPedido[]
}

function OrcamentosContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pedidoId = searchParams.get('pedido')
  
  const [orcamento, setOrcamento] = useState<Orcamento | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (pedidoId) {
      fetchOrcamento(pedidoId)
    }
  }, [pedidoId])

  const fetchOrcamento = async (id: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await api.get(`/api/orcamentos?pedido_id=${id}`)
      console.log('Resposta da API de orçamentos:', response)
      
      if (response.error) {
        throw new Error(response.error || 'Erro ao carregar orçamento')
      }
      
      // Verifica a estrutura da resposta
      if (response.data && response.data.data) {
        setOrcamento(response.data.data)
      } else if (response.data) {
        setOrcamento(response.data)
      } else {
        throw new Error('Estrutura de dados do orçamento inválida')
      }
    } catch (err) {
      console.error('Erro ao buscar orçamento:', err)
      setError(err instanceof Error ? err.message : 'Ocorreu um erro ao carregar o orçamento')
    } finally {
      setLoading(false)
    }
  }

  const handleExportarOrcamento = async () => {
    if (!pedidoId) return
    
    // Redireciona para a página de exportação
    router.push(`/orcamentos/exportar?pedido=${pedidoId}`)
  }

  // Formata valor em moeda brasileira
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  if (loading) {
    return (
      <div className="p-4 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-md">
          <h2 className="text-red-800 dark:text-red-200 font-medium">Erro</h2>
          <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
          <button 
            onClick={() => pedidoId && fetchOrcamento(pedidoId)}
            className="mt-3 text-sm text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  // Se não houver pedidoId ou orçamento, exibir página de seleção
  if (!pedidoId || !orcamento) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Orçamentos
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gere e visualize orçamentos detalhados para seus pedidos
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nenhum orçamento selecionado</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Selecione um pedido para visualizar seu orçamento.
            </p>
            <div className="mt-6">
              <Link
                href="/pedidos"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Ver pedidos
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Orçamento do Pedido
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Visualização detalhada do orçamento para o pedido {pedidoId.substring(0, 8)}
          </p>
        </div>
        <div className="flex space-x-3">
          <Link
            href={`/pedidos/${pedidoId}`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-700 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Voltar ao Pedido
          </Link>
          <button
            onClick={handleExportarOrcamento}
            className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
          >
            <svg 
              className="mr-2 h-4 w-4" 
              xmlns="http://www.w3.org/2000/svg" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Exportar Orçamento
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {/* Resumo do orçamento */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Resumo do Orçamento</h2>
          
          {/* Custos base */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Custo Total de Materiais</p>
              <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{formatCurrency(orcamento.custo_total_materiais)}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg">
              <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Custo Total de Processos</p>
              <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">{formatCurrency(orcamento.custo_total_processos)}</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg">
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Custo Total de Mão de Obra</p>
              <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">{formatCurrency(orcamento.custo_total_mao_de_obra)}</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/30 p-4 rounded-lg">
              <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Custo Total de Itens Extras</p>
              <p className="text-2xl font-bold text-orange-800 dark:text-orange-200">{formatCurrency(orcamento.custo_total_itens_extras || 0)}</p>
            </div>
          </div>

          {/* Frete */}
          <div className="mb-6">
            <div className="bg-cyan-50 dark:bg-cyan-900/30 p-4 rounded-lg">
              <p className="text-sm font-medium text-cyan-700 dark:text-cyan-300">Frete</p>
              <p className="text-2xl font-bold text-cyan-800 dark:text-cyan-200">{formatCurrency(orcamento.valor_frete || 0)}</p>
            </div>
          </div>

          {/* Subtotal */}
          <div className="mb-6">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border-2 border-gray-200 dark:border-gray-600">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Subtotal (Antes da Margem)</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{formatCurrency(orcamento.subtotal)}</p>
            </div>
          </div>

          {/* Margem de Lucro */}
          <div className="mb-6">
            <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-lg">
              <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                Margem de Lucro ({orcamento.margem_lucro_percentual}%)
              </p>
              <p className="text-2xl font-bold text-indigo-800 dark:text-indigo-200">{formatCurrency(orcamento.valor_margem_lucro)}</p>
            </div>
          </div>

          {/* Total com Margem */}
          <div className="mb-6">
            <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg border-2 border-slate-200 dark:border-slate-600">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Total com Margem</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-200">{formatCurrency(orcamento.total_com_margem)}</p>
            </div>
          </div>

          {/* Impostos */}
          <div className="mb-6">
            <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">
                Impostos ({orcamento.impostos_percentual}%)
              </p>
              <p className="text-2xl font-bold text-red-800 dark:text-red-200">{formatCurrency(orcamento.valor_impostos)}</p>
            </div>
          </div>

          {/* Total Final */}
          <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg border-4 border-green-200 dark:border-green-700">
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-300">Total Final do Pedido</p>
              <p className="text-4xl font-bold text-green-800 dark:text-green-200">{formatCurrency(orcamento.custo_total)}</p>
            </div>
          </div>
        </div>

        {/* Detalhes dos materiais */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Materiais Necessários</h2>
          {orcamento.detalhes_materiais.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Material
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Quantidade
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Preço Unitário
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {orcamento.detalhes_materiais.map((material, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {material.nome}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {material.quantidade}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {formatCurrency(material.preco_unitario)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                        {formatCurrency(material.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="row" colSpan={3} className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">
                      Total de Materiais
                    </th>
                    <td className="px-6 py-3 text-left text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(orcamento.custo_total_materiais)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              Nenhum material necessário para este pedido.
            </div>
          )}
        </div>

        {/* Detalhes dos processos */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Processos de Fabricação</h2>
          {orcamento.detalhes_processos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Processo
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Quantidade
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Preço por Hora
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {orcamento.detalhes_processos.map((processo, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {processo.nome}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {processo.quantidade}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {formatCurrency(processo.preco_por_unidade)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                        {formatCurrency(processo.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="row" colSpan={3} className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">
                      Total de Processos
                    </th>
                    <td className="px-6 py-3 text-left text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(orcamento.custo_total_processos)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              Nenhum processo definido para este pedido.
            </div>
          )}
        </div>

        {/* Detalhes da mão de obra */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Mão de Obra</h2>
          {orcamento.detalhes_mao_de_obra.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Horas
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Preço por Hora
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {orcamento.detalhes_mao_de_obra.map((maoDeObra, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {maoDeObra.tipo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {maoDeObra.horas}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {formatCurrency(maoDeObra.preco_por_hora)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                        {formatCurrency(maoDeObra.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="row" colSpan={3} className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">
                      Total de Mão de Obra
                    </th>
                    <td className="px-6 py-3 text-left text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(orcamento.custo_total_mao_de_obra)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              Nenhuma mão de obra definida para este pedido.
            </div>
          )}
        </div>

        {/* Detalhes dos itens extras */}
        <div className="p-6">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Itens Extras</h2>
          {orcamento.detalhes_itens_extras && orcamento.detalhes_itens_extras.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Nome
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {orcamento.detalhes_itens_extras.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {item.nome}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                        {item.descricao || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">
                        {formatCurrency(item.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="row" colSpan={2} className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">
                      Total de Itens Extras
                    </th>
                    <td className="px-6 py-3 text-left text-sm font-bold text-gray-900 dark:text-white">
                      {formatCurrency(orcamento.custo_total_itens_extras || 0)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              Nenhum item extra definido para este pedido.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function OrcamentosPage() {
  return (
    <Suspense fallback={
      <div className="p-4 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    }>
      <OrcamentosContent />
    </Suspense>
  )
} 