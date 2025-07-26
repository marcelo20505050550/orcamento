'use client'

import { useState } from 'react'
import api from '@/lib/api'

export default function TesteCustoTotalPage() {
  const [produtoId, setProdutoId] = useState('')
  const [resultado, setResultado] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const testarCustoTotal = async () => {
    if (!produtoId.trim()) {
      setError('Digite um ID de produto')
      return
    }

    setLoading(true)
    setError(null)
    setResultado(null)

    try {
      console.log(`Testando custo total para produto: ${produtoId}`)
      const response = await api.get(`/api/produtos/${produtoId}/custo-total`)
      console.log('Resposta da API:', response)
      setResultado(response)
    } catch (err: any) {
      console.error('Erro ao testar custo total:', err)
      setError(err.response?.data?.error || err.message || 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Teste da API de Custo Total</h1>
      
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label htmlFor="produtoId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ID do Produto
            </label>
            <input
              type="text"
              id="produtoId"
              value={produtoId}
              onChange={(e) => setProdutoId(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Digite o ID do produto"
            />
          </div>
          <button
            onClick={testarCustoTotal}
            disabled={loading}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              loading
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
            }`}
          >
            {loading ? 'Testando...' : 'Testar'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-md mb-6">
          <h3 className="text-red-800 dark:text-red-200 font-medium">Erro</h3>
          <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
        </div>
      )}

      {resultado && (
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Resultado do Teste
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-2">
                Custo Total
              </h4>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                R$ {resultado.custo_total?.toFixed(2) || '0.00'}
              </p>
            </div>
            
            {resultado.detalhes && (
              <div>
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-2">
                  Detalhes
                </h4>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Tipo de Produto:</dt>
                    <dd className="text-gray-900 dark:text-white">{resultado.detalhes.tipo_produto}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Preço Unitário:</dt>
                    <dd className="text-gray-900 dark:text-white">R$ {resultado.detalhes.preco_unitario?.toFixed(2) || '0.00'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Quantidade Necessária:</dt>
                    <dd className="text-gray-900 dark:text-white">{resultado.detalhes.quantidade_necessaria || 1}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Custo Matérias-primas:</dt>
                    <dd className="text-gray-900 dark:text-white">R$ {resultado.detalhes.custo_materias_primas?.toFixed(2) || '0.00'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Custo Processos:</dt>
                    <dd className="text-gray-900 dark:text-white">R$ {resultado.detalhes.custo_processos?.toFixed(2) || '0.00'}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500 dark:text-gray-400">Custo Mão de Obra:</dt>
                    <dd className="text-gray-900 dark:text-white">R$ {resultado.detalhes.custo_mao_de_obra?.toFixed(2) || '0.00'}</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
          
          <div className="mt-6">
            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-2">
              JSON Completo
            </h4>
            <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md text-xs overflow-x-auto">
              {JSON.stringify(resultado, null, 2)}
            </pre>
          </div>
        </div>
      )}

      <div className="mt-6 text-sm text-gray-500 dark:text-gray-400">
        <p><strong>Instruções:</strong></p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li>Digite o ID de um produto para testar o cálculo de custo total</li>
          <li>Para produtos simples, o custo será: preço_unitario × quantidade_necessaria</li>
          <li>Para produtos de cálculo, o custo será: soma de (dependências + processos + mão de obra)</li>
          <li>Verifique o console do navegador para logs detalhados do cálculo</li>
        </ul>
      </div>
    </div>
  )
}