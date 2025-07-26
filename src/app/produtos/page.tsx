'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'

interface ProdutoHierarquia {
  id: string
  nome: string
  codigo_produto?: string
  descricao: string
  preco_unitario?: number
  quantidade_necessaria?: number
  e_materia_prima: boolean
  tipo_produto: 'simples' | 'calculo'
  created_at: string
  updated_at: string
  nivel: number
  dependencias: ProdutoHierarquia[]
  expanded?: boolean
}

export default function ProdutosPage() {
  const router = useRouter()
  const [produtos, setProdutos] = useState<ProdutoHierarquia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [produtoParaExcluir, setProdutoParaExcluir] = useState<ProdutoHierarquia | null>(null)
  const [excluindo, setExcluindo] = useState(false)
  const [mensagemFeedback, setMensagemFeedback] = useState<{ tipo: 'sucesso' | 'erro', texto: string } | null>(null)

  // Carregar apenas produtos principais (que não são componentes de outros)
  useEffect(() => {
    const fetchProdutos = async () => {
      setLoading(true)
      try {
        // Buscar todos os produtos
        const todosResponse = await api.get('/api/produtos?pageSize=1000')
        const todosProdutos = todosResponse.data?.data || todosResponse.data || []
        
        // Buscar todas as dependências para identificar quais produtos são componentes
        const dependenciasResponse = await api.get('/api/dependencias-produtos')
        const dependencias = dependenciasResponse.data?.data || dependenciasResponse.data || []
        
        // IDs dos produtos que são componentes (filhos) de outros produtos
        const idsComponentes = new Set(dependencias.map((dep: any) => dep.produto_filho_id))
        
        // Filtrar apenas produtos principais (que não são componentes)
        const produtosPrincipais = todosProdutos.filter((produto: any) => !idsComponentes.has(produto.id))
        
        // Inicializar produtos com estado de expansão
        const produtosComEstado = produtosPrincipais.map((produto: any) => ({
          ...produto,
          nivel: 0,
          dependencias: [],
          expanded: false
        }))
        
        setProdutos(produtosComEstado)
        

      } catch (err) {
        console.error('Erro ao buscar produtos:', err)
        setError('Não foi possível carregar os produtos. Tente novamente mais tarde.')
      } finally {
        setLoading(false)
      }
    }

    fetchProdutos()
  }, [])

  // Função recursiva para atualizar produtos na árvore
  const atualizarProdutoRecursivo = (produtos: ProdutoHierarquia[], produtoId: string, updates: Partial<ProdutoHierarquia>): ProdutoHierarquia[] => {
    return produtos.map(produto => {
      if (produto.id === produtoId) {
        return { ...produto, ...updates }
      }
      if (produto.dependencias && produto.dependencias.length > 0) {
        return {
          ...produto,
          dependencias: atualizarProdutoRecursivo(produto.dependencias, produtoId, updates)
        }
      }
      return produto
    })
  }

  // Função para expandir/colapsar produto e carregar dependências
  const toggleExpansao = async (produtoId: string) => {
    // Encontrar o produto na árvore (pode estar em qualquer nível)
    const encontrarProduto = (produtos: ProdutoHierarquia[]): ProdutoHierarquia | null => {
      for (const produto of produtos) {
        if (produto.id === produtoId) return produto
        if (produto.dependencias) {
          const encontrado = encontrarProduto(produto.dependencias)
          if (encontrado) return encontrado
        }
      }
      return null
    }

    const produto = encontrarProduto(produtos)
    if (!produto) return

    if (produto.expanded) {
      // Colapsar
      setProdutos(prevProdutos => 
        atualizarProdutoRecursivo(prevProdutos, produtoId, { expanded: false })
      )
    } else {
      // Expandir - carregar dependências
      try {
        const response = await api.get(`/api/produtos/${produtoId}/arvore-dependencias`)
        
        // O response já contém os dados diretamente, não em .data
        const responseData = response.data || response
        const arvore = responseData?.dependencias || []
        
        // Converter dependências para o formato hierárquico
        const dependenciasHierarquicas = arvore.map((dep: any) => {
          return {
            id: dep.id,
            nome: dep.nome,
            descricao: '',
            preco_unitario: dep.preco_unitario,
            quantidade_estoque: 0,
            e_materia_prima: dep.e_materia_prima,
            created_at: '',
            updated_at: '',
            nivel: dep.nivel,
            quantidade_necessaria: dep.quantidade_necessaria,
            dependencias: dep.dependencias || [],
            expanded: false
          }
        })
        
        setProdutos(prevProdutos => {
          const novoProdutos = atualizarProdutoRecursivo(prevProdutos, produtoId, { 
            expanded: true, 
            dependencias: dependenciasHierarquicas 
          })
          

          
          return novoProdutos
        })
      } catch (err) {
        console.error('Erro ao carregar dependências:', err)
        setMensagemFeedback({
          tipo: 'erro',
          texto: 'Erro ao carregar dependências do produto'
        })
      }
    }
  }

  // Função para confirmar exclusão
  const confirmarExclusao = (produto: ProdutoHierarquia) => {
    setProdutoParaExcluir(produto)
  }

  // Função para cancelar exclusão
  const cancelarExclusao = () => {
    setProdutoParaExcluir(null)
  }

  // Função para excluir o produto
  const excluirProduto = async () => {
    if (!produtoParaExcluir) return

    setExcluindo(true)
    try {
      await api.delete(`/api/produtos/${produtoParaExcluir.id}`)

      // Recarregar produtos após exclusão
      const todosResponse = await api.get('/api/produtos?pageSize=1000')
      const todosProdutos = todosResponse.data?.data || todosResponse.data || []
      
      const dependenciasResponse = await api.get('/api/dependencias-produtos')
      const dependencias = dependenciasResponse.data?.data || dependenciasResponse.data || []
      
      const idsComponentes = new Set(dependencias.map((dep: any) => dep.produto_filho_id))
      const produtosPrincipais = todosProdutos.filter((produto: any) => !idsComponentes.has(produto.id))
      
      const produtosComEstado = produtosPrincipais.map((produto: any) => ({
        ...produto,
        nivel: 0,
        dependencias: [],
        expanded: false
      }))
      
      setProdutos(produtosComEstado)

      setMensagemFeedback({
        tipo: 'sucesso',
        texto: `Produto "${produtoParaExcluir.nome}" excluído com sucesso!`
      })

      setTimeout(() => {
        setMensagemFeedback(null)
      }, 5000)
    } catch (err) {
      console.error('Erro ao excluir produto:', err)
      setMensagemFeedback({
        tipo: 'erro',
        texto: err instanceof Error ? err.message : 'Erro ao excluir produto'
      })

      setTimeout(() => {
        setMensagemFeedback(null)
      }, 5000)
    } finally {
      setExcluindo(false)
      setProdutoParaExcluir(null)
    }
  }





  // Renderizar produtos recursivamente
  const renderProduto = (produto: ProdutoHierarquia, nivel: number = 0): React.ReactNode => {
    const temDependencias = produto.dependencias && produto.dependencias.length > 0
    
    return (
      <div key={produto.id}>
        <div 
          className="flex items-center justify-between py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-md px-2"
          style={{ paddingLeft: `${nivel * 20}px` }}
        >
          <div className="flex items-center space-x-3">
            {/* Botão de expansão - só mostra se tem dependências ou se é nível 0 */}
            <div className="w-6 h-6 flex items-center justify-center">
              {nivel === 0 || temDependencias ? (
                <button
                  onClick={() => toggleExpansao(produto.id)}
                  className="flex-shrink-0 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {produto.expanded ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              ) : (
                <span className="text-gray-300 dark:text-gray-600">•</span>
              )}
            </div>

            {/* Informações do produto */}
            <div className="flex items-center space-x-3">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                produto.e_materia_prima
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
              }`}>
                {produto.e_materia_prima ? 'MP' : 'P'}
              </span>
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  {produto.nome}
                  {produto.quantidade_necessaria && (
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                      (Qtd: {produto.quantidade_necessaria})
                    </span>
                  )}
                </h3>
                {produto.descricao && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {produto.descricao}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <button
                onClick={() => router.push(`/produtos/${produto.id}`)}
                className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                title="Ver detalhes"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
              <button
                onClick={() => router.push(`/produtos/${produto.id}/editar`)}
                className="p-1 text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400"
                title="Editar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => confirmarExclusao(produto)}
                className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                title="Excluir"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Dependências expandidas */}
        {produto.expanded && temDependencias && (
          <div>
            {produto.dependencias.map(dep => renderProduto(dep, nivel + 1))}
          </div>
        )}
      </div>
    )
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
        <div className={`p-4 rounded-md ${mensagemFeedback.tipo === 'sucesso'
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
                  className={`inline-flex rounded-md p-1.5 ${mensagemFeedback.tipo === 'sucesso'
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
            Produtos
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Visualização hierárquica - produtos principais e seus componentes/matérias-primas
          </p>
        </div>
        <Link
          href="/produtos/novo"
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
          Novo Produto
        </Link>
      </div>

      {/* Lista de produtos em árvore hierárquica */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        {produtos.length > 0 ? (
          <div className="p-4">
            {produtos.map(produto => renderProduto(produto))}
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
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nenhum produto encontrado</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Comece adicionando um novo produto
            </p>
            <div className="mt-6">
              <Link
                href="/produtos/novo"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Novo Produto
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Modal de confirmação de exclusão */}
      {produtoParaExcluir && (
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
                      Excluir produto
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Tem certeza que deseja excluir o produto &quot;{produtoParaExcluir.nome}&quot;? Esta ação não pode ser desfeita.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm ${excluindo
                    ? 'bg-red-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500'
                    }`}
                  onClick={excluirProduto}
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