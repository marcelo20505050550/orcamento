'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'

interface MargemLucroProdutoProps {
  produtoId: string
  margemLucroAtual: number
  editando: boolean
  onMargemChange?: () => void
}

export default function MargemLucroProduto({
  produtoId,
  margemLucroAtual,
  editando,
  onMargemChange
}: MargemLucroProdutoProps) {
  const [margemLucro, setMargemLucro] = useState(margemLucroAtual)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMargemLucro(margemLucroAtual)
  }, [margemLucroAtual])

  const salvarMargem = async () => {
    setLoading(true)
    setError(null)
    try {
      await api.put(`/api/produtos/${produtoId}`, {
        margem_lucro_percentual: margemLucro
      })
      onMargemChange?.()
    } catch (error) {
      console.error('Erro ao salvar margem de lucro:', error)
      setError('Erro ao salvar margem de lucro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Margem de Lucro</h3>
        {editando && (
          <button
            onClick={salvarMargem}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar Margem'}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Margem de Lucro (%)
        </label>
        <div className="mt-1">
          {editando ? (
            <input
              type="number"
              min="0"
              step="0.01"
              value={margemLucro}
              onChange={(e) => setMargemLucro(parseFloat(e.target.value) || 0)}
              className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
              placeholder="0.00"
            />
          ) : (
            <p className="text-sm text-gray-900 dark:text-white">
              {margemLucro.toFixed(2)}%
            </p>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          A margem de lucro será aplicada sobre o custo total do produto usando a fórmula: custo_total / (1 - margem%/100)
        </p>
      </div>
    </div>
  )
}