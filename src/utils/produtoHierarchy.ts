import api from '@/lib/api'
import { ProdutoTreeElement } from '@/components/ui/produto-tree'
import supabase from '@/lib/supabase/client'

// Tipo para produto com dependências do banco
type ProdutoComDependencias = {
  id: string
  nome: string
  descricao: string
  preco_unitario: number
  quantidade_estoque: number
  e_materia_prima: boolean
  created_at: string
  updated_at: string
}

type Dependencia = {
  id: string
  produto_pai_id: string
  produto_filho_id: string
  quantidade_necessaria: number
  produto_pai?: ProdutoComDependencias
  produto_filho?: ProdutoComDependencias
}

/**
 * Busca todos os produtos e suas dependências, organizando em hierarquia de árvore
 * @returns Promise<ProdutoTreeElement[]> - Array de produtos organizados em hierarquia
 */
export async function buscarProdutosHierarquia(): Promise<ProdutoTreeElement[]> {
  try {
    console.log('🔍 Iniciando busca de produtos em hierarquia...')

    // Verificar autenticação primeiro
    const { data: { session } } = await supabase.auth.getSession()
    console.log('🔐 Status da sessão:', {
      hasSession: !!session,
      hasToken: !!session?.access_token,
      tokenLength: session?.access_token?.length || 0,
      userEmail: session?.user?.email || 'N/A'
    })

    if (!session) {
      throw new Error('Usuário não autenticado')
    }

    // Buscar todos os produtos
    console.log('📡 Fazendo requisição para /api/produtos?pageSize=1000')
    const produtosResponse = await api.get('/api/produtos?pageSize=1000')
    console.log('📦 Resposta completa da API de produtos:', produtosResponse)
    console.log('📊 Estrutura dos dados:', {
      hasData: !!produtosResponse.data,
      dataKeys: produtosResponse.data ? Object.keys(produtosResponse.data) : [],
      dataType: typeof produtosResponse.data
    })

    // Tentar diferentes estruturas de resposta
    let produtos: ProdutoComDependencias[] = []

    if (produtosResponse.data?.data) {
      // Estrutura: { data: { data: [...], pagination: {...} } }
      produtos = produtosResponse.data.data
      console.log('📋 Usando estrutura data.data, produtos encontrados:', produtos.length)
    } else if (Array.isArray(produtosResponse.data)) {
      // Estrutura: { data: [...] }
      produtos = produtosResponse.data
      console.log('📋 Usando estrutura data (array), produtos encontrados:', produtos.length)
    } else if (produtosResponse.data) {
      // Estrutura: { data: {...} } - objeto único
      produtos = [produtosResponse.data]
      console.log('📋 Usando estrutura data (objeto único), produtos encontrados:', produtos.length)
    } else {
      console.warn('⚠️ Estrutura de resposta não reconhecida:', produtosResponse)
    }

    // Se não há produtos, tentar abordagem alternativa
    if (produtos.length === 0) {
      console.log('⚠️ Nenhum produto encontrado, tentando abordagem alternativa...')

      try {
        // Tentar rota de teste
        const testResponse = await fetch('/api/produtos-test')
        const testData = await testResponse.json()
        console.log('🧪 Resposta da rota de teste:', testData)

        if (testData.success && testData.data.produtosAmostra) {
          produtos = testData.data.produtosAmostra
          console.log('✅ Produtos obtidos via rota de teste:', produtos.length)
        }
      } catch (testError) {
        console.warn('⚠️ Erro na rota de teste:', testError)
      }
    }

    // Buscar dependências para cada produto
    const dependencias: Dependencia[] = []
    for (const produto of produtos) {
      try {
        const depResponse = await api.get(`/api/produtos/${produto.id}/dependencias`)
        const produtoDeps = depResponse.data || []
        dependencias.push(...produtoDeps.map((dep: any) => ({
          id: dep.id,
          produto_pai_id: produto.id,
          produto_filho_id: dep.produto_filho.id,
          quantidade_necessaria: dep.quantidade_necessaria,
          produto_pai: { id: produto.id, nome: produto.nome },
          produto_filho: dep.produto_filho
        })))
      } catch (error) {
        console.warn(`⚠️ Erro ao buscar dependências do produto ${produto.id}:`, error)
      }
    }

    console.log('Produtos carregados:', produtos.length)
    console.log('Dependências carregadas:', dependencias.length)

    // Converter produtos para o formato do componente de árvore
    const produtosMap = new Map<string, ProdutoTreeElement>()

    produtos.forEach(produto => {
      produtosMap.set(produto.id, {
        id: produto.id,
        nome: produto.nome,
        descricao: produto.descricao,
        preco_unitario: produto.preco_unitario,
        quantidade_estoque: produto.quantidade_estoque,
        e_materia_prima: produto.e_materia_prima,
        children: []
      })
    })

    // Organizar dependências em hierarquia
    const produtosPrincipais: ProdutoTreeElement[] = []
    const produtosComPai = new Set<string>()

    // Primeiro, identificar produtos que são dependências de outros
    dependencias.forEach(dep => {
      produtosComPai.add(dep.produto_filho_id)
    })

    // Construir hierarquia recursiva para dependências de dependências
    function construirHierarchiaRecursiva(produtoId: string, visitados = new Set<string>()): ProdutoTreeElement | null {
      if (visitados.has(produtoId)) {
        return null // Evitar loops infinitos
      }
      visitados.add(produtoId)

      const produto = produtosMap.get(produtoId)
      if (!produto) return null

      const produtoComFilhos: ProdutoTreeElement = {
        ...produto,
        children: []
      }

      // Buscar dependências deste produto
      const dependenciasDesteProduto = dependencias.filter(dep => dep.produto_pai_id === produtoId)

      dependenciasDesteProduto.forEach(dep => {
        const produtoFilho = construirHierarchiaRecursiva(dep.produto_filho_id, new Set(visitados))
        if (produtoFilho) {
          // Usar quantidade necessária em vez do estoque original
          produtoFilho.quantidade_estoque = dep.quantidade_necessaria
          produtoComFilhos.children!.push(produtoFilho)
        }
      })

      // Ordenar filhos por nome
      if (produtoComFilhos.children) {
        produtoComFilhos.children.sort((a, b) => a.nome.localeCompare(b.nome))
      }

      return produtoComFilhos
    }

    // Adicionar produtos principais (que não são dependências de outros)
    produtos.forEach(produto => {
      if (!produtosComPai.has(produto.id)) {
        const produtoComHierarquia = construirHierarchiaRecursiva(produto.id)
        if (produtoComHierarquia) {
          produtosPrincipais.push(produtoComHierarquia)
        }
      }
    })

    // Ordenar produtos principais por nome
    produtosPrincipais.sort((a, b) => a.nome.localeCompare(b.nome))

    console.log('Hierarquia construída:', produtosPrincipais.length, 'produtos principais')

    return produtosPrincipais

  } catch (error) {
    console.error('❌ Erro ao buscar produtos em hierarquia:', error)

    // Log detalhado do erro
    if (error instanceof Error) {
      console.error('📝 Detalhes do erro:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      })

      // Verificar se é erro de autenticação
      if (error.message.includes('401') || error.message.includes('Unauthorized') || error.message.includes('autenticação')) {
        throw new Error('Erro de autenticação: Faça login novamente para acessar os produtos')
      }

      // Verificar se é erro de rede
      if (error.message.includes('fetch') || error.message.includes('network')) {
        throw new Error('Erro de conexão: Verifique sua conexão com a internet')
      }
    }

    throw new Error('Não foi possível carregar a hierarquia de produtos. Verifique se você está logado e tente novamente.')
  }
}

/**
 * Filtrar produtos hierárquicos por termo de busca
 * @param produtos - Array de produtos em hierarquia
 * @param termo - Termo de busca
 * @returns ProdutoTreeElement[] - Produtos filtrados mantendo hierarquia
 */
export function filtrarProdutosHierarquia(
  produtos: ProdutoTreeElement[],
  termo: string
): ProdutoTreeElement[] {
  if (!termo.trim()) return produtos

  const termoLower = termo.toLowerCase()

  function filtrarRecursivo(produto: ProdutoTreeElement): ProdutoTreeElement | null {
    const nomeMatch = produto.nome.toLowerCase().includes(termoLower)
    const descricaoMatch = produto.descricao?.toLowerCase().includes(termoLower)

    // Filtrar filhos recursivamente
    const filhosFiltrados = produto.children
      ?.map(filho => filtrarRecursivo(filho))
      .filter(Boolean) as ProdutoTreeElement[]

    // Incluir produto se:
    // 1. Nome ou descrição correspondem ao termo
    // 2. Tem filhos que correspondem ao termo
    if (nomeMatch || descricaoMatch || (filhosFiltrados && filhosFiltrados.length > 0)) {
      return {
        ...produto,
        children: filhosFiltrados || []
      }
    }

    return null
  }

  return produtos
    .map(produto => filtrarRecursivo(produto))
    .filter(Boolean) as ProdutoTreeElement[]
}

/**
 * Filtrar produtos por tipo (produto final ou matéria-prima)
 * @param produtos - Array de produtos em hierarquia
 * @param filtroMateriaPrima - true para matérias-primas, false para produtos, null para todos
 * @returns ProdutoTreeElement[] - Produtos filtrados
 */
export function filtrarProdutosPorTipo(
  produtos: ProdutoTreeElement[],
  filtroMateriaPrima: boolean | null
): ProdutoTreeElement[] {
  if (filtroMateriaPrima === null) return produtos

  function filtrarPorTipoRecursivo(produto: ProdutoTreeElement): ProdutoTreeElement | null {
    // Filtrar filhos recursivamente
    const filhosFiltrados = produto.children
      ?.map(filho => filtrarPorTipoRecursivo(filho))
      .filter(Boolean) as ProdutoTreeElement[]

    // Incluir produto se corresponde ao filtro OU tem filhos que correspondem
    if (produto.e_materia_prima === filtroMateriaPrima || (filhosFiltrados && filhosFiltrados.length > 0)) {
      return {
        ...produto,
        children: filhosFiltrados || []
      }
    }

    return null
  }

  return produtos
    .map(produto => filtrarPorTipoRecursivo(produto))
    .filter(Boolean) as ProdutoTreeElement[]
}

/**
 * Ocultar ou mostrar matérias-primas na hierarquia
 * @param produtos - Array de produtos em hierarquia
 * @param mostrarMateriaPrima - true para mostrar, false para ocultar matérias-primas
 * @returns ProdutoTreeElement[] - Produtos com matérias-primas filtradas
 */
export function filtrarVisibilidadeMateriaPrima(
  produtos: ProdutoTreeElement[],
  mostrarMateriaPrima: boolean
): ProdutoTreeElement[] {
  if (mostrarMateriaPrima) return produtos

  function removerMateriaPrimaRecursivo(produto: ProdutoTreeElement): ProdutoTreeElement {
    // Se o produto tem filhos, processar recursivamente
    if (produto.children && produto.children.length > 0) {
      // Filtrar apenas produtos finais (não matérias-primas) dos filhos
      const filhosProdutos = produto.children
        .filter(filho => !filho.e_materia_prima)
        .map(filho => removerMateriaPrimaRecursivo(filho))

      return {
        ...produto,
        children: filhosProdutos
      }
    }

    return produto
  }

  return produtos.map(produto => removerMateriaPrimaRecursivo(produto))
} 