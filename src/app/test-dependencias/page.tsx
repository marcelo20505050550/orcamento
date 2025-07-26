'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'

type Produto = {
  id: string
  nome: string
  e_materia_prima: boolean
  preco_unitario?: number
}

export default function TestDependenciasPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState('')

  // Simular o mesmo código da página de dependências
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        console.log('🔍 Iniciando carregamento de produtos...')
        
        // Buscar todos os produtos para o formulário de adição
        const produtosResponse = await api.get('/api/produtos?pageSize=1000')
        console.log('Resposta da API de produtos:', produtosResponse)
        
        // Tentar diferentes estruturas de resposta
        let produtosCarregados: Produto[] = []
        if (produtosResponse.data?.data) {
          // Estrutura: { data: { data: [...], pagination: {...} } }
          produtosCarregados = produtosResponse.data.data
          console.log('✅ Usando estrutura data.data')
        } else if (produtosResponse.data && Array.isArray(produtosResponse.data)) {
          // Estrutura: { data: [...] }
          produtosCarregados = produtosResponse.data
          console.log('✅ Usando estrutura data (array)')
        } else if (produtosResponse.data) {
          // Estrutura: { data: {...} } - objeto único
          produtosCarregados = [produtosResponse.data]
          console.log('✅ Usando estrutura data (objeto único)')
        }
        
        console.log('Produtos carregados:', produtosCarregados.length)
        
        // Filtrar produtos disponíveis (excluir o produto atual de teste)
        const produtoAtualId = '6e53efc7-0ab1-4aab-9c37-e81007533034'
        const produtosDisponiveis = produtosCarregados.filter(p => p.id !== produtoAtualId)
        console.log('Produtos disponíveis após filtro:', produtosDisponiveis.length)
        
        setProdutos(produtosDisponiveis)
      } catch (err: any) {
        console.error('Erro ao buscar dados:', err)
        setError(err.message || 'Não foi possível carregar os dados.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="p-4 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Teste: Carregamento de Produtos para Dependências
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Testando o mesmo código usado na página de dependências do produto "Talisca 3 vincos".
        </p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-md mb-6">
            <h3 className="text-red-800 dark:text-red-200 font-medium">Erro:</h3>
            <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status do Carregamento:
            </label>
            <div className={`px-3 py-2 rounded-md text-sm ${
              produtos.length > 0 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200'
            }`}>
              {produtos.length > 0 
                ? `✅ ${produtos.length} produtos carregados com sucesso`
                : '⚠️ Nenhum produto carregado'
              }
            </div>
          </div>

          <div>
            <label htmlFor="produto_select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Produto/Matéria-prima <span className="text-red-500">*</span>
            </label>
            <select
              id="produto_select"
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Selecione um produto</option>
              {produtos.map((produto) => (
                <option key={produto.id} value={produto.id}>
                  {produto.nome} {produto.e_materia_prima ? '(Matéria-prima)' : '(Produto)'}
                </option>
              ))}
            </select>
          </div>

          {selectedProduct && (
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-md">
              <h4 className="text-blue-800 dark:text-blue-200 font-medium">Produto Selecionado:</h4>
              <p className="text-blue-700 dark:text-blue-300 mt-1">
                {produtos.find(p => p.id === selectedProduct)?.nome}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Lista de produtos para debug */}
      {produtos.length > 0 && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Produtos Disponíveis ({produtos.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {produtos.map((produto) => (
              <div 
                key={produto.id} 
                className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {produto.nome}
                    </span>
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                      produto.e_materia_prima
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                    }`}>
                      {produto.e_materia_prima ? 'Matéria-prima' : 'Produto'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {produto.id.substring(0, 8)}...
                  </div>
                </div>
                {produto.preco_unitario !== undefined && (
                  <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    R$ {produto.preco_unitario.toFixed(2)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}