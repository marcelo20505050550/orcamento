'use client'

import { useState, useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { ItemExtraPedido } from '@/types'

type PedidoDetalhes = {
  id: string
  produto: {
    id: string
    nome: string
    descricao: string
    preco_unitario: number
  }
  quantidade: number
  status: 'pendente' | 'em_producao' | 'finalizado' | 'cancelado'
  observacoes: string
  tem_frete: boolean
  valor_frete: number
  margem_lucro_percentual: number
  impostos_percentual: number
  created_at: string
  updated_at: string
  processos: Array<{
    id: string
    processo_id: string
    quantidade: number
    processo: {
      id: string
      nome: string
      preco_por_unidade: number
      tempo_estimado_minutos: number
    }
  }>
  mao_de_obra: Array<{
    id: string
    mao_de_obra_id: string
    horas: number
    mao_de_obra: {
      id: string
      tipo: string
      preco_por_hora: number
    }
  }>
  itens_extras?: ItemExtraPedido[]
}

export default function PedidoDetalhesPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isNewOrder = searchParams.get('novo') === 'true'
  const pedidoId = use(params).id
  const [pedido, setPedido] = useState<PedidoDetalhes | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusUpdating, setStatusUpdating] = useState(false)
  
  useEffect(() => {
    const fetchPedido = async () => {
      setLoading(true)
      try {
        // Buscar detalhes do pedido
        const response = await api.get(`/api/pedidos/${pedidoId}`)
        
        if (response.error) {
          throw new Error(response.error || 'Erro ao carregar detalhes do pedido')
        }
        
        // Buscar itens extras do pedido
        const itensExtrasResponse = await api.get(`/api/pedidos/${pedidoId}/itens-extras`)
        const itensExtras = itensExtrasResponse.error ? [] : itensExtrasResponse.data
        
        // Combinar os dados
        setPedido({
          ...response.data,
          itens_extras: itensExtras
        })
      } catch (err) {
        console.error('Erro ao buscar detalhes do pedido:', err)
        setError(err instanceof Error ? err.message : 'Ocorreu um erro ao carregar os detalhes do pedido')
      } finally {
        setLoading(false)
      }
    }

    if (pedidoId) {
      fetchPedido()
    }
  }, [pedidoId])

  const handleStatusUpdate = async (newStatus: string) => {
    if (!pedido) return
    
    setStatusUpdating(true)
    try {
      const response = await api.put(`/api/pedidos/${pedido.id}`, {
        status: newStatus
      })
      
      if (response.error) {
        throw new Error(response.error || 'Erro ao atualizar status do pedido')
      }
      
      // Atualiza o pedido com os novos dados
      setPedido({
        ...pedido,
        status: response.data.status,
        updated_at: response.data.updated_at
      })
    } catch (err) {
      console.error('Erro ao atualizar status:', err)
      setError(err instanceof Error ? err.message : 'Ocorreu um erro ao atualizar o status do pedido')
    } finally {
      setStatusUpdating(false)
    }
  }

  // Traduz status para português e retorna a classe CSS correspondente
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pendente':
        return {
          text: 'Pendente',
          className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
        }
      case 'em_producao':
        return {
          text: 'Em Produção',
          className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
        }
      case 'finalizado':
        return {
          text: 'Finalizado',
          className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
        }
      case 'cancelado':
        return {
          text: 'Cancelado',
          className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
        }
      default:
        return {
          text: status,
          className: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
        }
    }
  }

  // Formata data para o formato brasileiro
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  // Formata valores monetários para o formato brasileiro
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  // Calcula o custo total dos processos
  const calcularCustoProcessos = () => {
    if (!pedido || !pedido.processos.length) return 0
    
    return pedido.processos.reduce((total, item) => {
      return total + (item.processo.preco_por_unidade * item.quantidade)
    }, 0)
  }

  // Calcula o custo total da mão de obra
  const calcularCustoMaoDeObra = () => {
    if (!pedido || !pedido.mao_de_obra.length) return 0
    
    return pedido.mao_de_obra.reduce((total, item) => {
      return total + (item.mao_de_obra.preco_por_hora * item.horas)
    }, 0)
  }

  // Calcula o custo total dos itens extras
  const calcularCustoItensExtras = () => {
    if (!pedido || !pedido.itens_extras || !pedido.itens_extras.length) return 0
    
    return pedido.itens_extras.reduce((total, item) => {
      return total + item.valor
    }, 0)
  }

  // Calcula o tempo total estimado em minutos
  const calcularTempoTotal = () => {
    if (!pedido || !pedido.processos.length) return 0
    
    return pedido.processos.reduce((total, item) => {
      return total + (item.processo.tempo_estimado_minutos * item.quantidade)
    }, 0)
  }

  // Formata tempo em minutos para horas e minutos
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    
    if (hours === 0) {
      return `${mins} minutos`
    } else if (mins === 0) {
      return `${hours} ${hours === 1 ? 'hora' : 'horas'}`
    } else {
      return `${hours} ${hours === 1 ? 'hora' : 'horas'} e ${mins} minutos`
    }
  }

  // Calcula o subtotal (materiais + processos + mão de obra + itens extras + frete)
  const calcularSubtotal = () => {
    const custoMaterial = pedido ? pedido.produto.preco_unitario * pedido.quantidade : 0
    const custoProcessos = calcularCustoProcessos()
    const custoMaoDeObra = calcularCustoMaoDeObra()
    const custoItensExtras = calcularCustoItensExtras()
    const valorFrete = pedido?.tem_frete ? (pedido.valor_frete || 0) : 0
    
    return custoMaterial + custoProcessos + custoMaoDeObra + custoItensExtras + valorFrete
  }

  // Calcula o valor da margem de lucro
  const calcularValorMargem = () => {
    if (!pedido) return 0
    const subtotal = calcularSubtotal()
    const margemPercentual = pedido.margem_lucro_percentual
    
    if (margemPercentual > 0) {
      const totalComMargem = subtotal / ((100 - margemPercentual) / 100)
      return totalComMargem - subtotal
    }
    return 0
  }

  // Calcula o total com margem (subtotal + margem)
  const calcularTotalComMargem = () => {
    if (!pedido) return 0
    const subtotal = calcularSubtotal()
    const margemPercentual = pedido.margem_lucro_percentual
    
    if (margemPercentual > 0) {
      return subtotal / ((100 - margemPercentual) / 100)
    }
    return subtotal
  }

  // Calcula o valor dos impostos
  const calcularValorImpostos = () => {
    if (!pedido) return 0
    const totalComMargem = calcularTotalComMargem()
    const impostosPercentual = pedido.impostos_percentual
    
    if (impostosPercentual > 0) {
      const totalFinal = totalComMargem / ((100 - impostosPercentual) / 100)
      return totalFinal - totalComMargem
    }
    return 0
  }

  // Calcula o total final (com impostos)
  const calcularTotalFinal = () => {
    if (!pedido) return 0
    const totalComMargem = calcularTotalComMargem()
    const impostosPercentual = pedido.impostos_percentual
    
    if (impostosPercentual > 0) {
      return totalComMargem / ((100 - impostosPercentual) / 100)
    }
    return totalComMargem
  }

  // Estados para edição dos novos campos
  const [editandoFrete, setEditandoFrete] = useState(false)
  const [editandoMargem, setEditandoMargem] = useState(false)
  const [editandoImpostos, setEditandoImpostos] = useState(false)
  const [salvandoAlteracoes, setSalvandoAlteracoes] = useState(false)

  // Função para atualizar frete
  const handleFreteUpdate = async (temFrete: boolean, valorFrete: number) => {
    if (!pedido) return
    
    setSalvandoAlteracoes(true)
    try {
      const response = await api.put(`/api/pedidos/${pedido.id}`, {
        tem_frete: temFrete,
        valor_frete: valorFrete
      })
      
      if (response.error) {
        throw new Error(response.error || 'Erro ao atualizar frete')
      }
      
      setPedido({
        ...pedido,
        tem_frete: response.data.tem_frete,
        valor_frete: response.data.valor_frete,
        updated_at: response.data.updated_at
      })
      setEditandoFrete(false)
    } catch (err) {
      console.error('Erro ao atualizar frete:', err)
      setError(err instanceof Error ? err.message : 'Erro ao atualizar frete')
    } finally {
      setSalvandoAlteracoes(false)
    }
  }

  // Função para atualizar margem de lucro
  const handleMargemUpdate = async (margemPercentual: number) => {
    if (!pedido) return
    
    setSalvandoAlteracoes(true)
    try {
      const response = await api.put(`/api/pedidos/${pedido.id}`, {
        margem_lucro_percentual: margemPercentual
      })
      
      if (response.error) {
        throw new Error(response.error || 'Erro ao atualizar margem de lucro')
      }
      
      setPedido({
        ...pedido,
        margem_lucro_percentual: response.data.margem_lucro_percentual,
        updated_at: response.data.updated_at
      })
      setEditandoMargem(false)
    } catch (err) {
      console.error('Erro ao atualizar margem:', err)
      setError(err instanceof Error ? err.message : 'Erro ao atualizar margem de lucro')
    } finally {
      setSalvandoAlteracoes(false)
    }
  }

  // Função para atualizar impostos
  const handleImpostosUpdate = async (impostosPercentual: number) => {
    if (!pedido) return
    
    setSalvandoAlteracoes(true)
    try {
      const response = await api.put(`/api/pedidos/${pedido.id}`, {
        impostos_percentual: impostosPercentual
      })
      
      if (response.error) {
        throw new Error(response.error || 'Erro ao atualizar impostos')
      }
      
      setPedido({
        ...pedido,
        impostos_percentual: response.data.impostos_percentual,
        updated_at: response.data.updated_at
      })
      setEditandoImpostos(false)
    } catch (err) {
      console.error('Erro ao atualizar impostos:', err)
      setError(err instanceof Error ? err.message : 'Erro ao atualizar impostos')
    } finally {
      setSalvandoAlteracoes(false)
    }
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
            onClick={() => router.push('/pedidos')}
            className="mt-3 text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded"
          >
            Voltar aos Pedidos
          </button>
        </div>
      </div>
    )
  }

  if (!pedido) {
    return (
      <div className="p-4">
        <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-md">
          <h2 className="text-yellow-800 dark:text-yellow-200 font-medium">Pedido não encontrado</h2>
          <p className="text-yellow-700 dark:text-yellow-300 mt-1">
            O pedido solicitado não foi encontrado ou você não tem permissão para acessá-lo.
          </p>
          <button 
            onClick={() => router.push('/pedidos')}
            className="mt-3 text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded"
          >
            Voltar aos Pedidos
          </button>
        </div>
      </div>
    )
  }

  const statusInfo = getStatusInfo(pedido.status)
  const custoProcessos = calcularCustoProcessos()
  const custoMaoDeObra = calcularCustoMaoDeObra()
  const custoItensExtras = calcularCustoItensExtras()
  const tempoTotal = calcularTempoTotal()

  return (
    <div className="space-y-6" suppressHydrationWarning>
      {/* Mensagem de boas-vindas para novo pedido */}
      {isNewOrder && (
        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg shadow">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3 flex-1 md:flex md:justify-between">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Pedido criado com sucesso! Para completar o orçamento, adicione processos de fabricação e mão de obra.
              </p>
              <div className="mt-3 flex flex-wrap gap-3 md:mt-0 md:ml-6">
                <Link 
                  href={`/pedidos/${pedido?.id}/processos`}
                  className="text-sm font-medium text-blue-700 dark:text-blue-300 hover:text-blue-600 dark:hover:text-blue-200 whitespace-nowrap"
                >
                  Adicionar Processos <span aria-hidden="true">&rarr;</span>
                </Link>
                <Link 
                  href={`/pedidos/${pedido?.id}/mao-de-obra`}
                  className="text-sm font-medium text-blue-700 dark:text-blue-300 hover:text-blue-600 dark:hover:text-blue-200 whitespace-nowrap"
                >
                  Adicionar Mão de Obra <span aria-hidden="true">&rarr;</span>
                </Link>
                <Link 
                  href={`/pedidos/${pedido?.id}/itens-extras`}
                  className="text-sm font-medium text-blue-700 dark:text-blue-300 hover:text-blue-600 dark:hover:text-blue-200 whitespace-nowrap"
                >
                  Adicionar Itens Extras <span aria-hidden="true">&rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cabeçalho e ações */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Detalhes do Pedido
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Pedido #{pedido.id.substring(0, 8)} - {formatDate(pedido.created_at)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/pedidos"
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-700 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Voltar
          </Link>
          <Link
            href={`/orcamentos?pedido_id=${pedido.id}`}
            className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Gerar Orçamento
          </Link>
        </div>
      </div>

      {/* Informações gerais */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Informações do Pedido</h2>
        </div>
        <div className="p-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Produto</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">{pedido.produto.nome}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Quantidade</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">{pedido.quantidade} unidades</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
              <dd className="mt-1">
                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo.className}`}>
                  {statusInfo.text}
                </span>
              </dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Preço Unitário</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {formatCurrency(pedido.produto.preco_unitario)}
              </dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Data de Criação</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(pedido.created_at)}</dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Última Atualização</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">{formatDate(pedido.updated_at)}</dd>
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Observações</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white whitespace-pre-wrap">
                {pedido.observacoes || "Nenhuma observação"}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Ações de status */}
      {pedido.status !== 'finalizado' && pedido.status !== 'cancelado' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">Atualizar Status</h2>
          </div>
          <div className="p-6 flex flex-wrap gap-2">
            {pedido.status === 'pendente' && (
              <>
                <button
                  onClick={() => handleStatusUpdate('em_producao')}
                  disabled={statusUpdating}
                  className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {statusUpdating ? 'Atualizando...' : 'Iniciar Produção'}
                </button>
                <button
                  onClick={() => handleStatusUpdate('cancelado')}
                  disabled={statusUpdating}
                  className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {statusUpdating ? 'Atualizando...' : 'Cancelar Pedido'}
                </button>
              </>
            )}
            
            {pedido.status === 'em_producao' && (
              <>
                <button
                  onClick={() => handleStatusUpdate('finalizado')}
                  disabled={statusUpdating}
                  className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {statusUpdating ? 'Atualizando...' : 'Finalizar Produção'}
                </button>
                <button
                  onClick={() => handleStatusUpdate('cancelado')}
                  disabled={statusUpdating}
                  className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {statusUpdating ? 'Atualizando...' : 'Cancelar Pedido'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Processos de Fabricação */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Processos de Fabricação</h2>
          <Link
            href={`/pedidos/${pedido.id}/processos`}
            className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {pedido.processos && pedido.processos.length > 0 ? 'Gerenciar Processos' : 'Adicionar Processos'}
          </Link>
        </div>
        
        {pedido.processos && pedido.processos.length > 0 ? (
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
                    Tempo Estimado (horas)
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {pedido.processos.map((processo) => (
                  <tr key={processo.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {processo.processo.nome}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {processo.quantidade}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {formatCurrency(processo.processo.preco_por_unidade)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {formatTime(processo.processo.tempo_estimado_minutos)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {formatCurrency(processo.processo.preco_por_unidade * processo.quantidade)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 dark:bg-gray-700">
                  <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-right">
                    Total:
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(custoProcessos)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-md flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Nenhum processo adicionado</h3>
                <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  Este pedido não possui processos de fabricação associados. Adicione processos para calcular custos de produção.
                </p>
              </div>
              <Link
                href={`/pedidos/${pedido.id}/processos`}
                className="flex-shrink-0 inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Adicionar Agora
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Mão de Obra */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Mão de Obra</h2>
          <Link
            href={`/pedidos/${pedido.id}/mao-de-obra`}
            className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {pedido.mao_de_obra && pedido.mao_de_obra.length > 0 ? 'Gerenciar Mão de Obra' : 'Adicionar Mão de Obra'}
          </Link>
        </div>
        
        {pedido.mao_de_obra && pedido.mao_de_obra.length > 0 ? (
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
                {pedido.mao_de_obra.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {item.mao_de_obra.tipo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {item.horas.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {formatCurrency(item.mao_de_obra.preco_por_hora)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {formatCurrency(item.mao_de_obra.preco_por_hora * item.horas)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 dark:bg-gray-700">
                  <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-right">
                    Total:
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(custoMaoDeObra)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-md flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Nenhuma mão de obra adicionada</h3>
                <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  Este pedido não possui mão de obra associada. Adicione mão de obra para calcular custos de produção.
                </p>
              </div>
              <Link
                href={`/pedidos/${pedido.id}/mao-de-obra`}
                className="flex-shrink-0 inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Adicionar Agora
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Itens Extras */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Itens Extras</h2>
          <Link
            href={`/pedidos/${pedido.id}/itens-extras`}
            className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {pedido.itens_extras && pedido.itens_extras.length > 0 ? 'Gerenciar Itens Extras' : 'Adicionar Itens Extras'}
          </Link>
        </div>
        
        {pedido.itens_extras && pedido.itens_extras.length > 0 ? (
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
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Data de Criação
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {pedido.itens_extras.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {item.nome}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                      {item.descricao || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {formatCurrency(item.valor)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {formatDate(item.created_at)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 dark:bg-gray-700">
                  <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white text-right">
                    Total:
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(custoItensExtras)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6">
            <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-md flex justify-between items-center">
              <div>
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Nenhum item extra adicionado</h3>
                <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  Este pedido não possui itens extras. Adicione itens como taxas de urgência, materiais especiais ou serviços adicionais.
                </p>
              </div>
              <Link
                href={`/pedidos/${pedido.id}/itens-extras`}
                className="flex-shrink-0 inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Adicionar Agora
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Configurações de Frete, Margem e Impostos */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Configurações de Orçamento</h2>
        </div>
        <div className="p-6 space-y-6">
          {/* Seção de Frete */}
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Frete</h3>
              <button
                onClick={() => setEditandoFrete(!editandoFrete)}
                className="text-sm text-blue-600 hover:text-blue-500"
                disabled={salvandoAlteracoes}
              >
                {editandoFrete ? 'Cancelar' : 'Editar'}
              </button>
            </div>
            
            {editandoFrete ? (
              <FreteForm
                temFrete={pedido.tem_frete}
                valorFrete={pedido.valor_frete}
                onSave={handleFreteUpdate}
                onCancel={() => setEditandoFrete(false)}
                loading={salvandoAlteracoes}
              />
            ) : (
              <div className="mt-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {pedido.tem_frete ? (
                    <>Tem frete: <span className="font-medium">{formatCurrency(pedido.valor_frete)}</span></>
                  ) : (
                    'Sem frete'
                  )}
                </p>
              </div>
            )}
          </div>

          {/* Seção de Margem de Lucro */}
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Margem de Lucro</h3>
              <button
                onClick={() => setEditandoMargem(!editandoMargem)}
                className="text-sm text-blue-600 hover:text-blue-500"
                disabled={salvandoAlteracoes}
              >
                {editandoMargem ? 'Cancelar' : 'Editar'}
              </button>
            </div>
            
            {editandoMargem ? (
              <MargemForm
                margemPercentual={pedido.margem_lucro_percentual}
                onSave={handleMargemUpdate}
                onCancel={() => setEditandoMargem(false)}
                loading={salvandoAlteracoes}
              />
            ) : (
              <div className="mt-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {pedido.margem_lucro_percentual}% ({formatCurrency(calcularValorMargem())})
                </p>
              </div>
            )}
          </div>

          {/* Seção de Impostos */}
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Impostos</h3>
              <button
                onClick={() => setEditandoImpostos(!editandoImpostos)}
                className="text-sm text-blue-600 hover:text-blue-500"
                disabled={salvandoAlteracoes}
              >
                {editandoImpostos ? 'Cancelar' : 'Editar'}
              </button>
            </div>
            
            {editandoImpostos ? (
              <ImpostosForm
                impostosPercentual={pedido.impostos_percentual}
                onSave={handleImpostosUpdate}
                onCancel={() => setEditandoImpostos(false)}
                loading={salvandoAlteracoes}
              />
            ) : (
              <div className="mt-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {pedido.impostos_percentual}% ({formatCurrency(calcularValorImpostos())})
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resumo de custos */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">Resumo de Custos</h2>
        </div>
        <div className="p-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Custo dos Materiais</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {formatCurrency(pedido.produto.preco_unitario * pedido.quantidade)}
              </dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Custo dos Processos</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {formatCurrency(custoProcessos)}
              </dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Custo da Mão de Obra</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {formatCurrency(custoMaoDeObra)}
              </dd>
            </div>
            
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Custo dos Itens Extras</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {formatCurrency(custoItensExtras)}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Frete</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {formatCurrency(pedido.tem_frete ? pedido.valor_frete : 0)}
              </dd>
            </div>
            
            <div className="sm:col-span-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Subtotal</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {formatCurrency(calcularSubtotal())}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Margem de Lucro ({pedido.margem_lucro_percentual}%)</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {formatCurrency(calcularValorMargem())}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Total com Margem</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {formatCurrency(calcularTotalComMargem())}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Impostos ({pedido.impostos_percentual}%)</dt>
              <dd className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {formatCurrency(calcularValorImpostos())}
              </dd>
            </div>
            
            <div className="sm:col-span-2 pt-4 border-t-2 border-gray-300 dark:border-gray-600">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Final</dt>
              <dd className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(calcularTotalFinal())}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}

// Componente para editar frete
function FreteForm({ temFrete, valorFrete, onSave, onCancel, loading }: {
  temFrete: boolean
  valorFrete: number
  onSave: (temFrete: boolean, valorFrete: number) => void
  onCancel: () => void
  loading: boolean
}) {
  const [formTemFrete, setFormTemFrete] = useState(temFrete)
  const [formValorFrete, setFormValorFrete] = useState(valorFrete.toString())

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const valor = parseFloat(formValorFrete) || 0
    onSave(formTemFrete, valor)
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3">
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formTemFrete}
            onChange={(e) => setFormTemFrete(e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Tem frete</span>
        </label>
      </div>
      
      {formTemFrete && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Valor do Frete
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formValorFrete}
            onChange={(e) => setFormValorFrete(e.target.value)}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="0,00"
          />
        </div>
      )}
      
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 bg-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-400"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

// Componente para editar margem de lucro
function MargemForm({ margemPercentual, onSave, onCancel, loading }: {
  margemPercentual: number
  onSave: (margemPercentual: number) => void
  onCancel: () => void
  loading: boolean
}) {
  const [formMargem, setFormMargem] = useState(margemPercentual.toString())

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const margem = parseFloat(formMargem) || 0
    onSave(margem)
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Margem de Lucro (%)
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={formMargem}
          onChange={(e) => setFormMargem(e.target.value)}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="0,00"
        />
      </div>
      
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 bg-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-400"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

// Componente para editar impostos
function ImpostosForm({ impostosPercentual, onSave, onCancel, loading }: {
  impostosPercentual: number
  onSave: (impostosPercentual: number) => void
  onCancel: () => void
  loading: boolean
}) {
  const [formImpostos, setFormImpostos] = useState(impostosPercentual.toString())

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const impostos = parseFloat(formImpostos) || 0
    onSave(impostos)
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Impostos (%)
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={formImpostos}
          onChange={(e) => setFormImpostos(e.target.value)}
          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="0,00"
        />
      </div>
      
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 bg-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-400"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
} 