'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'

type MaoDeObra = {
  id: string
  tipo: string
  preco_por_hora: number
  created_at: string
  updated_at: string
}

type ProdutoMaoDeObra = {
  id: string
  horas: number
  mao_de_obra: MaoDeObra
}

type Produto = {
  id: string
  nome: string
  descricao: string
  preco_unitario: number
  quantidade_estoque: number
  e_materia_prima: boolean
}

export default function MaoDeObraProdutoPage() {
  const params = useParams()
  const router = useRouter()
  const produtoId = params.id as string

  const [produto, setProduto] = useState<Produto | null>(null)
  const [maoDeObraDisponivel, setMaoDeObraDisponivel] = useState<MaoDeObra[]>([])
  const [produtoMaoDeObra, setProdutoMaoDeObra] = useState<ProdutoMaoDeObra[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingMaoDeObra, setEditingMaoDeObra] = useState<ProdutoMaoDeObra | null>(null)
  const [deletingMaoDeObra, setDeletingMaoDeObra] = useState<ProdutoMaoDeObra | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  // Estados do formulário
  const [formData, setFormData] = useState({
    mao_de_obra_id: '',
    horas: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Buscar informações do produto
        const produtoResponse = await api.get(`/api/produtos/${produtoId}`)
        setProduto(produtoResponse.data)

        // Buscar mão de obra disponível
        const maoDeObraResponse = await api.get('/api/mao-de-obra')
        const maoDeObraData = maoDeObraResponse.data?.data || maoDeObraResponse.data || []
        setMaoDeObraDisponivel(maoDeObraData)

        // Buscar mão de obra já associada ao produto
        const produtoMaoDeObraResponse = await api.get(`/api/produtos/${produtoId}/mao-de-obra`)
        const produtoMaoDeObraData = produtoMaoDeObraResponse.data || []
        setProdutoMaoDeObra(produtoMaoDeObraData)
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
      const maoDeObraData = {
        mao_de_obra_id: formData.mao_de_obra_id,
        horas: parseFloat(formData.horas)
      }

      let response
      if (editingMaoDeObra) {
        response = await api.put(`/api/produtos/mao-de-obra/${editingMaoDeObra.id}`, maoDeObraData)
      } else {
        response = await api.post(`/api/produtos/${produtoId}/mao-de-obra`, maoDeObraData)
      }

      if (response.error) {
        throw new Error(response.error)
      }

      // Recarregar a lista de mão de obra do produto
      const produtoMaoDeObraResponse = await api.get(`/api/produtos/${produtoId}/mao-de-obra`)
      const produtoMaoDeObraData = produtoMaoDeObraResponse.data || []
      setProdutoMaoDeObra(produtoMaoDeObraData)

      // Resetar formulário e fechar modal
      setFormData({
        mao_de_obra_id: '',
        horas: ''
      })
      setShowModal(false)
      setEditingMaoDeObra(null)
    } catch (err) {
      console.error('Erro ao salvar mão de obra:', err)
      setError(err instanceof Error ? err.message : 'Erro ao salvar mão de obra')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (produtoMao: ProdutoMaoDeObra) => {
    setFormData({
      mao_de_obra_id: produtoMao.mao_de_obra.id,
      horas: produtoMao.horas.toString()
    })
    setEditingMaoDeObra(produtoMao)
    setShowModal(true)
  }

  const handleDelete = async () => {
    if (!deletingMaoDeObra) return

    try {
      const response = await api.delete(`/api/produtos/mao-de-obra/${deletingMaoDeObra.id}`)
      
      if (response.error) {
        throw new Error(response.error)
      }

      // Recarregar a lista de mão de obra do produto
      const produtoMaoDeObraResponse = await api.get(`/api/produtos/${produtoId}/mao-de-obra`)
      const produtoMaoDeObraData = produtoMaoDeObraResponse.data || []
      setProdutoMaoDeObra(produtoMaoDeObraData)

      setShowDeleteModal(false)
      setDeletingMaoDeObra(null)
    } catch (err) {
      console.error('Erro ao excluir mão de obra:', err)
      setError(err instanceof Error ? err.message : 'Erro ao excluir mão de obra')
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  const custoTotal = produtoMaoDeObra.reduce((total, mao) => {
    return total + (mao.mao_de_obra.preco_por_hora * mao.horas)
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
                    Mão de Obra
                  </span>
                </div>
              </li>
            </ol>
          </nav>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Mão de Obra
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gerencie a mão de obra necessária para fabricar {produto?.nome}
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
                mao_de_obra_id: '',
                horas: ''
              })
              setEditingMaoDeObra(null)
              setShowModal(true)
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Adicionar Mão de Obra
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

      {/* Lista de mão de obra */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Mão de Obra do Produto ({produtoMaoDeObra.length})
          </h3>
        </div>
        
        {produtoMaoDeObra.length > 0 ? (
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
                    Custo Total
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {produtoMaoDeObra.map((produtoMao) => (
                  <tr key={produtoMao.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {produtoMao.mao_de_obra.tipo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {produtoMao.horas}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {formatCurrency(produtoMao.mao_de_obra.preco_por_hora)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {formatCurrency(produtoMao.mao_de_obra.preco_por_hora * produtoMao.horas)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(produtoMao)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          setDeletingMaoDeObra(produtoMao)
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
                  <td colSpan={3} className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white text-right">
                    Custo Total da Mão de Obra:
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              Nenhuma mão de obra adicionada
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Adicione tipos de mão de obra necessários para este produto.
            </p>
            <div className="mt-6">
              <button
                onClick={() => {
                  setFormData({
                    mao_de_obra_id: '',
                    horas: ''
                  })
                  setEditingMaoDeObra(null)
                  setShowModal(true)
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Adicionar Mão de Obra
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
                {editingMaoDeObra ? 'Editar Mão de Obra' : 'Adicionar Mão de Obra'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="mao_de_obra_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Tipo de Mão de Obra *
                  </label>
                  <select
                    id="mao_de_obra_id"
                    required
                    value={formData.mao_de_obra_id}
                    onChange={(e) => setFormData({ ...formData, mao_de_obra_id: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
                    disabled={!!editingMaoDeObra}
                  >
                    <option value="">Selecione um tipo</option>
                    {maoDeObraDisponivel.map((mao) => (
                      <option key={mao.id} value={mao.id}>
                        {mao.tipo} - {formatCurrency(mao.preco_por_hora)}/hora
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="horas" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Horas *
                  </label>
                  <input
                    type="number"
                    id="horas"
                    required
                    min="0"
                    step="0.01"
                    value={formData.horas}
                    onChange={(e) => setFormData({ ...formData, horas: e.target.value })}
                    className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:text-white"
                    placeholder="0.00"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      setEditingMaoDeObra(null)
                      setError(null)
                    }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Salvando...' : (editingMaoDeObra ? 'Atualizar' : 'Adicionar')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {showDeleteModal && deletingMaoDeObra && (
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
                  Tem certeza que deseja remover a mão de obra "{deletingMaoDeObra.mao_de_obra.tipo}" deste produto? Esta ação não pode ser desfeita.
                </p>
              </div>
              <div className="flex justify-center space-x-3 mt-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false)
                    setDeletingMaoDeObra(null)
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
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