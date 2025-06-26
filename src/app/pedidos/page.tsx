'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import api from '@/lib/api'

type Pedido = {
  id: string
  produto: {
    id: string
    nome: string
  }
  quantidade: number
  status: 'pendente' | 'em_producao' | 'finalizado' | 'cancelado'
  observacoes: string
  created_at: string
}

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [pedidoParaExcluir, setPedidoParaExcluir] = useState<Pedido | null>(null)
  const [excluindo, setExcluindo] = useState(false)
  const [mensagemFeedback, setMensagemFeedback] = useState<{tipo: 'sucesso' | 'erro', texto: string} | null>(null)

  useEffect(() => {
    const fetchPedidos = async () => {
      setLoading(true)
      try {
        const response = await api.get('/pedidos')
        setPedidos(response.data || [])
      } catch (err) {
        console.error('Erro ao buscar pedidos:', err)
        setError('Não foi possível carregar os pedidos. Tente novamente mais tarde.')
      } finally {
        setLoading(false)
      }
    }

    fetchPedidos()
  }, [])

  // Filtrar pedidos com base no status
  const filteredPedidos = statusFilter
    ? pedidos.filter(pedido => pedido.status === statusFilter)
    : pedidos

  // Função para abrir o modal de confirmação de exclusão
  const confirmarExclusao = (pedido: Pedido) => {
    console.log('Função confirmarExclusao chamada para pedido:', pedido.id)
    setPedidoParaExcluir(pedido)
  }

  // Função para fechar o modal de confirmação
  const cancelarExclusao = () => {
    console.log('Função cancelarExclusao chamada')
    setPedidoParaExcluir(null)
  }

  // Função para excluir o pedido
  const excluirPedido = async () => {
    console.log('Função excluirPedido chamada')
    if (!pedidoParaExcluir) {
      console.log('Nenhum pedido para excluir')
      return
    }

    // Verificar se o pedido pode ser excluído (apenas "pendente" ou "cancelado")
    if (pedidoParaExcluir.status !== 'pendente' && pedidoParaExcluir.status !== 'cancelado') {
      console.log('Pedido não pode ser excluído devido ao status:', pedidoParaExcluir.status)
      setMensagemFeedback({
        tipo: 'erro',
        texto: 'Apenas pedidos com status "Pendente" ou "Cancelado" podem ser excluídos.'
      })
      setPedidoParaExcluir(null)
      
      // Limpa a mensagem após 5 segundos
      setTimeout(() => {
        setMensagemFeedback(null)
      }, 5000)
      
      return
    }

    console.log('Iniciando exclusão do pedido', pedidoParaExcluir.id)
    setExcluindo(true)
    try {
      console.log('Enviando requisição DELETE para', `/api/pedidos/${pedidoParaExcluir.id}`)
      await api.delete(`/api/pedidos/${pedidoParaExcluir.id}`)
      
      // Atualiza a lista de pedidos removendo o pedido excluído
      setPedidos(pedidos.filter(p => p.id !== pedidoParaExcluir.id))
      
      // Mostra mensagem de sucesso
      setMensagemFeedback({
        tipo: 'sucesso',
        texto: `Pedido #${pedidoParaExcluir.id.substring(0, 8)} excluído com sucesso!`
      })
      
      // Limpa a mensagem após 5 segundos
      setTimeout(() => {
        setMensagemFeedback(null)
      }, 5000)
    } catch (err) {
      console.error('Erro ao excluir pedido:', err)
      
      // Mostra mensagem de erro
      setMensagemFeedback({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Erro ao excluir pedido'
      })
      
      // Limpa a mensagem após 5 segundos
      setTimeout(() => {
        setMensagemFeedback(null)
      }, 5000)
    } finally {
      setExcluindo(false)
      setPedidoParaExcluir(null)
    }
  }

  // Helper para informações de status
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pendente':
        return {
          text: 'Pendente',
          className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200',
        }
      case 'em_producao':
        return {
          text: 'Em Produção',
          className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200',
        }
      case 'finalizado':
        return {
          text: 'Finalizado',
          className: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200',
        }
      case 'cancelado':
        return {
          text: 'Cancelado',
          className: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200',
        }
      default:
        return {
          text: 'Desconhecido',
          className: 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200',
        }
    }
  }

  // Helper para formatar datas
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date)
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
            onClick={() => window.location.reload()}
            className="mt-3 text-sm text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Feedback de sucesso ou erro */}
      {mensagemFeedback && (
        <div className={`p-4 rounded-md ${
          mensagemFeedback.tipo === 'sucesso' 
            ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200' 
            : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {mensagemFeedback.tipo === 'sucesso' ? (
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{mensagemFeedback.texto}</p>
            </div>
            <div className="ml-auto pl-3">
              <div className="-mx-1.5 -my-1.5">
                <button
                  onClick={() => setMensagemFeedback(null)}
                  className={`inline-flex rounded-md p-1.5 ${
                    mensagemFeedback.tipo === 'sucesso'
                      ? 'text-green-500 hover:bg-green-100 dark:hover:bg-green-800'
                      : 'text-red-500 hover:bg-red-100 dark:hover:bg-red-800'
                  }`}
                >
                  <span className="sr-only">Fechar</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Pedidos
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gerencie todos os seus pedidos de fabricação
          </p>
        </div>
        <Link
          href="/pedidos/novo"
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5 mr-2" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Novo Pedido
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setStatusFilter(null)}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                statusFilter === null
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('pendente')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                statusFilter === 'pendente'
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-200'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Pendentes
            </button>
            <button
              onClick={() => setStatusFilter('em_producao')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                statusFilter === 'em_producao'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Em Produção
            </button>
            <button
              onClick={() => setStatusFilter('finalizado')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                statusFilter === 'finalizado'
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-200'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Finalizados
            </button>
            <button
              onClick={() => setStatusFilter('cancelado')}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                statusFilter === 'cancelado'
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Cancelados
            </button>
          </div>
        </div>

        {filteredPedidos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Código
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Produto
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Quantidade
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Data
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredPedidos.map((pedido) => {
                  const statusInfo = getStatusInfo(pedido.status)
                  const podeExcluir = pedido.status === 'pendente' || pedido.status === 'cancelado'
                  
                  return (
                    <tr key={pedido.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {pedido.id.substring(0, 8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {pedido.produto.nome}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {pedido.quantidade}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo.className}`}>
                          {statusInfo.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                        {formatDate(pedido.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/pedidos/${pedido.id}`}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                        >
                          Detalhes
                        </Link>
                        <Link
                          href={`/orcamentos?pedido=${pedido.id}`}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 mr-4"
                        >
                          Orçamento
                        </Link>
                        {podeExcluir && (
                          <button
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            onClick={() => confirmarExclusao(pedido)}
                          >
                            Excluir
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
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
                d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              Nenhum pedido encontrado
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {statusFilter
                ? 'Não há pedidos com este status. Tente outro filtro.'
                : 'Comece criando seu primeiro pedido.'}
            </p>
            {!statusFilter && (
              <div className="mt-6">
                <Link
                  href="/pedidos/novo"
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
                  Novo Pedido
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de confirmação de exclusão */}
      {pedidoParaExcluir && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          {/* Backdrop */}
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity"
              onClick={cancelarExclusao}
              aria-hidden="true"
            ></div>

            {/* This element is to trick the browser into centering the modal contents. */}
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

            {/* Modal panel */}
            <div className="relative inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600 dark:text-red-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                      Excluir pedido
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Tem certeza que deseja excluir o pedido #{pedidoParaExcluir.id.substring(0, 8)} de {pedidoParaExcluir.produto.nome}? Esta ação não pode ser desfeita.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm ${
                    excluindo 
                      ? 'bg-red-400 cursor-not-allowed' 
                      : 'bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                  }`}
                  onClick={excluirPedido}
                  disabled={excluindo}
                >
                  {excluindo ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Excluindo...
                    </>
                  ) : (
                    'Excluir'
                  )}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:mr-3 sm:w-auto sm:text-sm"
                  onClick={cancelarExclusao}
                  disabled={excluindo}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 