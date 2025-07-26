'use client'

import { useState } from 'react'

export default function TestCustoDebugPage() {
  const [resultado, setResultado] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testarCusto = async () => {
    setLoading(true)
    setResultado(null)
    
    try {
      // Produto para fim de teste
      const produtoId = 'd2741507-c416-4cf5-801a-88dccf0fbe7a'
      
      console.log('Testando custo para produto:', produtoId)
      
      const response = await fetch(`/api/produtos/${produtoId}/custo-total`)
      const data = await response.json()
      
      console.log('Resposta da API:', data)
      setResultado(data)
      
    } catch (error) {
      console.error('Erro ao buscar custo:', error)
      setResultado({ error: error.toString() })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Debug - Cálculo de Custos</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Testar Produto "Produto para fim de teste"</h2>
        
        <button
          onClick={testarCusto}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Calculando...' : 'Calcular Custo'}
        </button>

        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Este teste irá calcular o custo do produto "Produto para fim de teste" e mostrar logs detalhados no console.
        </p>
      </div>

      {resultado && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Resultado</h2>
          
          {resultado.error ? (
            <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg">
              <p className="text-red-700 dark:text-red-300">Erro: {resultado.error}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
                <h4 className="font-medium text-green-700 dark:text-green-300 mb-2">
                  Custo Total
                </h4>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  R$ {resultado.custo_total?.toFixed(2) || '0.00'}
                </p>
              </div>

              {resultado.detalhes && (
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <h4 className="font-medium mb-3">Detalhamento dos Custos</h4>
                  <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">Matérias-primas:</dt>
                      <dd className="text-gray-900 dark:text-white font-semibold">
                        R$ {resultado.detalhes.custo_materias_primas?.toFixed(2) || '0.00'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">Processos:</dt>
                      <dd className="text-gray-900 dark:text-white font-semibold">
                        R$ {resultado.detalhes.custo_processos?.toFixed(2) || '0.00'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">Mão de Obra:</dt>
                      <dd className="text-gray-900 dark:text-white font-semibold">
                        R$ {resultado.detalhes.custo_mao_de_obra?.toFixed(2) || '0.00'}
                      </dd>
                    </div>
                  </dl>
                  
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Fonte:</strong> {resultado.detalhes.fonte || 'desconhecida'}
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Tipo:</strong> {resultado.detalhes.tipo_produto || 'desconhecido'}
                    </p>
                  </div>
                </div>
              )}
              
              <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-700 dark:text-yellow-300 mb-2">
                  JSON Completo
                </h4>
                <pre className="text-xs text-yellow-800 dark:text-yellow-200 overflow-x-auto">
                  {JSON.stringify(resultado, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}