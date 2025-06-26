'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { fetchApi } from '@/lib/api'

type MaoDeObra = {
  id: string
  tipo: string
  preco_por_hora: number
}

type MaoDeObraPedido = {
  id: string
  pedido_id: string
  mao_de_obra_id: string
  horas: number
  mao_de_obra: MaoDeObra
}

export default function MaoDeObraPedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const pedidoId = use(params).id
  const router = useRouter()
  const [maoDeObraPedido, setMaoDeObraPedido] = useState<MaoDeObraPedido[]>([])
  const [maoDeObraDisponivel, setMaoDeObraDisponivel] = useState<MaoDeObra[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formVisible, setFormVisible] = useState(false)
  
  // Estado para o formulário de adição de mão de obra
  const [formData, setFormData] = useState({
    mao_de_obra_id: '',
    horas: ''
  })
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  
  // Estados para edição
  const [editingMaoDeObra, setEditingMaoDeObra] = useState<MaoDeObraPedido | null>(null)
  const [editFormData, setEditFormData] = useState({ horas: '' })
  const [editSubmitting, setEditSubmitting] = useState(false)
  
  useEffect(() => {
    const fetchMaoDeObraPedido = async () => {
      setLoading(true)
      try {
        // Busca a mão de obra do pedido usando fetchApi
        const data = await fetchApi<{ data: MaoDeObraPedido[] }>(`/api/pedidos/${pedidoId}/mao-de-obra`)
        setMaoDeObraPedido(data.data || [])
        
        // Busca todos os tipos de mão de obra disponíveis
        const maoDeObraData = await fetchApi<{ data: MaoDeObra[] }>('/api/mao-de-obra')
        setMaoDeObraDisponivel(maoDeObraData.data || [])
      } catch (err) {
        console.error('Erro ao buscar mão de obra:', err)
        setError(err instanceof Error ? err.message : 'Ocorreu um erro ao carregar os dados de mão de obra')
      } finally {
        setLoading(false)
      }
    }

    if (pedidoId) {
      fetchMaoDeObraPedido()
    }
  }, [pedidoId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    if (name === 'horas') {
      // Aceita números com decimais (formato brasileiro)
      const formattedValue = value.replace(/[^\d,]/g, '').replace(',', '.')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormSubmitting(true)
    setFormError(null)

    try {
      // Validações básicas
      if (!formData.mao_de_obra_id) {
        throw new Error('Selecione um tipo de mão de obra')
      }

      if (!formData.horas || parseFloat(formData.horas) <= 0) {
        throw new Error('O número de horas deve ser maior que zero')
      }

      // Formata os dados para envio
      const maoDeObraData = {
        mao_de_obra_id: formData.mao_de_obra_id,
        horas: parseFloat(formData.horas)
      }

      // Envia os dados para a API usando fetchApi
      const data = await fetchApi<{ data: MaoDeObraPedido }>(`/api/pedidos/${pedidoId}/mao-de-obra`, {
        method: 'POST',
        body: JSON.stringify(maoDeObraData)
      })
      
      // Adiciona o novo item à lista
      setMaoDeObraPedido([...maoDeObraPedido, data.data])
      
      // Limpa o formulário
      setFormData({
        mao_de_obra_id: '',
        horas: ''
      })
      
      // Esconde o formulário
      setFormVisible(false)
    } catch (err) {
      console.error('Erro ao adicionar mão de obra:', err)
      setFormError(err instanceof Error ? err.message : 'Ocorreu um erro ao adicionar a mão de obra')
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este tipo de mão de obra do pedido?')) {
      return
    }
    
    try {
      await fetchApi(`/api/pedidos/mao-de-obra/${id}`, {
        method: 'DELETE'
      })
      
      // Remove o item da lista
      setMaoDeObraPedido(maoDeObraPedido.filter(item => item.id !== id))
    } catch (err) {
      console.error('Erro ao remover mão de obra:', err)
      setError(err instanceof Error ? err.message : 'Ocorreu um erro ao remover a mão de obra')
    }
  }

  const handleEditMaoDeObra = (maoDeObra: MaoDeObraPedido) => {
    setEditingMaoDeObra(maoDeObra)
    setEditFormData({ horas: maoDeObra.horas.toString().replace('.', ',') })
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMaoDeObra) return
    
    setEditSubmitting(true)
    
    try {
      const novasHoras = parseFloat(editFormData.horas.replace(',', '.'))
      
      if (novasHoras <= 0) {
        throw new Error('O número de horas deve ser maior que zero')
      }
      
      await fetchApi<{ data: MaoDeObraPedido }>(`/api/pedidos/mao-de-obra/${editingMaoDeObra.id}`, {
        method: 'PUT',
        body: JSON.stringify({ horas: novasHoras })
      })
      
      // Atualiza a mão de obra na lista
      setMaoDeObraPedido(maoDeObraPedido.map(item => 
        item.id === editingMaoDeObra.id 
          ? { ...item, horas: novasHoras }
          : item
      ))
      
      // Fecha o modal de edição
      setEditingMaoDeObra(null)
      setEditFormData({ horas: '' })
    } catch (err) {
      console.error('Erro ao atualizar mão de obra:', err)
      setError(err instanceof Error ? err.message : 'Ocorreu um erro ao atualizar a mão de obra')
    } finally {
      setEditSubmitting(false)
    }
  }

  const cancelEdit = () => {
    setEditingMaoDeObra(null)
    setEditFormData({ horas: '' })
  }

  // Formata valores monetários para o formato brasileiro
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
  }

  // Formata horas para o formato brasileiro
  const formatHoras = (horas: number) => {
    return horas.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
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
            onClick={() => router.push(`/pedidos/${pedidoId}`)}
            className="mt-3 text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded"
          >
            Voltar ao Pedido
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Mão de Obra
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gerenciar mão de obra para o pedido #{pedidoId.substring(0, 8)}
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
            onClick={() => setFormVisible(!formVisible)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {formVisible ? 'Cancelar' : 'Adicionar Mão de Obra'}
          </button>
        </div>
      </div>

      {/* Formulário de adição de mão de obra */}
      {formVisible && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Adicionar Mão de Obra
            </h2>
          </div>
          
          {formError && (
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
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
                      Erro ao adicionar mão de obra
                    </h3>
                    <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                      <p>{formError}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-4">
                <label htmlFor="mao_de_obra_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tipo de Mão de Obra
                </label>
                <div className="mt-1">
                  <select
                    id="mao_de_obra_id"
                    name="mao_de_obra_id"
                    required
                    value={formData.mao_de_obra_id}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                  >
                    <option value="">Selecione um tipo</option>
                    {maoDeObraDisponivel.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.tipo} - {formatCurrency(item.preco_por_hora)}/hora
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Selecione o tipo de mão de obra necessária para este pedido.
                </p>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="horas" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Horas Necessárias
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="horas"
                    id="horas"
                    required
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                    placeholder="1,0"
                    value={formData.horas.replace('.', ',')}
                    onChange={handleChange}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Número de horas necessárias para este tipo de mão de obra.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setFormVisible(false)}
                className="bg-white dark:bg-gray-800 py-2 px-4 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={formSubmitting}
                className={`ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  formSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {formSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adicionando...
                  </>
                ) : (
                  'Adicionar Mão de Obra'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de mão de obra */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Mão de Obra Associada
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Lista de todos os tipos de mão de obra associados a este pedido.
          </p>
        </div>

        {maoDeObraPedido.length > 0 ? (
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
                    Total
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {maoDeObraPedido.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {item.mao_de_obra.tipo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {formatHoras(item.horas)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {formatCurrency(item.mao_de_obra.preco_por_hora)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(item.mao_de_obra.preco_por_hora * item.horas)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEditMaoDeObra(item)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="row" colSpan={3} className="px-6 py-3 text-left text-sm font-medium text-gray-900 dark:text-white">
                    Custo Total de Mão de Obra
                  </th>
                  <td colSpan={2} className="px-6 py-3 text-left text-sm font-bold text-gray-900 dark:text-white">
                    {formatCurrency(
                      maoDeObraPedido.reduce((total, item) => {
                        return total + (item.mao_de_obra.preco_por_hora * item.horas)
                      }, 0)
                    )}
                  </td>
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
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              Nenhuma mão de obra associada
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Adicione os tipos de mão de obra necessários para este pedido.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setFormVisible(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-5 w-5 mr-2" 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Adicionar Mão de Obra
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          onClick={() => router.push(`/pedidos/${pedidoId}`)}
        >
          Concluído
        </button>
      </div>

      {/* Modal de edição */}
      {editingMaoDeObra && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity"
              onClick={cancelEdit}
              aria-hidden="true"
            ></div>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleEditSubmit}>
                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                        Editar Mão de Obra: {editingMaoDeObra.mao_de_obra.tipo}
                      </h3>
                      <div className="mt-4">
                        <label htmlFor="edit-horas" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          Horas Necessárias
                        </label>
                        <input
                          type="text"
                          id="edit-horas"
                          required
                          value={editFormData.horas}
                          onChange={(e) => setEditFormData({ horas: e.target.value })}
                          className="mt-1 block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="1,0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm ${
                      editSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {editSubmitting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Salvando...
                      </>
                    ) : (
                      'Salvar'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 