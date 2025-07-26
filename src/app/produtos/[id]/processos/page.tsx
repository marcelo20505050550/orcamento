'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'

type ProcessoFabricacao = {
  id: string
  nome: string
  preco_por_unidade: number
  tempo_estimado_minutos: number
  unidade_medida?: 'horas' | 'quilos'
  created_at: string
  updated_at: string
}

type ProdutoProcesso = {
  id: string
  quantidade: number
  unidade_medida: 'horas' | 'quilos'
  processo: ProcessoFabricacao
}

type Produto = {
  id: string
  nome: string
  descricao: string
  preco_unitario: number
  quantidade_estoque: number
  e_materia_prima: boolean
}

export default function ProcessosProdutoPage() {
  const params = useParams()
  const router = useRouter()
  const produtoId = params.id as string

  const [produto, setProduto] = useState<Produto | null>(null)
  const [processosDisponiveis, setProcessosDisponiveis] = useState<ProcessoFabricacao[]>([])
  const [produtoProcessos, setProdutoProcessos] = useState<ProdutoProcesso[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingProcesso, setEditingProcesso] = useState<ProdutoProcesso | null>(null)
  const [deletingProcesso, setDeletingProcesso] = useState<ProdutoProcesso | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Estados do formulário
  const [formData, setFormData] = useState({
    processo_id: '',
    quantidade: '',
    unidade_medida: 'horas' as 'horas' | 'quilos'
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Buscar informações do produto
        const produtoResponse = await api.get(`/api/produtos/${produtoId}`)
        setProduto(produtoResponse.data)

        // Buscar processos disponíveis
        const processosResponse = await api.get('/api/processos')
        const processosData = processosResponse.data?.data || processosResponse.data || []
        setProcessosDisponiveis(processosData)

        // Buscar processos já associados ao produto
        const produtoProcessosResponse = await api.get(`/api/produtos/${produtoId}/processos`)
        const produtoProcessosData = produtoProcessosResponse.data || []
        setProdutoProcessos(produtoProcessosData)
      } catch (err) {
        console.error('Erro ao buscar dados:', err)
        setError('Não foi possível carregar os dados. Tente novamente mais tarde.')
      } finally {
        setLoading(false)
      }
    }

    if (produtoId) {
      fetchData()
    }
  }, [produtoId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const processData = {
        processo_id: formData.processo_id,
        quantidade: parseFloat(formData.quantidade),
        unidade_medida: formData.unidade_medida
      }

      let response
      if (editingProcesso) {
        response = await api.put(`/api/produtos/processos/${editingProcesso.id}`, processData)
      } else {
        response = await api.post(`/api/produtos/${produtoId}/processos`, processData)
      }

      if (response.error) {
        throw new Error(response.error)
      }

      // Recarregar a lista de processos do produto
      const produtoProcessosResponse = await api.get(`/api/produtos/${produtoId}/processos`)
      const produtoProcessosData = produtoProcessosResponse.data || []
      setProdutoProcessos(produtoProcessosData)

      // Resetar formulário e fechar modal
      setFormData({
        processo_id: '',
        quantidade: '',
        unidade_medida: 'horas'
      })
      setShowModal(false)
      setEditingProcesso(null)
    } catch (err) {
      console.error('Erro ao salvar processo:', err)
      setError(err instanceof Error ? err.message : 'Erro ao salvar processo')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (produtoProcesso: ProdutoProcesso) => {
    setFormData({
      processo_id: produtoProcesso.processo.id,
      quantidade: produtoProcesso.quantidade.toString(),
      unidade_medida: produtoProcesso.unidade_medida
    })
    setEditingProcesso(produtoProcesso)
    setShowModal(true)
  }

  const handleDelete = async () => {
    if (!deletingProcesso) return

    try {
      const response = await api.delete(`/api/produtos/processos/${deletingProcesso.id}`)
      
      if (response.error) {
        throw new Error(response.error)
      }

      // Recarregar a lista de processos do produto
      const produtoProcessosResponse = await api.get(`/api/produtos/${produtoId}/processos`)
      const produtoProcessosData = produtoProcessosResponse.data || []
      setProdutoProcessos(produtoProcessosData)

      setShowDeleteModal(false)
      setDeletingProcesso(null)
    } catch (err) {
      console.error('Erro ao excluir processo:', err)
      setError(err instanceof Error ? err.message : 'Erro ao excluir processo')
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const custoTotal = produtoProcessos.reduce((total, proc) => {
    return total + (proc.processo.preco_por_unidade * proc.quantidade)
  }, 0)

  if (loading) {
    return (
      <div className="p-4 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error && !produto) {
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
              href={`/produtos/${produtoId}`}
              className="text-sm text-red-600 hover:text-red-700 underline"
            >
              Voltar para produto
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" suppressHydrationWarning>
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-4">
              <li>
                <Link href="/produtos" className="text-gray-400 hover:text-gray-500">
                  Produtos
                </Link>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="flex-shrink-0 h-5 w-5 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
                  </svg>
                  <Link href={`/produtos/${produtoId}`} className="ml-4 text-gray-400 hover:text-gray-500">
                    {produto?.nome || 'Produto'}
                  </Link>
                </div>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="flex-shrink-0 h-5 w-5 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
                  </svg>
                  <span className="ml-4 text-sm font-medium text-gray-900 dark:text-white">
                    Processos
                  </span>
                </div>
              </li>
            </ol>
          </nav>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Processos de Fabricação
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gerencie os processos necessários para fabricar {produto?.nome}
          </p>
        </div>
        <div className="flex space-x-3">
          <Link
            href={`/produtos/${produtoId}`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Voltar
          </Link>
          <button
            onClick={() => {
              setFormData({
                processo_id: '',
                quantidade: '',
                unidade_medida: 'horas'
              })
              setEditingProcesso(null)
              setShowModal(true)
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Adicionar Processo
          </button>
        </div>
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Erro
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="bg-red-50 dark:bg-red-900/30 px-2 py-1.5 rounded-md text-sm font-medium text-red-800 dark:text-red-200 hover:bg-red-100 dark:hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de processos */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Processos do Produto ({produtoProcessos.length})
          </h3>
        </div>
        
        {produtoProcessos.length > 0 ? (
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
                    Unidade
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Preço Unit.
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Custo Total
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {produtoProcessos.map((produtoProcesso) => (
                  <tr key={produtoProcesso.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {produtoProcesso.processo.nome}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {produtoProcesso.quantidade}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        produtoProcesso.unidade_medida === 'horas'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                      }`}>
                        {produtoProcesso.unidade_medida === 'horas' ? 'Horas' : 'Quilos'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {formatCurrency(produtoProcesso.processo.preco_por_unidade)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {formatCurrency(produtoProcesso.processo.preco_por_unidade * produtoProcesso.quantidade)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(produtoProcesso)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          setDeletingProcesso(produtoProcesso)
                          setShowDeleteModal(true)
                        }}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <td colSpan={4} className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white text-right">
                    Custo Total dos Processos:
                  </td>
                  <td className="px-6 py-3 text-sm font-bold text-gray-900 dark:text-white">
                    {formatCurrency(custoTotal)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
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
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              Nenhum processo adicionado
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Adicione processos de fabricação necessários para este produto.
            </p>
            <div className="mt-6">
              <button
                onClick={() => {
                  setFormData({
                    processo_id: '',
                    quantidade: '',
                    unidade_medida: 'horas'
                  })
                  setEditingProcesso(null)
                  setShowModal(true)
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Adicionar Processo
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de formulário */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {editingProcesso ? 'Editar Processo' : 'Adicionar Processo'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="processo_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Processo *
                  </label>
                  <select
                    id="processo_id"
                    required
                    value={formData.processo_id}
                    onChange={(e) => setFormData({ ...formData, processo_id: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                    disabled={!!editingProcesso}
                  >
                    <option value="">Selecione um processo</option>
                    {processosDisponiveis.map((processo) => (
                      <option key={processo.id} value={processo.id}>
                        {processo.nome} - {formatCurrency(processo.preco_por_unidade)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="quantidade" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Quantidade *
                  </label>
                  <input
                    type="number"
                    id="quantidade"
                    required
                    min="0"
                    step="0.01"
                    value={formData.quantidade}
                    onChange={(e) => setFormData({ ...formData, quantidade: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label htmlFor="unidade_medida" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Unidade de Medida *
                  </label>
                  <select
                    id="unidade_medida"
                    required
                    value={formData.unidade_medida}
                    onChange={(e) => setFormData({ ...formData, unidade_medida: e.target.value as 'horas' | 'quilos' })}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="horas">Horas</option>
                    <option value="quilos">Quilos</option>
                  </select>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingProcesso(null)
                      setError(null)
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Salvando...' : (editingProcesso ? 'Atualizar' : 'Adicionar')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {showDeleteModal && deletingProcesso && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30">
                <svg className="h-6 w-6 text-red-600 dark:text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-2">
                Confirmar Remoção
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Tem certeza que deseja remover o processo "{deletingProcesso.processo.nome}" deste produto? Esta ação não pode ser desfeita.
                </p>
              </div>
              <div className="flex justify-center space-x-3 mt-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeletingProcesso(null)
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Remover
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}