'use client'

import { useState, useEffect, use } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { Cliente, Produto } from '@/types'
import TaxasPedido from '@/components/TaxasPedido'
import ResumoPedido from '@/components/ResumoPedido'

type PedidoDetalhes = {
  id: string
  cliente_id: string
  quantidade: number
  status: 'pendente' | 'em_producao' | 'finalizado' | 'cancelado'
  observacoes?: string
  tem_frete: boolean
  valor_frete: number
  created_at: string
  updated_at: string
  cliente?: Cliente
  produtos_pedido?: Array<{
    id: string
    produto_id: string
    quantidade: number
    produto: {
      id: string
      nome: string
      preco_unitario: number
      custo_total?: number
    }
  }>
}

export default function PedidoDetalhesPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isNewOrder = searchParams.get('novo') === 'true'
  const pedidoId = use(params).id

  const [pedido, setPedido] = useState<PedidoDetalhes | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Estados para produtos
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [fetchingProdutos, setFetchingProdutos] = useState(false)
  const [produtosSelecionados, setProdutosSelecionados] = useState<{ id: string, nome: string, custoTotal: number, quantidade: number }[]>([])
  const [produtosComPrecoFinal, setProdutosComPrecoFinal] = useState<{ id: string, nome: string, precoFinal: number }[]>([])

  // Estados para observações
  const [observacoes, setObservacoes] = useState<string[]>([])
  const [novaObservacao, setNovaObservacao] = useState('')
  const [editandoObservacao, setEditandoObservacao] = useState<number | null>(null)
  const [observacaoEditada, setObservacaoEditada] = useState('')
  const [salvandoObservacoes, setSalvandoObservacoes] = useState(false)

  // Estados para edição
  const [editando, setEditando] = useState(false)
  const [formData, setFormData] = useState({
    quantidade: '1'
  })

  useEffect(() => {
    const fetchPedido = async () => {
      setLoading(true)
      try {
        // Buscar detalhes do pedido
        const response = await api.get(`/api/pedidos/${pedidoId}`)
        if (response.error) {
          throw new Error(response.error || 'Erro ao carregar detalhes do pedido')
        }

        const pedidoData = response.data
        setPedido(pedidoData)

        // Configurar dados do formulário
        setFormData({
          quantidade: pedidoData.quantidade?.toString() || '1'
        })

        // Configurar observações
        if (pedidoData.observacoes) {
          setObservacoes(pedidoData.observacoes.split('\n').filter((obs: string) => obs.trim()))
        }

        // Buscar produtos do pedido
        try {
          const produtosPedidoResponse = await api.get(`/api/pedidos/${pedidoId}/produtos`)

          // A resposta vem diretamente como array da API
          const produtosPedido = Array.isArray(produtosPedidoResponse) ? produtosPedidoResponse : []

          // Converter produtos do pedido para o formato esperado
          const produtosArray = Array.isArray(produtosPedido) ? produtosPedido : []

          const produtosFormatados = await Promise.all(
            produtosArray.map(async (item: any) => {
              try {
                // Verificar se o item tem a estrutura esperada
                if (!item || !item.produto || !item.produto.id) {
                  console.warn('Item de produto com estrutura inválida:', item)
                  return null
                }

                const custoResponse = await api.get(`/api/produtos/${item.produto.id}/custo-com-margem`)
                const custoTotal = custoResponse.custo_com_margem || item.produto.preco_unitario || 0

                return {
                  id: item.produto.id,
                  nome: item.produto.nome,
                  custoTotal: custoTotal,
                  quantidade: item.quantidade
                }
              } catch (error) {
                console.error('Erro ao processar produto:', error)
                if (!item || !item.produto) return null

                return {
                  id: item.produto.id,
                  nome: item.produto.nome,
                  custoTotal: item.produto.preco_unitario || 0,
                  quantidade: item.quantidade
                }
              }
            })
          )

          // Filtrar produtos nulos e definir no estado
          const produtosValidos = produtosFormatados.filter(produto => produto !== null)
          setProdutosSelecionados(produtosValidos)
        } catch (err) {
          console.error('=== ERRO AO CARREGAR PRODUTOS ===');
          console.error('Erro ao carregar produtos do pedido:', err)
        }

      } catch (err) {
        console.error('Erro ao buscar pedido:', err)
        setError(err instanceof Error ? err.message : 'Erro ao carregar pedido')
      } finally {
        setLoading(false)
      }
    }

    const fetchProdutos = async () => {
      setFetchingProdutos(true)
      try {
        const response = await api.get('/api/produtos?pageSize=1000')
        const produtosData = response.data?.data || response.data || []
        setProdutos(produtosData)

        // Buscar preço final de cada produto
        const produtosComPreco = await Promise.all(
          produtosData.map(async (produto: any) => {
            try {
              const precoResponse = await api.get(`/api/produtos/${produto.id}/custo-com-margem`)
              return {
                id: produto.id,
                nome: produto.nome,
                precoFinal: precoResponse.custo_com_margem || produto.preco_unitario || 0
              }
            } catch (error) {
              console.error(`Erro ao buscar preço final do produto ${produto.id}:`, error)
              return {
                id: produto.id,
                nome: produto.nome,
                precoFinal: produto.preco_unitario || 0
              }
            }
          })
        )
        setProdutosComPrecoFinal(produtosComPreco)
      } catch (err) {
        console.error('Erro ao buscar produtos:', err)
      } finally {
        setFetchingProdutos(false)
      }
    }

    fetchPedido()
    fetchProdutos()
  }, [pedidoId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target

    if (name === 'quantidade') {
      const formattedValue = value.replace(/\D/g, '')
      setFormData({
        ...formData,
        [name]: formattedValue
      })
    } else {
      setFormData({
        ...formData,
        [name]: value
      })
    }
  }

  const adicionarObservacao = () => {
    if (novaObservacao.trim()) {
      setObservacoes([...observacoes, novaObservacao.trim()])
      setNovaObservacao('')
    }
  }

  const editarObservacao = (index: number) => {
    setEditandoObservacao(index)
    setObservacaoEditada(observacoes[index])
  }

  const salvarEdicaoObservacao = () => {
    if (editandoObservacao !== null && observacaoEditada.trim()) {
      const novasObservacoes = [...observacoes]
      novasObservacoes[editandoObservacao] = observacaoEditada.trim()
      setObservacoes(novasObservacoes)
      setEditandoObservacao(null)
      setObservacaoEditada('')
    }
  }

  const cancelarEdicaoObservacao = () => {
    setEditandoObservacao(null)
    setObservacaoEditada('')
  }

  const excluirObservacao = (index: number) => {
    setObservacoes(observacoes.filter((_, i) => i !== index))
  }

  const adicionarProduto = async (produtoId: string) => {
    const produto = produtos.find(p => p.id === produtoId)
    if (produto && !produtosSelecionados.find(p => p.id === produtoId)) {
      try {
        // Busca o custo com margem do produto
        const response = await api.get(`/api/produtos/${produtoId}/custo-com-margem`)
        const custoTotal = response.custo_com_margem || produto.preco_unitario || 0

        const novoProduto = {
          id: produto.id,
          nome: produto.nome,
          custoTotal: custoTotal,
          quantidade: 1
        }

        setProdutosSelecionados([...produtosSelecionados, novoProduto])

        // Adicionar produto ao pedido via API
        try {
          await api.post(`/api/pedidos/${pedidoId}/produtos`, {
            produto_id: produto.id,
            quantidade: 1
          })
        } catch (apiError) {
          console.error('Erro ao adicionar produto via API:', apiError)
        }

      } catch (error) {
        console.error('Erro ao buscar custo com margem do produto:', error)
        const custoTotal = produto.preco_unitario || 0
        const novoProduto = {
          id: produto.id,
          nome: produto.nome,
          custoTotal: custoTotal,
          quantidade: 1
        }
        setProdutosSelecionados([...produtosSelecionados, novoProduto])
      }
    }
  }

  const removerProduto = async (produtoId: string) => {
    // Encontrar o produto no pedido para obter o ID da relação
    const produtoParaRemover = produtosSelecionados.find(p => p.id === produtoId)
    if (!produtoParaRemover) return

    // Remover da interface
    setProdutosSelecionados(produtosSelecionados.filter(p => p.id !== produtoId))

    // Remover via API (precisa encontrar o ID da relação produtos_pedidos)
    try {
      const produtosPedidoResponse = await api.get(`/api/pedidos/${pedidoId}/produtos`)
      const produtosPedido = Array.isArray(produtosPedidoResponse) ? produtosPedidoResponse : []
      const produtoPedido = produtosPedido.find((item: any) => item.produto.id === produtoId)

      if (produtoPedido) {
        console.log('Removendo produto via API:', produtoPedido.id);
        await api.delete(`/api/pedidos/produtos/${produtoPedido.id}`)
        console.log('Produto removido com sucesso');
      } else {
        console.warn('Produto não encontrado para remoção:', produtoId);
      }
    } catch (error) {
      console.error('Erro ao remover produto via API:', error)
    }
  }

  const atualizarQuantidadeProduto = async (produtoId: string, novaQuantidade: number) => {
    if (novaQuantidade <= 0) return

    setProdutosSelecionados(produtosSelecionados.map(produto =>
      produto.id === produtoId
        ? { ...produto, quantidade: novaQuantidade }
        : produto
    ))

    // Atualizar via API
    try {
      const produtosPedidoResponse = await api.get(`/api/pedidos/${pedidoId}/produtos`)
      const produtosPedido = Array.isArray(produtosPedidoResponse) ? produtosPedidoResponse : []
      const produtoPedido = produtosPedido.find((item: any) => item.produto.id === produtoId)

      if (produtoPedido) {
        console.log('Atualizando quantidade do produto:', produtoId, 'para:', novaQuantidade);
        // Remover o produto atual
        await api.delete(`/api/pedidos/produtos/${produtoPedido.id}`)
        // Adicionar novamente com a nova quantidade
        await api.post(`/api/pedidos/${pedidoId}/produtos`, {
          produto_id: produtoId,
          quantidade: novaQuantidade
        })
        console.log('Quantidade atualizada com sucesso');
      } else {
        console.warn('Produto não encontrado para atualização:', produtoId);
      }
    } catch (error) {
      console.error('Erro ao atualizar quantidade via API:', error)
    }
  }

  const recarregarPedido = async () => {
    try {
      const response = await api.get(`/api/pedidos/${pedidoId}`)
      if (!response.error) {
        setPedido(response.data)
      }
    } catch (error) {
      console.error('Erro ao recarregar pedido:', error)
    }
  }

  const salvarAlteracoes = async () => {
    setSalvandoObservacoes(true)
    try {
      // Atualizar dados básicos do pedido
      await api.put(`/api/pedidos/${pedidoId}`, {
        quantidade: parseInt(formData.quantidade),
        observacoes: observacoes.join('\n') || null
      })

      setEditando(false)

      // Recarregar dados do pedido
      await recarregarPedido()

    } catch (error) {
      console.error('Erro ao salvar alterações:', error)
      setError('Erro ao salvar alterações')
    } finally {
      setSalvandoObservacoes(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'pendente': { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200', text: 'Pendente' },
      'em_producao': { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200', text: 'Em Produção' },
      'finalizado': { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200', text: 'Finalizado' },
      'cancelado': { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200', text: 'Cancelado' }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pendente

    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
        {config.text}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="p-4 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !pedido) {
    return (
      <div className="p-4">
        <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-md">
          <h2 className="text-red-800 dark:text-red-200 font-medium">Erro</h2>
          <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
          <div className="mt-3 space-x-2">
            <button
              onClick={() => window.location.reload()}
              className="text-sm text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
            >
              Tentar novamente
            </button>
            <Link
              href="/pedidos"
              className="text-sm text-red-600 hover:text-red-700 underline"
            >
              Voltar para pedidos
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-4">
              <li>
                <Link href="/pedidos" className="text-gray-400 hover:text-gray-500">
                  Pedidos
                </Link>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="flex-shrink-0 h-5 w-5 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
                  </svg>
                  <span className="ml-4 text-sm font-medium text-gray-900 dark:text-white">
                    Pedido #{pedido.id.slice(-8)}
                  </span>
                </div>
              </li>
            </ol>
          </nav>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Pedido #{pedido.id.slice(-8)}
            </h1>
            {getStatusBadge(pedido.status)}
            {isNewOrder && (
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                Novo
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Criado em {new Date(pedido.created_at).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/pedidos/${pedidoId}/exportar-orcamento`}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar Orçamento
          </Link>
          {!editando ? (
            <button
              onClick={() => setEditando(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar
            </button>
          ) : (
            <>
              <button
                onClick={() => setEditando(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancelar
              </button>
              <button
                onClick={salvarAlteracoes}
                disabled={salvandoObservacoes}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {salvandoObservacoes ? 'Salvando...' : 'Salvar'}
              </button>
            </>
          )}
          <Link
            href="/pedidos"
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-700 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Voltar
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Erro</h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="p-6 space-y-6">
          {/* Informações básicas do pedido */}
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Quantidade
              </label>
              <div className="mt-1">
                {editando ? (
                  <input
                    type="text"
                    name="quantidade"
                    value={formData.quantidade}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                  />
                ) : (
                  <p className="text-sm text-gray-900 dark:text-white">{pedido.quantidade}</p>
                )}
              </div>
            </div>
          </div>

          {/* Seção de Produtos */}
          <div className="sm:col-span-6">
            <div className="flex justify-between items-center mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Produtos
              </label>
              {editando && (
                <div className="flex gap-2">
                  <select
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                    onChange={async (e) => {
                      if (e.target.value) {
                        await adicionarProduto(e.target.value)
                        e.target.value = ''
                      }
                    }}
                  >
                    <option value="">Adicionar produto</option>
                    {produtosComPrecoFinal
                      .filter(produto => !produtosSelecionados.find(p => p.id === produto.id))
                      .map(produto => (
                        <option key={produto.id} value={produto.id}>
                          {produto.nome} - R$ {produto.precoFinal.toFixed(2)}
                        </option>
                      ))}
                  </select>
                  <Link
                    href="/produtos/novo"
                    className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-700 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Novo Produto
                  </Link>
                </div>
              )}
            </div>

            {/* Lista de produtos */}
            {produtosSelecionados.length > 0 ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Produtos do Pedido:</h4>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    Total: R$ {produtosSelecionados.reduce((total, produto) => total + (produto.custoTotal * produto.quantidade), 0).toFixed(2)}
                  </p>
                </div>
                {produtosSelecionados.map((produto) => (
                  <div key={produto.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{produto.nome}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Preço Final do Produto: R$ {produto.custoTotal.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Subtotal: R$ {(produto.custoTotal * produto.quantidade).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {editando ? (
                        <>
                          <div className="flex items-center gap-2">
                            <label className="text-sm text-gray-600 dark:text-gray-400">Qtd:</label>
                            <div className="flex items-center">
                              <button
                                type="button"
                                onClick={() => atualizarQuantidadeProduto(produto.id, produto.quantidade - 1)}
                                className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-l-md bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                                disabled={produto.quantidade <= 1}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={produto.quantidade}
                                onChange={(e) => {
                                  const valor = parseInt(e.target.value) || 1
                                  atualizarQuantidadeProduto(produto.id, valor)
                                }}
                                className="w-16 h-8 text-center text-sm border-t border-b border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
                              />
                              <button
                                type="button"
                                onClick={() => atualizarQuantidadeProduto(produto.id, produto.quantidade + 1)}
                                className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-r-md bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removerProduto(produto.id)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                          >
                            Remover
                          </button>
                        </>
                      ) : (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Qtd: {produto.quantidade}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-md">
                <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum produto adicionado ao pedido</p>
                {editando && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Use o seletor acima para adicionar produtos
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Seção de Observações */}
          <div className="sm:col-span-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Observações
            </label>

            {/* Lista de observações existentes */}
            {observacoes.length > 0 && (
              <div className="mb-4 space-y-2">
                {observacoes.map((obs, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                    {editandoObservacao === index ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={observacaoEditada}
                          onChange={(e) => setObservacaoEditada(e.target.value)}
                          className="flex-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white rounded-md"
                          onKeyDown={(e) => e.key === 'Enter' && salvarEdicaoObservacao()}
                        />
                        <button
                          type="button"
                          onClick={salvarEdicaoObservacao}
                          className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                        >
                          Salvar
                        </button>
                        <button
                          type="button"
                          onClick={cancelarEdicaoObservacao}
                          className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-gray-900 dark:text-white">{obs}</span>
                        {editando && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => editarObservacao(index)}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => excluirObservacao(index)}
                              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                            >
                              Excluir
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Campo para adicionar nova observação */}
            {editando && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={novaObservacao}
                  onChange={(e) => setNovaObservacao(e.target.value)}
                  placeholder="Digite uma observação..."
                  className="flex-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), adicionarObservacao())}
                />
                <button
                  type="button"
                  onClick={adicionarObservacao}
                  className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Adicionar
                </button>
              </div>
            )}

            {observacoes.length === 0 && !editando && (
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                Nenhuma observação adicionada
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Seção de Taxas */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="p-6">
          <TaxasPedido
            pedidoId={pedidoId}
            valorFreteAtual={pedido.valor_frete}
            editando={editando}
            onTaxasChange={recarregarPedido}
          />
        </div>
      </div>

      {/* Seção de Resumo */}
      <ResumoPedido
        pedidoId={pedidoId}
        produtosSelecionados={produtosSelecionados}
        valorFrete={pedido.valor_frete}
      />

      {/* Informações do Cliente */}
      {pedido.cliente && (
        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">Informações do Cliente</h3>
          <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs text-blue-700 dark:text-blue-300">Cliente/Empresa</p>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {pedido.cliente.nome_cliente_empresa}
              </p>
            </div>
            <div>
              <p className="text-xs text-blue-700 dark:text-blue-300">Responsável</p>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {pedido.cliente.nome_responsavel}
              </p>
            </div>
            {pedido.cliente.cnpj_cpf && (
              <div>
                <p className="text-xs text-blue-700 dark:text-blue-300">CNPJ/CPF</p>
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  {pedido.cliente.cnpj_cpf}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-blue-700 dark:text-blue-300">Telefone/WhatsApp</p>
              <p className="text-sm text-blue-900 dark:text-blue-100">
                {pedido.cliente.telefone_whatsapp}
              </p>
            </div>
            {pedido.cliente.email && (
              <div>
                <p className="text-xs text-blue-700 dark:text-blue-300">E-mail</p>
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  {pedido.cliente.email}
                </p>
              </div>
            )}
            {pedido.cliente.endereco && (
              <div>
                <p className="text-xs text-blue-700 dark:text-blue-300">Endereço</p>
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  {pedido.cliente.endereco}
                </p>
              </div>
            )}
            {pedido.cliente.bairro && (
              <div>
                <p className="text-xs text-blue-700 dark:text-blue-300">Bairro</p>
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  {pedido.cliente.bairro}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-blue-700 dark:text-blue-300">Cidade/Estado</p>
              <p className="text-sm text-blue-900 dark:text-blue-100">
                {pedido.cliente.cidade}, {pedido.cliente.estado_uf}
              </p>
            </div>
            {pedido.cliente.cep && (
              <div>
                <p className="text-xs text-blue-700 dark:text-blue-300">CEP</p>
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  {pedido.cliente.cep}
                </p>
              </div>
            )}
            {pedido.cliente.tipo_interesse && (
              <div>
                <p className="text-xs text-blue-700 dark:text-blue-300">Tipo de Interesse</p>
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  {pedido.cliente.tipo_interesse}
                </p>
              </div>
            )}
            {pedido.cliente.origem_contato && (
              <div>
                <p className="text-xs text-blue-700 dark:text-blue-300">Origem do Contato</p>
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  {pedido.cliente.origem_contato}
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-blue-700 dark:text-blue-300">Status do Orçamento</p>
              <p className="text-sm text-blue-900 dark:text-blue-100">
                {pedido.cliente.status_orcamento === 'aberto' ? 'Aberto' :
                  pedido.cliente.status_orcamento === 'pedido_confirmado' ? 'Pedido Confirmado' :
                    'Cancelado'}
              </p>
            </div>
            {pedido.cliente.descricao_demanda && (
              <div className="sm:col-span-2 lg:col-span-3">
                <p className="text-xs text-blue-700 dark:text-blue-300">Descrição da Demanda</p>
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  {pedido.cliente.descricao_demanda}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}