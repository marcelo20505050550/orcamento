'use client'

import { useState } from 'react'
import api from '@/lib/api'

export default function DebugProdutoEdicaoPage() {
  const [resultado, setResultado] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testarCarregamentoProduto = async () => {
    setLoading(true)
    setError(null)
    setResultado(null)

    try {
      const produtoId = '6e53efc7-0ab1-4aab-9c37-e81007533034'
      console.log('🔍 Testando carregamento do produto para edição...')
      
      // Buscar dados do produto
      const produtoResponse = await api.get(`/api/produtos/${produtoId}`)
      console.log('📦 Resposta do produto:', produtoResponse)
      
      const produto = produtoResponse.data
      console.log('📊 Dados do produto:', produto)
      console.log('🏷️ É matéria-prima?', produto?.e_materia_prima)
      
      // Se fosse matéria-prima, testaria a busca de dependências
      if (produto?.e_materia_prima) {
        console.log('🔍 Produto é matéria-prima, buscando dependências...')
        
        const produtosResponse = await api.get('/api/produtos?pageSize=1000')
        console.log('📦 Resposta de todos os produtos:', produtosResponse)
        
        const todosProdutos = produtosResponse.data?.data || produtosResponse.data || []
        console.log('📊 Total de produtos encontrados:', todosProdutos.length)
        
        // Buscar dependências em cada produto
        for (const prod of todosProdutos.slice(0, 3)) { // Testar apenas os primeiros 3
          try {
            const depResponse = await api.get(`/api/produtos/${prod.id}/dependencias`)
            console.log(`📦 Dependências do produto ${prod.nome}:`, depResponse)
            
            const deps = Array.isArray(depResponse) ? depResponse : (depResponse.data || [])
            const depEncontrada = deps.find((d: any) => d.produto_filho?.id === produtoId)
            
            if (depEncontrada) {
              console.log('✅ Dependência encontrada:', depEncontrada)
              break
            }
          } catch (depError) {
            console.warn(`⚠️ Erro ao buscar dependências de ${prod.nome}:`, depError)
          }
        }
      }
      
      setResultado({
        produto,
        e_materia_prima: produto?.e_materia_prima,
        nome: produto?.nome
      })
      
    } catch (err: any) {
      console.error('❌ Erro:', err)
      setError(err.message || 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Debug: Carregamento de Produto para Edição
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Testando o carregamento do produto "Talisca 3 vincos" para edição.
        </p>
        
        <button
          onClick={testarCarregamentoProduto}
          disabled={loading}
          className={`px-4 py-2 rounded-md text-white font-medium ${
            loading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? 'Testando...' : 'Testar Carregamento'}
        </button>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-md mt-4">
            <h3 className="text-red-800 dark:text-red-200 font-medium">Erro:</h3>
            <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
        )}

        {resultado && (
          <div className="mt-6 space-y-4">
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
              <h3 className="text-white font-bold mb-2">Resultado:</h3>
              <pre className="whitespace-pre-wrap overflow-auto max-h-96">
                {JSON.stringify(resultado, null, 2)}
              </pre>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-md">
              <h4 className="text-blue-800 dark:text-blue-200 font-medium">Análise:</h4>
              <ul className="text-blue-700 dark:text-blue-300 mt-2 space-y-1">
                <li>• <strong>Nome:</strong> {resultado.nome}</li>
                <li>• <strong>É matéria-prima:</strong> {resultado.e_materia_prima ? 'SIM' : 'NÃO'}</li>
                <li>• <strong>Campo deveria aparecer:</strong> {resultado.e_materia_prima ? 'SIM' : 'NÃO'}</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}