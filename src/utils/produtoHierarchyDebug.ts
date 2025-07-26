/**
 * Versão de debug da função buscarProdutosHierarquia
 * Esta versão tenta múltiplas abordagens para obter os produtos
 */
import api from '@/lib/api'
import { ProdutoTreeElement } from '@/components/ui/produto-tree'
import supabase from '@/lib/supabase/client'

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

export async function buscarProdutosHierarchiaDebug(): Promise<{
  produtos: ProdutoTreeElement[]
  debug: any
}> {
  const debugInfo: any = {
    tentativas: [],
    sessao: null,
    erros: []
  }

  try {
    console.log('🔍 [DEBUG] Iniciando busca de produtos em hierarquia...')
    
    // 1. Verificar autenticação
    const { data: { session } } = await supabase.auth.getSession()
    debugInfo.sessao = {
      hasSession: !!session,
      hasToken: !!session?.access_token,
      tokenLength: session?.access_token?.length || 0,
      userEmail: session?.user?.email || 'N/A'
    }
    console.log('🔐 [DEBUG] Status da sessão:', debugInfo.sessao)
    
    let produtos: ProdutoComDependencias[] = []
    
    // 2. Tentativa 1: API normal com autenticação
    if (session) {
      try {
        console.log('📡 [DEBUG] Tentativa 1: API normal com autenticação')
        const response = await api.get('/api/produtos?pageSize=1000')
        
        debugInfo.tentativas.push({
          metodo: 'api.get com auth',
          sucesso: true,
          estrutura: {
            hasData: !!response.data,
            dataKeys: response.data ? Object.keys(response.data) : [],
            dataType: typeof response.data
          }
        })
        
        if (response.data?.data) {
          produtos = response.data.data
        } else if (Array.isArray(response.data)) {
          produtos = response.data
        }
        
        console.log('✅ [DEBUG] Tentativa 1 bem-sucedida:', produtos.length, 'produtos')
      } catch (error) {
        console.warn('⚠️ [DEBUG] Tentativa 1 falhou:', error)
        debugInfo.erros.push({
          tentativa: 1,
          erro: error instanceof Error ? error.message : 'Erro desconhecido'
        })
      }
    }
    
    // 3. Tentativa 2: Rota de teste (sem autenticação)
    if (produtos.length === 0) {
      try {
        console.log('📡 [DEBUG] Tentativa 2: Rota de teste sem autenticação')
        const response = await fetch('/api/produtos-test')
        const data = await response.json()
        
        debugInfo.tentativas.push({
          metodo: 'fetch produtos-test',
          sucesso: response.ok,
          status: response.status,
          data: data
        })
        
        if (data.success && data.data?.produtosAmostra) {
          produtos = data.data.produtosAmostra
          console.log('✅ [DEBUG] Tentativa 2 bem-sucedida:', produtos.length, 'produtos')
        }
      } catch (error) {
        console.warn('⚠️ [DEBUG] Tentativa 2 falhou:', error)
        debugInfo.erros.push({
          tentativa: 2,
          erro: error instanceof Error ? error.message : 'Erro desconhecido'
        })
      }
    }
    
    // 4. Tentativa 3: Fetch manual com token
    if (produtos.length === 0 && session?.access_token) {
      try {
        console.log('📡 [DEBUG] Tentativa 3: Fetch manual com token')
        const response = await fetch('/api/produtos?pageSize=1000', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        })
        
        const data = await response.json()
        
        debugInfo.tentativas.push({
          metodo: 'fetch manual com token',
          sucesso: response.ok,
          status: response.status,
          data: data
        })
        
        if (response.ok && data?.data) {
          produtos = data.data
          console.log('✅ [DEBUG] Tentativa 3 bem-sucedida:', produtos.length, 'produtos')
        }
      } catch (error) {
        console.warn('⚠️ [DEBUG] Tentativa 3 falhou:', error)
        debugInfo.erros.push({
          tentativa: 3,
          erro: error instanceof Error ? error.message : 'Erro desconhecido'
        })
      }
    }
    
    console.log('📊 [DEBUG] Resultado final:', produtos.length, 'produtos encontrados')
    
    // Converter para formato de árvore (versão simplificada)
    const produtosTree: ProdutoTreeElement[] = produtos.map(produto => ({
      id: produto.id,
      nome: produto.nome,
      descricao: produto.descricao,
      preco_unitario: produto.preco_unitario,
      quantidade_estoque: produto.quantidade_estoque,
      e_materia_prima: produto.e_materia_prima,
      children: []
    }))
    
    return {
      produtos: produtosTree,
      debug: debugInfo
    }
    
  } catch (error) {
    console.error('❌ [DEBUG] Erro geral:', error)
    debugInfo.erros.push({
      tentativa: 'geral',
      erro: error instanceof Error ? error.message : 'Erro desconhecido'
    })
    
    return {
      produtos: [],
      debug: debugInfo
    }
  }
}