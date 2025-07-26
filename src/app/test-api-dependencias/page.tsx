'use client'

import { useState } from 'react'
import api from '@/lib/api'

export default function TestApiDependenciasPage() {
  const [resultado, setResultado] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testarAPI = async () => {
    setLoading(true)
    setError(null)
    setResultado(null)

    try {
      console.log('🔍 Testando API de dependências...')
      
      const produtoId = '6e53efc7-0ab1-4aab-9c37-e81007533034'
      const response = await api.get(`/api/produtos/${produtoId}/dependencias`)
      
      console.log('📦 Resposta da API:', response)
      setResultado(response)
      
    } catch (err: any) {
      console.error('❌ Erro:', err)
      setError(err.message || 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const testarAPIProdutos = async () => {
    setLoading(true)
    setError(null)
    setResultado(null)

    try {
      console.log('🔍 Testando API de produtos...')
      
      const response = await api.get('/api/produtos?materiaPrima=false&pageSize=1000')
      
      console.log('📦 Resposta da API de produtos:', response)
      setResultado(response)
      
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
          Teste: APIs de Dependências e Produtos
        </h1>
        
        <div className="space-x-4 mb-6">
          <button
            onClick={testarAPI}
            disabled={loading}
            className={`px-4 py-2 rounded-md text-white font-medium ${
              loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Testando...' : 'Testar API Dependências'}
          </button>
          
          <button
            onClick={testarAPIProdutos}
            disabled={loading}
            className={`px-4 py-2 rounded-md text-white font-medium ${
              loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {loading ? 'Testando...' : 'Testar API Produtos'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-md mb-4">
            <h3 className="text-red-800 dark:text-red-200 font-medium">Erro:</h3>
            <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
        )}

        {resultado && (
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
            <h3 className="text-white font-bold mb-2">Resultado:</h3>
            <pre className="whitespace-pre-wrap overflow-auto max-h-96">
              {JSON.stringify(resultado, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}