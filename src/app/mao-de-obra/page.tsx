'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import api from '@/lib/api'

type MaoDeObra = {
  id: string
  tipo: string
  preco_por_hora: number
  created_at: string
}

export default function MaoDeObraPage() {
  const [maosDeObra, setMaosDeObra] = useState<MaoDeObra[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [maoDeObraParaExcluir, setMaoDeObraParaExcluir] = useState<MaoDeObra | null>(null)
  const [excluindo, setExcluindo] = useState(false)
  const [mensagemFeedback, setMensagemFeedback] = useState<{tipo: 'sucesso' | 'erro', texto: string} | null>(null)

  useEffect(() => {
    const fetchMaosDeObra = async () => {
      setLoading(true)
      try {
        const response = await api.get('/mao-de-obra')
        setMaosDeObra(response.data || [])
      } catch (err) {
        console.error('Erro ao buscar mão de obra:', err)
        setError('Não foi possível carregar os tipos de mão de obra. Tente novamente mais tarde.')
      } finally {
        setLoading(false)
      }
    }

    fetchMaosDeObra()
  }, [])

  // Filtrar mãos de obra com base na busca
  const filteredMaosDeObra = maosDeObra.filter(mao => 
    mao.tipo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Função para abrir o modal de confirmação de exclusão
  const confirmarExclusao = (maoDeObra: MaoDeObra) => {
    console.log('Função confirmarExclusao chamada para mão de obra:', maoDeObra.tipo)
    setMaoDeObraParaExcluir(maoDeObra)
  }

  // Função para fechar o modal de confirmação
  const cancelarExclusao = () => {
    console.log('Função cancelarExclusao chamada')
    setMaoDeObraParaExcluir(null)
  }

  // Função para excluir a mão de obra
  const excluirMaoDeObra = async () => {
    console.log('Função excluirMaoDeObra chamada')
    if (!maoDeObraParaExcluir) {
      console.log('Nenhuma mão de obra para excluir')
      return
    }

    console.log('Iniciando exclusão da mão de obra', maoDeObraParaExcluir.id)
    setExcluindo(true)
    try {
      console.log('Enviando requisição DELETE para', `/api/mao-de-obra/${maoDeObraParaExcluir.id}`)
      await api.delete(`/api/mao-de-obra/${maoDeObraParaExcluir.id}`)
      
      // Atualiza a lista de mãos de obra removendo a mão de obra excluída
      setMaosDeObra(maosDeObra.filter(m => m.id !== maoDeObraParaExcluir.id))
      
      // Mostra mensagem de sucesso
      setMensagemFeedback({
        tipo: 'sucesso',
        texto: `Mão de obra "${maoDeObraParaExcluir.tipo}" excluída com sucesso!`
      })
      
      // Limpa a mensagem após 5 segundos
      setTimeout(() => {
        setMensagemFeedback(null)
      }, 5000)
    } catch (err) {
      console.error('Erro ao excluir mão de obra:', err)
      
      // Mostra mensagem de erro
      setMensagemFeedback({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Erro ao excluir mão de obra'
      })
      
      // Limpa a mensagem após 5 segundos
      setTimeout(() => {
        setMensagemFeedback(null)
      }, 5000)
    } finally {
      setExcluindo(false)
      setMaoDeObraParaExcluir(null)
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
    <div className="space-y-6" suppressHydrationWarning>
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
            Mão de Obra
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gerencie os tipos de mão de obra e seus custos por hora
          </p>
        </div>
        <Link
          href="/mao-de-obra/nova"
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
          Nova Mão de Obra
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden" suppressHydrationWarning>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg 
                className="h-5 w-5 text-gray-400" 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 20 20" 
                fill="currentColor" 
                aria-hidden="true"
              >
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Buscar por tipo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {filteredMaosDeObra.length > 0 ? (
          <div className="overflow-x-auto" suppressHydrationWarning>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Preço por Hora
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredMaosDeObra.map((mao) => (
                  <tr key={mao.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {mao.tipo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(mao.preco_por_hora)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/mao-de-obra/${mao.id}/editar`}
                        className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 mr-4"
                      >
                        Editar
                      </Link>
                      <button
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        onClick={() => confirmarExclusao(mao)}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12" suppressHydrationWarning>
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
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nenhum tipo de mão de obra encontrado</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm
                ? 'Tente ajustar os termos de busca.'
                : 'Comece cadastrando seu primeiro tipo de mão de obra.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <Link
                  href="/mao-de-obra/nova"
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
                  Nova Mão de Obra
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de confirmação de exclusão */}
      {maoDeObraParaExcluir && (
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
                      Excluir mão de obra
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Tem certeza que deseja excluir o tipo de mão de obra &quot;{maoDeObraParaExcluir.tipo}&quot;? Esta ação não pode ser desfeita.
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
                  onClick={excluirMaoDeObra}
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