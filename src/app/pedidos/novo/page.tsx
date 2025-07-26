'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { Cliente, Produto } from '@/types'

export default function NovoPedidoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetchingClientes, setFetchingClientes] = useState(true)
  const [fetchingProdutos, setFetchingProdutos] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [produtosComPrecoFinal, setProdutosComPrecoFinal] = useState<{ id: string, nome: string, precoFinal: number }[]>([])
  const [produtosSelecionados, setProdutosSelecionados] = useState<{ id: string, nome: string, custoTotal: number, quantidade: number }[]>([])
  const [observacoes, setObservacoes] = useState<string[]>([])
  const [novaObservacao, setNovaObservacao] = useState('')
  const [editandoObservacao, setEditandoObservacao] = useState<number | null>(null)
  const [observacaoEditada, setObservacaoEditada] = useState('')

  const [formData, setFormData] = useState({
    cliente_id: '',
    quantidade: '1'
  })

  useEffect(() => {
    const fetchClientes = async () => {
      setFetchingClientes(true)
      try {
        const response = await api.get('/api/clientes');
        setClientes(response.data || [])
      } catch (err) {
        console.error('Erro ao buscar clientes:', err)
        setError('Não foi possível carregar a lista de clientes. Tente novamente mais tarde.')
      } finally {
        setFetchingClientes(false)
      }
    }

    const fetchProdutos = async () => {
      setFetchingProdutos(true)
      try {
        const response = await api.get('/api/produtos?pageSize=1000');
        const produtosData = response.data?.data || response.data || [];
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
        setError('Não foi possível carregar a lista de produtos. Tente novamente mais tarde.')
      } finally {
        setFetchingProdutos(false)
      }
    }

    fetchClientes()
    fetchProdutos()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target

    if (name === 'quantidade') {
      // Somente aceita números inteiros
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

        setProdutosSelecionados([...produtosSelecionados, {
          id: produto.id,
          nome: produto.nome,
          custoTotal: custoTotal,
          quantidade: 1
        }])
      } catch (error) {
        console.error('Erro ao buscar custo com margem do produto:', error)
        // Fallback para o preço unitário se a API falhar
        const custoTotal = produto.preco_unitario || 0
        setProdutosSelecionados([...produtosSelecionados, {
          id: produto.id,
          nome: produto.nome,
          custoTotal: custoTotal,
          quantidade: 1
        }])
      }
    }
  }

  const removerProduto = (produtoId: string) => {
    setProdutosSelecionados(produtosSelecionados.filter(p => p.id !== produtoId))
  }

  const atualizarQuantidadeProduto = (produtoId: string, novaQuantidade: number) => {
    if (novaQuantidade <= 0) return

    setProdutosSelecionados(produtosSelecionados.map(produto =>
      produto.id === produtoId
        ? { ...produto, quantidade: novaQuantidade }
        : produto
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validações básicas
      if (!formData.cliente_id) {
        throw new Error('Selecione um cliente')
      }

      if (!formData.quantidade || parseInt(formData.quantidade) <= 0) {
        throw new Error('A quantidade deve ser maior que zero')
      }

      // Formata os dados para envio
      const pedidoData = {
        cliente_id: formData.cliente_id,
        quantidade: parseInt(formData.quantidade),
        observacoes: observacoes.join('\n') || null,
        produtos_selecionados: produtosSelecionados
      }

      // Envia os dados para a API usando o utilitário api
      const response = await api.post('/api/pedidos', pedidoData);

      const pedidoId = response.data?.id;
      if (!pedidoId) {
        throw new Error('ID do pedido não retornado pela API');
      }

      // Adiciona os produtos selecionados ao pedido
      if (produtosSelecionados.length > 0) {
        for (const produto of produtosSelecionados) {
          try {
            await api.post(`/api/pedidos/${pedidoId}/produtos`, {
              produto_id: produto.id,
              quantidade: produto.quantidade
            });
          } catch (produtoError) {
            console.error(`Erro ao adicionar produto ${produto.nome}:`, produtoError);
            // Continua adicionando outros produtos mesmo se um falhar
          }
        }
      }

      // Redireciona para a página do pedido após a criação bem-sucedida
      router.push(`/pedidos/${pedidoId}?novo=true`);
    } catch (err) {
      console.error('Erro ao criar pedido:', err)
      setError(err instanceof Error ? err.message : 'Ocorreu um erro ao criar o pedido')
    } finally {
      setLoading(false)
    }
  }

  const clienteSelecionado = formData.cliente_id
    ? clientes.find(c => c.id === formData.cliente_id)
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Novo Pedido
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Crie um novo pedido de fabricação
          </p>
        </div>
        <Link
          href="/pedidos"
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-700 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancelar
        </Link>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Erro ao criar pedido
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <label htmlFor="cliente_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Selecionar um cliente <span className="text-red-500">*</span>
              </label>
              <div className="mt-1 flex gap-2">
                {fetchingClientes ? (
                  <div className="flex items-center flex-1">
                    <div className="animate-spin h-5 w-5 mr-3 border-t-2 border-b-2 border-blue-600 rounded-full"></div>
                    <span className="text-gray-500 dark:text-gray-400">Carregando clientes...</span>
                  </div>
                ) : (
                  <select
                    id="cliente_id"
                    name="cliente_id"
                    required
                    value={formData.cliente_id}
                    onChange={handleChange}
                    className="flex-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                  >
                    <option value="">Selecione um cliente</option>
                    {clientes.map(cliente => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nome_cliente_empresa} - {cliente.nome_responsavel}
                      </option>
                    ))}
                  </select>
                )}
                <Link
                  href="/clientes/novo"
                  className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-700 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Adicionar
                </Link>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="quantidade" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Quantidade
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="quantidade"
                  id="quantidade"
                  required
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                  placeholder="1"
                  value={formData.quantidade}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="sm:col-span-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Produtos
              </label>

              {/* Seletor de produtos */}
              <div className="mb-4">
                {fetchingProdutos ? (
                  <div className="flex items-center">
                    <div className="animate-spin h-5 w-5 mr-3 border-t-2 border-b-2 border-blue-600 rounded-full"></div>
                    <span className="text-gray-500 dark:text-gray-400">Carregando produtos...</span>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <select
                      className="flex-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                      onChange={async (e) => {
                        if (e.target.value) {
                          await adicionarProduto(e.target.value)
                          e.target.value = ''
                        }
                      }}
                    >
                      <option value="">Selecione um produto para adicionar</option>
                      {produtos.length === 0 ? (
                        <option disabled>Nenhum produto encontrado</option>
                      ) : (
                        produtosComPrecoFinal
                          .filter(produto => !produtosSelecionados.find(p => p.id === produto.id))
                          .map(produto => (
                            <option key={produto.id} value={produto.id}>
                              {produto.nome} - R$ {produto.precoFinal.toFixed(2)}
                            </option>
                          ))
                      )}
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

              {/* Lista de produtos selecionados */}
              {produtosSelecionados.length > 0 && (
                <div className="mb-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Produtos Selecionados:</h4>
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
                            onKeyPress={(e) => e.key === 'Enter' && salvarEdicaoObservacao()}
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
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Campo para adicionar nova observação */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={novaObservacao}
                  onChange={(e) => setNovaObservacao(e.target.value)}
                  placeholder="Digite uma observação..."
                  className="flex-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), adicionarObservacao())}
                />
                <button
                  type="button"
                  onClick={adicionarObservacao}
                  className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Adicionar
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Adicione observações relevantes sobre o pedido, como especificações especiais ou prazos.
              </p>
            </div>
          </div>

          {clienteSelecionado && (
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">Informações do Cliente</h3>
              <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-300">Cliente/Empresa</p>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {clienteSelecionado.nome_cliente_empresa}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-300">Responsável</p>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {clienteSelecionado.nome_responsavel}
                  </p>
                </div>
                {clienteSelecionado.cnpj_cpf && (
                  <div>
                    <p className="text-xs text-blue-700 dark:text-blue-300">CNPJ/CPF</p>
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      {clienteSelecionado.cnpj_cpf}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-300">Telefone/WhatsApp</p>
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    {clienteSelecionado.telefone_whatsapp}
                  </p>
                </div>
                {clienteSelecionado.email && (
                  <div>
                    <p className="text-xs text-blue-700 dark:text-blue-300">E-mail</p>
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      {clienteSelecionado.email}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-300">Localização</p>
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    {clienteSelecionado.cidade}, {clienteSelecionado.estado_uf}
                  </p>
                </div>
                {clienteSelecionado.tipo_interesse && (
                  <div>
                    <p className="text-xs text-blue-700 dark:text-blue-300">Tipo de Interesse</p>
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      {clienteSelecionado.tipo_interesse}
                    </p>
                  </div>
                )}
                {clienteSelecionado.origem_contato && (
                  <div>
                    <p className="text-xs text-blue-700 dark:text-blue-300">Origem do Contato</p>
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      {clienteSelecionado.origem_contato}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-300">Status do Orçamento</p>
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    {clienteSelecionado.status_orcamento === 'aberto' ? 'Aberto' :
                      clienteSelecionado.status_orcamento === 'pedido_confirmado' ? 'Pedido Confirmado' :
                        'Cancelado'}
                  </p>
                </div>
                {clienteSelecionado.descricao_demanda && (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <p className="text-xs text-blue-700 dark:text-blue-300">Descrição da Demanda</p>
                    <p className="text-sm text-blue-900 dark:text-blue-100">
                      {clienteSelecionado.descricao_demanda}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => router.push('/pedidos')}
              className="mr-3 px-4 py-2 border border-gray-300 dark:border-gray-700 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || fetchingClientes}
              className="inline-flex justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Criando...' : 'Criar Pedido'}
            </button>
          </div>
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            <p>Após criar o pedido, você poderá adicionar produtos, processos de fabricação e mão de obra necessários.</p>
          </div>
        </form>
      </div>
    </div>
  )
} 