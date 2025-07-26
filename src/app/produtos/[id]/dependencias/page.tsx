'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'

// Componente para calcular e exibir o custo total de um produto
function CustoTotalProduto({ produtoId, quantidade, precoUnitario }: {
  produtoId: string,
  quantidade: number,
  precoUnitario?: number
}) {
  const [custoTotal, setCustoTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCustoTotal = async () => {
      try {
        console.log(`Buscando custo total para produto ${produtoId}`)
        const response = await api.get(`/api/produtos/${produtoId}/custo-total`)
        const custoUnitario = response.custo_total || 0
        const custoTotalCalculado = custoUnitario * quantidade

        console.log(`Produto ${produtoId}: custo unitário = ${custoUnitario}, quantidade = ${quantidade}, custo total = ${custoTotalCalculado}`)
        setCustoTotal(custoTotalCalculado)
      } catch (error) {
        console.error(`Erro ao buscar custo total do produto ${produtoId}:`, error)
        // Fallback para o cálculo simples se a API falhar
        if (precoUnitario) {
          setCustoTotal(precoUnitario * quantidade)
        } else {
          setCustoTotal(0)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchCustoTotal()
  }, [produtoId, quantidade, precoUnitario])

  if (loading) {
    return <span className="text-gray-400">Calculando...</span>
  }

  if (custoTotal === null || custoTotal === 0) {
    return <span className="text-gray-400">N/D</span>
  }

  return <span>R$ {custoTotal.toFixed(2)}</span>
}

type Produto = {
  id: string
  nome: string
  e_materia_prima: boolean
  preco_unitario?: number
}

type Dependencia = {
  id: string
  quantidade_necessaria: number
  created_at: string
  produto_pai: Produto | null
  produto_filho: Produto | null
}

export default function ProdutoDependenciasPage() {
  const params = useParams()
  const router = useRouter()
  const produtoId = params.id as string

  const [produto, setProduto] = useState<Produto | null>(null)
  const [dependencias, setDependencias] = useState<Dependencia[]>([])

  // console.log('Render - Estado atual das dependências:', dependencias)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Estados para adicionar nova dependência
  const [showAddForm, setShowAddForm] = useState(false)
  const [newDependencia, setNewDependencia] = useState({
    produto_filho_id: '',
    quantidade_necessaria: 1
  })
  const [addingDependencia, setAddingDependencia] = useState(false)

  // Estados para exclusão
  const [dependenciaParaExcluir, setDependenciaParaExcluir] = useState<Dependencia | null>(null)
  const [excluindo, setExcluindo] = useState(false)

  // Estados para edição
  const [dependenciaParaEditar, setDependenciaParaEditar] = useState<Dependencia | null>(null)
  const [editandoDependencia, setEditandoDependencia] = useState(false)
  const [dadosEdicao, setDadosEdicao] = useState({
    produto_filho_id: '',
    quantidade_necessaria: 1
  })

  // Estado para feedback
  const [mensagemFeedback, setMensagemFeedback] = useState<{ tipo: 'sucesso' | 'erro', texto: string } | null>(null)

  // Carregar dados iniciais
  useEffect(() => {
    console.log('useEffect executado - produtoId:', produtoId)
    const fetchData = async () => {
      setLoading(true)
      try {
        // Buscar informações do produto
        const produtoResponse = await api.get(`/api/produtos/${produtoId}`)
        setProduto(produtoResponse.data)

        // Buscar dependências do produto
        console.log('Buscando dependências para produto:', produtoId)
        const dependenciasResponse = await api.get(`/api/produtos/${produtoId}/dependencias`)
        console.log('Resposta da API:', dependenciasResponse)
        console.log('Tipo da resposta:', typeof dependenciasResponse)
        console.log('É array?', Array.isArray(dependenciasResponse))

        // O cliente API retorna diretamente o JSON, não encapsula em .data
        let dependenciasCarregadas: Dependencia[] = []

        if (Array.isArray(dependenciasResponse)) {
          // Filtrar dependências válidas (que têm produto_filho)
          dependenciasCarregadas = dependenciasResponse.filter(dep => {
            if (!dep.produto_filho) {
              console.warn('Dependência sem produto_filho encontrada:', dep)
              return false
            }
            return true
          })
          console.log('Dependências carregadas:', dependenciasCarregadas.length)
        } else {
          console.log('Resposta não é um array:', dependenciasResponse)
        }

        console.log('Definindo dependências no estado:', dependenciasCarregadas.length, 'itens')
        setDependencias(dependenciasCarregadas)

        // Buscar todos os produtos para o formulário de adição
        const produtosResponse = await api.get('/api/produtos?pageSize=1000')
        console.log('Resposta da API de produtos:', produtosResponse)

        // Tentar diferentes estruturas de resposta
        let produtosCarregados: Produto[] = []
        if (produtosResponse.data?.data) {
          // Estrutura: { data: { data: [...], pagination: {...} } }
          produtosCarregados = produtosResponse.data.data
        } else if (produtosResponse.data && Array.isArray(produtosResponse.data)) {
          // Estrutura: { data: [...] }
          produtosCarregados = produtosResponse.data
        } else if (produtosResponse.data) {
          // Estrutura: { data: {...} } - objeto único
          produtosCarregados = [produtosResponse.data]
        }

        console.log('Produtos carregados:', produtosCarregados.length)
        setProdutos(produtosCarregados)

        console.log('Estado final - Dependências:', dependencias.length)
        console.log('Estado final - Produtos:', produtosCarregados.length)
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

  // Monitorar mudanças no estado das dependências
  useEffect(() => {
    console.log('Estado das dependências atualizado:', dependencias.length, 'itens')
  }, [dependencias])

  // Filtrar dependências com base na busca
  const filteredDependencias = (dependencias || []).filter(dependencia => {
    // Verificar se a dependência e produto_filho existem
    if (!dependencia || !dependencia.produto_filho?.nome) {
      console.warn('Dependência com produto_filho inválido:', dependencia)
      return false
    }
    return dependencia.produto_filho.nome.toLowerCase().includes(searchTerm.toLowerCase())
  })

  // console.log('Renderização - Dependências totais:', dependencias.length)
  // console.log('Renderização - Dependências filtradas:', filteredDependencias.length)
  // console.log('Renderização - Search term:', searchTerm)

  // Filtrar produtos disponíveis (excluir o próprio produto e produtos já dependentes)
  // Agora permite adicionar qualquer produto como dependência, não apenas matérias-primas
  const produtosDisponiveis = (produtos || []).filter(p =>
    p.id !== produtoId &&
    !(dependencias || []).some(d => {
      // Verificar se a dependência tem produto_filho válido
      if (!d || !d.produto_filho?.id) return false
      return d.produto_filho.id === p.id
    })
  )

  // Filtrar produtos disponíveis para edição (excluir o próprio produto e produtos já dependentes, exceto o atual)
  const produtosDisponiveisEdicao = (produtos || []).filter(p =>
    p.id !== produtoId &&
    !(dependencias || []).some(d => {
      // Verificar se a dependência tem produto_filho válido
      if (!d || !d.produto_filho?.id) return false
      // Verificar se é o mesmo produto e não é a dependência sendo editada
      return d.produto_filho.id === p.id && d.id !== dependenciaParaEditar?.id
    })
  )

  // Função para adicionar nova dependência
  const adicionarDependencia = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newDependencia.produto_filho_id || newDependencia.quantidade_necessaria <= 0) {
      setMensagemFeedback({
        tipo: 'erro',
        texto: 'Preencha todos os campos corretamente'
      })
      return
    }

    setAddingDependencia(true)
    try {
      // Primeiro, verificar se a dependência criaria um ciclo circular
      const cicloCheck = await api.post(`/api/produtos/${produtoId}/dependencias/circular-check`, {
        produto_filho_id: newDependencia.produto_filho_id
      })

      if (cicloCheck.temCiclo) {
        setMensagemFeedback({
          tipo: 'erro',
          texto: 'Esta dependência criaria um ciclo circular. Exemplo: se A depende de B, B não pode depender de A (direta ou indiretamente).'
        })
        return
      }

      // Se não há ciclo, adicionar a dependência
      const response = await api.post(`/api/produtos/${produtoId}/dependencias`, newDependencia)

      // Atualizar lista de dependências
      setDependencias([response.data, ...dependencias])

      // Resetar formulário
      setNewDependencia({
        produto_filho_id: '',
        quantidade_necessaria: 1
      })
      setShowAddForm(false)

      setMensagemFeedback({
        tipo: 'sucesso',
        texto: 'Dependência adicionada com sucesso!'
      })
    } catch (err: any) {
      console.error('Erro ao adicionar dependência:', err)
      setMensagemFeedback({
        tipo: 'erro',
        texto: err.response?.data?.error || 'Erro ao adicionar dependência'
      })
    } finally {
      setAddingDependencia(false)
    }
  }

  // Função para iniciar edição
  const iniciarEdicao = (dependencia: Dependencia) => {
    if (!dependencia.produto_filho?.id) {
      console.error('Tentativa de editar dependência sem produto_filho:', dependencia)
      setMensagemFeedback({
        tipo: 'erro',
        texto: 'Erro: dados da dependência estão incompletos'
      })
      return
    }

    setDependenciaParaEditar(dependencia)
    setDadosEdicao({
      produto_filho_id: dependencia.produto_filho.id,
      quantidade_necessaria: dependencia.quantidade_necessaria
    })
  }

  // Função para cancelar edição
  const cancelarEdicao = () => {
    setDependenciaParaEditar(null)
    setDadosEdicao({
      produto_filho_id: '',
      quantidade_necessaria: 1
    })
  }

  // Função para salvar edição
  const salvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!dependenciaParaEditar || !dadosEdicao.produto_filho_id || dadosEdicao.quantidade_necessaria <= 0) {
      setMensagemFeedback({
        tipo: 'erro',
        texto: 'Preencha todos os campos corretamente'
      })
      return
    }

    setEditandoDependencia(true)
    try {
      const response = await api.put(`/api/produtos/dependencias/${dependenciaParaEditar.id}`, dadosEdicao)

      // Atualizar lista de dependências
      setDependencias(dependencias.map(d =>
        d.id === dependenciaParaEditar.id ? response.data.data : d
      ))

      setMensagemFeedback({
        tipo: 'sucesso',
        texto: 'Dependência atualizada com sucesso!'
      })

      cancelarEdicao()
    } catch (err: any) {
      console.error('Erro ao atualizar dependência:', err)
      setMensagemFeedback({
        tipo: 'erro',
        texto: err.response?.data?.error || 'Erro ao atualizar dependência'
      })
    } finally {
      setEditandoDependencia(false)
    }
  }

  // Função para confirmar exclusão
  const confirmarExclusao = (dependencia: Dependencia) => {
    setDependenciaParaExcluir(dependencia)
  }

  // Função para cancelar exclusão
  const cancelarExclusao = () => {
    setDependenciaParaExcluir(null)
  }

  // Função para excluir dependência
  const excluirDependencia = async () => {
    if (!dependenciaParaExcluir) return

    setExcluindo(true)
    try {
      await api.delete(`/api/produtos/dependencias/${dependenciaParaExcluir.id}`)

      // Atualizar lista de dependências
      setDependencias(dependencias.filter(d => d.id !== dependenciaParaExcluir.id))

      setMensagemFeedback({
        tipo: 'sucesso',
        texto: `Dependência "${dependenciaParaExcluir.produto_filho?.nome || 'produto'}" removida com sucesso!`
      })
    } catch (err: any) {
      console.error('Erro ao excluir dependência:', err)
      setMensagemFeedback({
        tipo: 'erro',
        texto: err.response?.data?.error || 'Erro ao excluir dependência'
      })
    } finally {
      setExcluindo(false)
      setDependenciaParaExcluir(null)
    }
  }

  // Limpar mensagem de feedback após 5 segundos
  useEffect(() => {
    if (mensagemFeedback) {
      const timer = setTimeout(() => {
        setMensagemFeedback(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [mensagemFeedback])

  if (loading || !produto) {
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
      )}

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
                  <span className="ml-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {produto?.nome}
                  </span>
                </div>
              </li>
              <li>
                <div className="flex items-center">
                  <svg className="flex-shrink-0 h-5 w-5 text-gray-300" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
                  </svg>
                  <span className="ml-4 text-sm font-medium text-gray-900 dark:text-white">
                    Dependências
                  </span>
                </div>
              </li>
            </ol>
          </nav>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Dependências de {produto?.nome}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Gerencie as matérias-primas e componentes necessários para este produto
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddForm(true)}
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
            Adicionar Dependência
          </button>

          <Link
            href="/produtos/novo?e_materia_prima=true"
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            title="Criar uma nova matéria-prima para usar como dependência"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Nova Matéria-prima
          </Link>
        </div>
      </div>

      {/* Formulário para adicionar nova dependência */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Adicionar Nova Dependência
          </h3>
          <form onSubmit={adicionarDependencia} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="produto_filho_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Produto/Matéria-prima <span className="text-red-500">*</span>
                </label>
                <select
                  id="produto_filho_id"
                  value={newDependencia.produto_filho_id}
                  onChange={(e) => setNewDependencia({ ...newDependencia, produto_filho_id: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Selecione um produto</option>
                  {produtosDisponiveis.map((produto) => (
                    <option key={produto.id} value={produto.id}>
                      {produto.nome} {produto.e_materia_prima ? '(Matéria-prima)' : '(Produto)'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="quantidade_necessaria" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Quantidade Necessária <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="quantidade_necessaria"
                  min="0.01"
                  step="0.01"
                  value={newDependencia.quantidade_necessaria}
                  onChange={(e) => setNewDependencia({ ...newDependencia, quantidade_necessaria: parseFloat(e.target.value) || 0 })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false)
                  setNewDependencia({ produto_filho_id: '', quantidade_necessaria: 1 })
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={addingDependencia}
                className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${addingDependencia
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                  }`}
              >
                {addingDependencia ? 'Adicionando...' : 'Adicionar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de dependências */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
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
              placeholder="Buscar dependências..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>



        {filteredDependencias.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Produto/Matéria-prima
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Quantidade
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
                {filteredDependencias.map((dependencia) => (
                  <tr key={dependencia.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {dependencia.produto_filho?.nome || 'Produto não encontrado'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${dependencia.produto_filho?.e_materia_prima
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                        }`}>
                        {dependencia.produto_filho?.e_materia_prima ? 'Matéria-prima' : 'Produto'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      {dependencia.quantidade_necessaria}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      <CustoTotalProduto
                        produtoId={dependencia.produto_filho?.id || ''}
                        quantidade={dependencia.quantidade_necessaria}
                        precoUnitario={dependencia.produto_filho?.preco_unitario}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-3">
                        <button
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          onClick={() => iniciarEdicao(dependencia)}
                        >
                          Editar
                        </button>
                        <button
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                          onClick={() => confirmarExclusao(dependencia)}
                        >
                          Remover
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
              Nenhuma dependência encontrada
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm
                ? 'Tente ajustar os termos de busca.'
                : 'Este produto ainda não possui dependências cadastradas.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <button
                  onClick={() => setShowAddForm(true)}
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
                  Adicionar Primeira Dependência
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de edição de dependência */}
      {dependenciaParaEditar && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity"
              onClick={cancelarEdicao}
              aria-hidden="true"
            ></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="relative inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={salvarEdicao}>
                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/50 sm:mx-0 sm:h-10 sm:w-10">
                      <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                        Editar Dependência
                      </h3>
                      <div className="mt-4 space-y-4">
                        <div>
                          <label htmlFor="edit_produto_filho_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Produto/Matéria-prima <span className="text-red-500">*</span>
                          </label>
                          <select
                            id="edit_produto_filho_id"
                            value={dadosEdicao.produto_filho_id}
                            onChange={(e) => setDadosEdicao({ ...dadosEdicao, produto_filho_id: e.target.value })}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            required
                          >
                            <option value="">Selecione um produto</option>
                            {produtosDisponiveisEdicao.map((produto) => (
                              <option key={produto.id} value={produto.id}>
                                {produto.nome} {produto.e_materia_prima ? '(Matéria-prima)' : '(Produto)'}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor="edit_quantidade_necessaria" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Quantidade Necessária <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            id="edit_quantidade_necessaria"
                            min="0.01"
                            step="0.01"
                            value={dadosEdicao.quantidade_necessaria}
                            onChange={(e) => setDadosEdicao({ ...dadosEdicao, quantidade_necessaria: parseFloat(e.target.value) || 0 })}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm ${editandoDependencia
                      ? 'bg-blue-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                      }`}
                    disabled={editandoDependencia}
                  >
                    {editandoDependencia ? (
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
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:mr-3 sm:w-auto sm:text-sm"
                    onClick={cancelarEdicao}
                    disabled={editandoDependencia}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de exclusão */}
      {dependenciaParaExcluir && (
        <div className="fixed inset-0 z-[9999] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 transition-opacity"
              onClick={cancelarExclusao}
              aria-hidden="true"
            ></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
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
                      Remover dependência
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Tem certeza que deseja remover a dependência &quot;{dependenciaParaExcluir.produto_filho?.nome || 'produto não identificado'}&quot;? Esta ação não pode ser desfeita.
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
                  onClick={excluirDependencia}
                  disabled={excluindo}
                >
                  {excluindo ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Removendo...
                    </>
                  ) : (
                    'Remover'
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