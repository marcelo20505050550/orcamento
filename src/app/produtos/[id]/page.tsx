'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import MargemLucroProduto from '@/components/MargemLucroProduto'
import ResumoCustoProduto from '@/components/ResumoCustoProduto'


// Componente para calcular e exibir o custo total unitário de um produto
function CustoTotalUnitario({ produtoId, precoUnitario, visible = true }: { 
  produtoId: string, 
  precoUnitario?: number,
  visible?: boolean
}) {
  const [custoTotal, setCustoTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCustoTotal = async () => {
      try {
        console.log(`Buscando custo total unitário para produto ${produtoId}`)
        const response = await api.get(`/api/produtos/${produtoId}/custo-total`)
        const custoUnitario = response.custo_total || 0
        
        console.log(`Produto ${produtoId}: custo unitário calculado = ${custoUnitario}`)
        setCustoTotal(custoUnitario)
      } catch (error) {
        console.error(`Erro ao buscar custo total do produto ${produtoId}:`, error)
        // Fallback para o preço unitário se a API falhar
        if (precoUnitario) {
          setCustoTotal(precoUnitario)
        } else {
          setCustoTotal(0)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchCustoTotal()
  }, [produtoId, precoUnitario])

  if (!visible) {
    return null
  }

  if (loading) {
    return <span className="text-gray-400">Calculando...</span>
  }

  if (custoTotal === null || custoTotal === 0) {
    return <span className="text-gray-400">N/D</span>
  }

  return <span>R$ {custoTotal.toFixed(2)}</span>
}

// Componente para calcular e exibir o custo total de um produto multiplicado pela quantidade
function CustoTotalComQuantidade({ produtoId, quantidade, precoUnitario, visible = true }: { 
  produtoId: string, 
  quantidade: number, 
  precoUnitario?: number,
  visible?: boolean
}) {
  const [custoTotal, setCustoTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCustoTotal = async () => {
      try {
        console.log(`Buscando custo total para produto ${produtoId} com quantidade ${quantidade}`)
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

  if (!visible) {
    return null
  }

  if (loading) {
    return <span className="text-gray-400">Calculando...</span>
  }

  if (custoTotal === null || custoTotal === 0) {
    return <span className="text-gray-400">N/D</span>
  }

  return <span>R$ {custoTotal.toFixed(2)}</span>
}

// Componente para calcular e exibir o custo total de todas as dependências
function CustoTotalDependencias({ dependencias, visible = true, onCustoCalculado }: { 
  dependencias: Dependencia[],
  visible?: boolean,
  onCustoCalculado?: (custo: number) => void
}) {
  const [custoTotal, setCustoTotal] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCustosTotais = async () => {
      try {
        let custoTotalCalculado = 0
        
        for (const dependencia of dependencias) {
          try {
            console.log(`Calculando custo para dependência: ${dependencia.produto_filho.nome}`)
            const response = await api.get(`/api/produtos/${dependencia.produto_filho.id}/custo-total`)
            const custoUnitario = response.custo_total || 0
            const custoItem = custoUnitario * dependencia.quantidade_necessaria
            custoTotalCalculado += custoItem
            
            console.log(`Dependência ${dependencia.produto_filho.nome}: custo unitário = ${custoUnitario}, quantidade = ${dependencia.quantidade_necessaria}, custo item = ${custoItem}`)
          } catch (error) {
            console.error(`Erro ao buscar custo da dependência ${dependencia.produto_filho.nome}:`, error)
            // Fallback para o preço unitário
            const custoItem = (dependencia.produto_filho.preco_unitario || 0) * dependencia.quantidade_necessaria
            custoTotalCalculado += custoItem
          }
        }
        
        console.log(`Custo total das dependências calculado: R$ ${custoTotalCalculado.toFixed(2)}`)
        setCustoTotal(custoTotalCalculado)
        
        // Notificar o componente pai sobre o custo calculado
        if (onCustoCalculado) {
          onCustoCalculado(custoTotalCalculado)
        }
      } catch (error) {
        console.error('Erro ao calcular custo total das dependências:', error)
        // Fallback para o cálculo simples
        const custoFallback = dependencias.reduce((total, dep) => {
          return total + ((dep.produto_filho.preco_unitario || 0) * dep.quantidade_necessaria)
        }, 0)
        setCustoTotal(custoFallback)
        
        if (onCustoCalculado) {
          onCustoCalculado(custoFallback)
        }
      } finally {
        setLoading(false)
      }
    }

    if (dependencias.length > 0) {
      fetchCustosTotais()
    } else {
      setCustoTotal(0)
      if (onCustoCalculado) {
        onCustoCalculado(0)
      }
      setLoading(false)
    }
  }, [dependencias, onCustoCalculado])

  if (!visible) {
    return null
  }

  if (loading) {
    return <span className="text-gray-400">Calculando...</span>
  }

  return <span>R$ {custoTotal.toFixed(2)}</span>
}

type Produto = {
  id: string
  nome: string
  codigo_produto?: string
  descricao: string
  preco_unitario?: number
  quantidade_necessaria?: number
  e_materia_prima: boolean
  tipo_produto: 'simples' | 'calculo'
  margem_lucro_percentual?: number
  created_at: string
  updated_at: string
}

type Dependencia = {
  id: string
  quantidade_necessaria: number
  produto_filho: {
    id: string
    nome: string
    e_materia_prima: boolean
    preco_unitario: number
  }
}

type ProdutoProcesso = {
  id: string
  quantidade: number
  unidade_medida: 'horas' | 'quilos'
  processo: {
    id: string
    nome: string
    preco_por_unidade: number
    tempo_estimado_minutos: number
  }
}

type ProdutoMaoDeObra = {
  id: string
  horas: number
  mao_de_obra: {
    id: string
    tipo: string
    preco_por_hora: number
  }
}



export default function ProdutoDetalhesPage() {
  const params = useParams()
  const produtoId = params.id as string

  const [produto, setProduto] = useState<Produto | null>(null)
  const [dependencias, setDependencias] = useState<Dependencia[]>([])
  const [produtoProcessos, setProdutoProcessos] = useState<ProdutoProcesso[]>([])
  const [produtoMaoDeObra, setProdutoMaoDeObra] = useState<ProdutoMaoDeObra[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [custoCalculadoMateriasPrimas, setCustoCalculadoMateriasPrimas] = useState<number>(0)
  const [editando, setEditando] = useState(false)

  // Sempre renderizar os componentes de custo para manter a ordem dos hooks
  // Eles serão exibidos ou ocultados através do parâmetro visible
  const custoTotalDependencias = (
    <CustoTotalDependencias 
      dependencias={dependencias} 
      visible={produto?.tipo_produto === 'calculo'}
      onCustoCalculado={setCustoCalculadoMateriasPrimas}
    />
  )

  const custoTotalUnitario = (produtoId: string, precoUnitario?: number) => (
    <CustoTotalUnitario 
      produtoId={produtoId} 
      precoUnitario={precoUnitario}
      visible={produto?.tipo_produto === 'calculo'}
    />
  )

  const custoTotalComQuantidade = (produtoId: string, quantidade: number, precoUnitario?: number) => (
    <CustoTotalComQuantidade 
      produtoId={produtoId} 
      quantidade={quantidade}
      precoUnitario={precoUnitario}
      visible={produto?.tipo_produto === 'calculo'}
    />
  )

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Buscar informações do produto
        const produtoResponse = await api.get(`/api/produtos/${produtoId}`)
        setProduto(produtoResponse.data)

        // Buscar dependências do produto (apenas nível direto para a tabela)
        const dependenciasResponse = await api.get(`/api/produtos/${produtoId}/dependencias`)

        // A resposta da API vem diretamente como array, não dentro de .data
        const dependenciasData = Array.isArray(dependenciasResponse) ? dependenciasResponse : (dependenciasResponse.data || [])
        setDependencias(dependenciasData)

        // Buscar processos do produto
        const processosResponse = await api.get(`/api/produtos/${produtoId}/processos`)
        const processosData = processosResponse.data || []
        setProdutoProcessos(processosData)

        // Buscar mão de obra do produto
        const maoDeObraResponse = await api.get(`/api/produtos/${produtoId}/mao-de-obra`)
        const maoDeObraData = maoDeObraResponse.data || []
        setProdutoMaoDeObra(maoDeObraData)
      } catch (err) {
        console.error('Erro ao buscar dados:', err)
        setError('Não foi possível carregar os dados do produto. Tente novamente mais tarde.')
      } finally {
        setLoading(false)
      }
    }

    if (produtoId) {
      fetchData()
    }
  }, [produtoId])

  const recarregarProduto = async () => {
    try {
      const response = await api.get(`/api/produtos/${produtoId}`)
      if (!response.error) {
        setProduto(response.data)
      }
    } catch (error) {
      console.error('Erro ao recarregar produto:', error)
    }
  }

  if (loading) {
    return (
      <div className="p-4 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error || !produto) {
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
              href="/produtos"
              className="text-sm text-red-600 hover:text-red-700 underline"
            >
              Voltar para produtos
            </Link>
          </div>
        </div>
      </div>
    )
  }



  // Cálculo detalhado das dependências para uso nos cálculos (fallback)
  const custoTotalDependenciasNumerico = dependencias.reduce((total, dep) => {
    const precoUnitario = dep.produto_filho.preco_unitario || 0
    const quantidade = dep.quantidade_necessaria
    const custoItem = precoUnitario * quantidade
    
    console.log(`Dependência: ${dep.produto_filho.nome} - Preço: R$ ${precoUnitario.toFixed(2)} x Qtd: ${quantidade} = R$ ${custoItem.toFixed(2)}`)
    
    return total + custoItem
  }, 0)

  const custoTotalProcessos = produtoProcessos.reduce((total, proc) => {
    const precoUnidade = proc.processo.preco_por_unidade || 0
    const quantidade = proc.quantidade
    const custoItem = precoUnidade * quantidade
    
    console.log(`Processo: ${proc.processo.nome} - Preço: R$ ${precoUnidade.toFixed(2)} x Qtd: ${quantidade} = R$ ${custoItem.toFixed(2)}`)
    
    return total + custoItem
  }, 0)

  const custoTotalMaoDeObra = produtoMaoDeObra.reduce((total, mao) => {
    const precoHora = mao.mao_de_obra.preco_por_hora || 0
    const horas = mao.horas
    const custoItem = precoHora * horas
    
    console.log(`Mão de Obra: ${mao.mao_de_obra.tipo} - Preço: R$ ${precoHora.toFixed(2)} x Horas: ${horas} = R$ ${custoItem.toFixed(2)}`)
    
    return total + custoItem
  }, 0)

  // Cálculo do custo total baseado no tipo de produto
  const custoTotalProduto = produto.tipo_produto === 'simples' 
    ? (produto.preco_unitario || 0) * (produto.quantidade_necessaria || 1)
    : custoCalculadoMateriasPrimas + custoTotalProcessos + custoTotalMaoDeObra

  // Log detalhado para debug do cálculo
  console.log(`\n=== RESUMO DE CUSTOS - Produto ${produto.id} (${produto.nome}) ===`)
  console.log(`Tipo de produto: ${produto.tipo_produto}`)
  console.log(`Total de dependências: ${dependencias.length}`)
  console.log(`Total de processos: ${produtoProcessos.length}`)
  console.log(`Total de mão de obra: ${produtoMaoDeObra.length}`)
  console.log(`\nCUSTO DETALHADO:`)
  console.log(`- Matérias-primas (simples): R$ ${custoTotalDependenciasNumerico.toFixed(2)}`)
  console.log(`- Matérias-primas (calculado): R$ ${custoCalculadoMateriasPrimas.toFixed(2)}`)
  console.log(`- Processos de Fabricação: R$ ${custoTotalProcessos.toFixed(2)}`)
  console.log(`- Mão de Obra: R$ ${custoTotalMaoDeObra.toFixed(2)}`)
  console.log(`- CUSTO TOTAL DO PRODUTO: R$ ${custoTotalProduto.toFixed(2)}`)
  console.log(`===============================================\n`)

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
                  <span className="ml-4 text-sm font-medium text-gray-900 dark:text-white">
                    {produto.nome}
                  </span>
                </div>
              </li>
            </ol>
          </nav>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {produto.nome}
          </h1>
          <div className="mt-1 flex items-center space-x-2">
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${produto.e_materia_prima
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
              }`}>
              {produto.e_materia_prima ? 'Matéria-prima' : 'Produto'}
            </span>
            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${produto.tipo_produto === 'simples'
              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200'
              : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200'
              }`}>
              {produto.tipo_produto === 'simples' ? 'Produto Simples' : 'Produto para Cálculo'}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/produtos/novo?materiaPrima=true&produtoPai=${produto.id}`}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nova Matéria-prima
          </Link>
          {!editando ? (
            <button
              onClick={() => setEditando(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Editar Margem
            </button>
          ) : (
            <button
              onClick={() => setEditando(false)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
          )}
          <Link
            href={`/produtos/${produto.id}/editar`}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Editar Produto
          </Link>
        </div>
      </div>

      {/* Informações do produto */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Informações do Produto</h3>
        </div>
        <div className="px-6 py-4">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Nome</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">{produto.nome}</dd>
            </div>
            {produto.codigo_produto && (
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Código do Produto</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">{produto.codigo_produto}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Tipo</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {produto.e_materia_prima ? 'Matéria-prima' : 'Produto'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Categoria</dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {produto.tipo_produto === 'simples' ? 'Produto Simples' : 'Produto para Cálculo'}
              </dd>
            </div>
            {produto.tipo_produto === 'simples' && (
              <>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Preço Unitário</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    R$ {(produto.preco_unitario || 0).toFixed(2)}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Quantidade Necessária</dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">{produto.quantidade_necessaria || 1}</dd>
                </div>
              </>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Custo Total do Produto</dt>
              <dd className="mt-1 text-sm font-bold text-green-600 dark:text-green-400">
                R$ {custoTotalProduto.toFixed(2)}
              </dd>
            </div>
            {produto.descricao && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Descrição</dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">{produto.descricao}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Seção de Matérias-primas - apenas para produtos de cálculo */}
      {produto.tipo_produto === 'calculo' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Matérias-primas</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Componentes necessários para fabricar este produto
            </p>
          </div>
          <div className="flex space-x-2">
            <Link
              href={`/produtos/${produto.id}/dependencias`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Gerenciar
            </Link>
            <button
              onClick={async () => {
                try {
                  const arvoreResponse = await api.get(`/api/produtos/${produto.id}/arvore-dependencias`)
                  console.log('Árvore completa de dependências:', arvoreResponse)
                  alert('Árvore de dependências carregada! Veja o console para detalhes.')
                } catch (error) {
                  console.error('Erro ao carregar árvore:', error)
                  alert('Erro ao carregar árvore de dependências')
                }
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md shadow-sm text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h2a2 2 0 012 2v2H8V5z" />
              </svg>
              Ver Árvore
            </button>
          </div>
        </div>
        <div className="px-6 py-4">
          {dependencias.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Matéria-prima
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Quantidade
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Preço Unit.
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Custo Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {dependencias.map((dependencia) => (
                      <tr key={dependencia.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                          {dependencia.produto_filho.nome}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {dependencia.quantidade_necessaria}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {custoTotalUnitario(dependencia.produto_filho.id, dependencia.produto_filho.preco_unitario)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {custoTotalComQuantidade(dependencia.produto_filho.id, dependencia.quantidade_necessaria, dependencia.produto_filho.preco_unitario)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <td colSpan={3} className="px-6 py-3 text-sm font-medium text-gray-900 dark:text-white text-right">
                        Custo Total das Matérias-primas:
                      </td>
                      <td className="px-6 py-3 text-sm font-bold text-gray-900 dark:text-white">
                        {custoTotalDependencias}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
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
                Nenhuma matéria-prima cadastrada
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Este produto ainda não possui matérias-primas definidas.
              </p>
              <div className="mt-6">
                <Link
                  href={`/produtos/${produto.id}/dependencias`}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Adicionar Matérias-primas
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Seção de Processos de Fabricação - apenas para produtos de cálculo */}
      {produto.tipo_produto === 'calculo' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Processos de Fabricação</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Processos necessários para fabricar este produto
            </p>
          </div>
          <Link
            href={`/produtos/${produto.id}/processos`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Gerenciar
          </Link>
        </div>
        <div className="px-6 py-4">
          {produtoProcessos.length > 0 ? (
            <div className="space-y-4">
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
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${produtoProcesso.unidade_medida === 'horas'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                            }`}>
                            {produtoProcesso.unidade_medida === 'horas' ? 'Horas' : 'Quilos'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          R$ {(produtoProcesso.processo.preco_por_unidade || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          R$ {((produtoProcesso.processo.preco_por_unidade || 0) * produtoProcesso.quantidade).toFixed(2)}
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
                        R$ {custoTotalProcessos.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
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
                Nenhum processo cadastrado
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Este produto ainda não possui processos de fabricação definidos.
              </p>
              <div className="mt-6">
                <Link
                  href={`/produtos/${produto.id}/processos`}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Adicionar Processos
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Seção de Mão de Obra - apenas para produtos de cálculo */}
      {produto.tipo_produto === 'calculo' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Mão de Obra</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Tipos de mão de obra necessários para fabricar este produto
            </p>
          </div>
          <Link
            href={`/produtos/${produto.id}/mao-de-obra`}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Gerenciar
          </Link>
        </div>
        <div className="px-6 py-4">
          {produtoMaoDeObra.length > 0 ? (
            <div className="space-y-4">
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
                          R$ {(produtoMao.mao_de_obra.preco_por_hora || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          R$ {((produtoMao.mao_de_obra.preco_por_hora || 0) * produtoMao.horas).toFixed(2)}
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
                        R$ {custoTotalMaoDeObra.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
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
                Nenhuma mão de obra cadastrada
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Este produto ainda não possui mão de obra definida.
              </p>
              <div className="mt-6">
                <Link
                  href={`/produtos/${produto.id}/mao-de-obra`}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Adicionar Mão de Obra
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Resumo de Custos - apenas para produtos de cálculo */}
      {produto.tipo_produto === 'calculo' && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Resumo de Custos</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Custo total para fabricar este produto
          </p>
        </div>
        <div className="px-6 py-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-900 dark:text-white">Matérias-primas:</span>
              <span className="text-sm text-gray-500 dark:text-gray-300">{custoTotalDependencias}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-900 dark:text-white">Processos de Fabricação:</span>
              <span className="text-sm text-gray-500 dark:text-gray-300">R$ {custoTotalProcessos.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-900 dark:text-white">Mão de Obra:</span>
              <span className="text-sm text-gray-500 dark:text-gray-300">R$ {custoTotalMaoDeObra.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center py-3 bg-gray-50 dark:bg-gray-700 rounded-lg px-4">
              <span className="text-lg font-bold text-gray-900 dark:text-white">Custo Total do Produto:</span>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">R$ {custoTotalProduto.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Seção de Margem de Lucro */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="p-6">
          <MargemLucroProduto
            produtoId={produtoId}
            margemLucroAtual={produto.margem_lucro_percentual || 0}
            editando={editando}
            onMargemChange={() => {
              recarregarProduto()
              setEditando(false)
            }}
          />
        </div>
      </div>

      {/* Resumo com Margem de Lucro */}
      <ResumoCustoProduto
        custoTotalProduto={custoTotalProduto}
        margemLucro={produto.margem_lucro_percentual || 0}
        nomeProduto={produto.nome}
      />
    </div>
  )
}