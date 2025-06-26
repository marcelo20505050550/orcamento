'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { fetchApi } from '@/lib/api'
import { ItemExtraPedido } from '@/types'

export default function ItensExtrasPage({ params }: { params: Promise<{ id: string }> }) {
  const pedidoId = use(params).id
  const [itensExtras, setItensExtras] = useState<ItemExtraPedido[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formVisible, setFormVisible] = useState(false)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    valor: ''
  })

  // Estados para edição
  const [editingItem, setEditingItem] = useState<ItemExtraPedido | null>(null)
  const [editFormData, setEditFormData] = useState({
    nome: '',
    descricao: '',
    valor: ''
  })
  const [editSubmitting, setEditSubmitting] = useState(false)

  // Estados para exclusão
  const [itemToDelete, setItemToDelete] = useState<ItemExtraPedido | null>(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)

  useEffect(() => {
    const fetchItensExtras = async () => {
      setLoading(true)
      try {
        const data = await fetchApi<{ data: ItemExtraPedido[] }>(`/api/pedidos/${pedidoId}/itens-extras`)
        setItensExtras(data.data)
      } catch (err) {
        console.error('Erro ao buscar itens extras:', err)
        setError(err instanceof Error ? err.message : 'Erro ao carregar itens extras')
      } finally {
        setLoading(false)
      }
    }

    if (pedidoId) {
      fetchItensExtras()
    }
  }, [pedidoId])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    if (name === 'valor') {
      // Permite números, vírgula e ponto para decimais
      // Remove caracteres inválidos mas mantém vírgula e ponto
      const cleanValue = value.replace(/[^\d,\.]/g, '')
      // Garante apenas uma vírgula ou ponto
      const parts = cleanValue.split(/[,\.]/)
      let formattedValue = parts[0]
      if (parts.length > 1) {
        formattedValue += ',' + parts.slice(1).join('').slice(0, 2) // Máximo 2 casas decimais
      }
      
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

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    if (name === 'valor') {
      // Permite números, vírgula e ponto para decimais
      // Remove caracteres inválidos mas mantém vírgula e ponto
      const cleanValue = value.replace(/[^\d,\.]/g, '')
      // Garante apenas uma vírgula ou ponto
      const parts = cleanValue.split(/[,\.]/)
      let formattedValue = parts[0]
      if (parts.length > 1) {
        formattedValue += ',' + parts.slice(1).join('').slice(0, 2) // Máximo 2 casas decimais
      }
      
      setEditFormData({
        ...editFormData,
        [name]: formattedValue
      })
    } else {
      setEditFormData({
        ...editFormData,
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
      if (!formData.nome.trim()) {
        throw new Error('Nome é obrigatório')
      }

      // Converte vírgula para ponto antes da validação
      const valorNumerico = parseFloat(formData.valor.replace(',', '.'))
      if (!formData.valor || isNaN(valorNumerico) || valorNumerico <= 0) {
        throw new Error('Valor deve ser maior que zero')
      }

      // Formata os dados para envio
      const itemExtraData = {
        nome: formData.nome.trim(),
        descricao: formData.descricao.trim() || undefined,
        valor: valorNumerico
      }

      // Envia os dados para a API
      const data = await fetchApi<{ data: ItemExtraPedido }>(`/api/pedidos/${pedidoId}/itens-extras`, {
        method: 'POST',
        body: JSON.stringify(itemExtraData)
      })
      
      // Adiciona o novo item à lista
      setItensExtras([...itensExtras, data.data])
      
      // Limpa o formulário
      setFormData({
        nome: '',
        descricao: '',
        valor: ''
      })
      
      // Esconde o formulário
      setFormVisible(false)
    } catch (err) {
      console.error('Erro ao adicionar item extra:', err)
      setFormError(err instanceof Error ? err.message : 'Ocorreu um erro ao adicionar o item extra')
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleEditItem = (item: ItemExtraPedido) => {
    setEditingItem(item)
    setEditFormData({
      nome: item.nome,
      descricao: item.descricao || '',
      valor: item.valor.toString().replace('.', ',')
    })
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return

    setEditSubmitting(true)

    try {
      // Validações básicas
      if (!editFormData.nome.trim()) {
        throw new Error('Nome é obrigatório')
      }

      // Converte vírgula para ponto antes da validação
      const valorNumerico = parseFloat(editFormData.valor.replace(',', '.'))
      if (!editFormData.valor || isNaN(valorNumerico) || valorNumerico <= 0) {
        throw new Error('Valor deve ser maior que zero')
      }

      // Formata os dados para envio
      const itemExtraData = {
        nome: editFormData.nome.trim(),
        descricao: editFormData.descricao.trim() || undefined,
        valor: valorNumerico
      }

      // Envia os dados para a API
      const data = await fetchApi<{ data: ItemExtraPedido }>(`/api/pedidos/itens-extras/${editingItem.id}`, {
        method: 'PUT',
        body: JSON.stringify(itemExtraData)
      })
      
      // Atualiza o item na lista
      setItensExtras(itensExtras.map(item => 
        item.id === editingItem.id ? data.data : item
      ))
      
      // Fecha o modal de edição
      setEditingItem(null)
    } catch (err) {
      console.error('Erro ao editar item extra:', err)
      setFormError(err instanceof Error ? err.message : 'Ocorreu um erro ao editar o item extra')
    } finally {
      setEditSubmitting(false)
    }
  }

  const cancelEdit = () => {
    setEditingItem(null)
    setEditFormData({
      nome: '',
      descricao: '',
      valor: ''
    })
  }

  const handleDeleteItem = (item: ItemExtraPedido) => {
    setItemToDelete(item)
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return

    setDeleteSubmitting(true)

    try {
      await fetchApi(`/api/pedidos/itens-extras/${itemToDelete.id}`, {
        method: 'DELETE'
      })
      
      // Remove o item da lista
      setItensExtras(itensExtras.filter(item => item.id !== itemToDelete.id))
      setItemToDelete(null)
    } catch (err) {
      console.error('Erro ao excluir item extra:', err)
      setError(err instanceof Error ? err.message : 'Ocorreu um erro ao excluir o item extra')
    } finally {
      setDeleteSubmitting(false)
    }
  }

  const cancelDelete = () => {
    setItemToDelete(null)
  }

  // Formata valores monetários para o formato brasileiro
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value)
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

  if (loading) {
    return (
      <div className="p-4 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6" suppressHydrationWarning>
      {/* Cabeçalho */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Itens Extras do Pedido</h1>
          <p className="text-gray-600 dark:text-gray-400">Gerencie os itens extras deste pedido</p>
        </div>
        <div className="flex space-x-3">
          <Link
            href={`/pedidos/${pedidoId}`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            ← Voltar ao Pedido
          </Link>
          <button
            onClick={() => setFormVisible(!formVisible)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {formVisible ? 'Cancelar' : '+ Adicionar Item Extra'}
          </button>
        </div>
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-md">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Formulário de adicionar item extra */}
      {formVisible && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
              Adicionar Novo Item Extra
            </h3>
            
            {formError && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/30 p-4 rounded-md">
                <p className="text-red-800 dark:text-red-200">{formError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-4">
                  <label htmlFor="nome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nome do Item
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="nome"
                      id="nome"
                      required
                      value={formData.nome}
                      onChange={handleChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                      placeholder="Ex: Taxa de urgência, Material especial, etc."
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="valor" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Valor (R$)
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="valor"
                      id="valor"
                      required
                      value={formData.valor}
                      onChange={handleChange}
                      inputMode="decimal"
                      pattern="[0-9]+([,\.][0-9]{1,2})?"
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <div className="sm:col-span-6">
                  <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Descrição (opcional)
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="descricao"
                      name="descricao"
                      rows={3}
                      value={formData.descricao}
                      onChange={handleChange}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                      placeholder="Descrição detalhada do item extra"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setFormVisible(false)}
                  className="bg-white dark:bg-gray-800 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {formSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Adicionando...
                    </>
                  ) : (
                    'Adicionar Item Extra'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de itens extras */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
            Itens Extras ({itensExtras.length})
          </h3>
          
          {itensExtras.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">Nenhum item extra adicionado ainda.</p>
              {!formVisible && (
                <button
                  onClick={() => setFormVisible(true)}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  + Adicionar Primeiro Item Extra
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Data de Criação
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {itensExtras.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {item.nome}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {item.descricao || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatCurrency(item.valor)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {formatDate(item.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEditItem(item)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal de edição */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[9999]" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                Editar Item Extra
              </h3>
              
              <form onSubmit={handleEditSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-4">
                    <label htmlFor="edit-nome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Nome do Item
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="nome"
                        id="edit-nome"
                        required
                        value={editFormData.nome}
                        onChange={handleEditChange}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="edit-valor" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Valor (R$)
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        name="valor"
                        id="edit-valor"
                        required
                        value={editFormData.valor}
                        onChange={handleEditChange}
                        inputMode="decimal"
                        pattern="[0-9]+([,\.][0-9]{1,2})?"
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-6">
                    <label htmlFor="edit-descricao" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Descrição (opcional)
                    </label>
                    <div className="mt-1">
                      <textarea
                        id="edit-descricao"
                        name="descricao"
                        rows={3}
                        value={editFormData.descricao}
                        onChange={handleEditChange}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="bg-white dark:bg-gray-800 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {editSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                        Salvando...
                      </>
                    ) : (
                      'Salvar Alterações'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[9999]" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white mb-4">
                Confirmar Exclusão
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Tem certeza de que deseja excluir o item extra "{itemToDelete.nome}"? Esta ação não pode ser desfeita.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={cancelDelete}
                  disabled={deleteSubmitting}
                  className="bg-white dark:bg-gray-800 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleteSubmitting}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Excluindo...
                    </>
                  ) : (
                    'Sim, Excluir'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 