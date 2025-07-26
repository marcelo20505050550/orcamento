'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { ImpostoPedido } from '@/types'

interface TaxasPedidoProps {
  pedidoId: string
  valorFreteAtual: number
  editando: boolean
  onTaxasChange?: () => void
}

export default function TaxasPedido({
  pedidoId,
  valorFreteAtual,
  editando,
  onTaxasChange
}: TaxasPedidoProps) {
  const [impostos, setImpostos] = useState<ImpostoPedido[]>([])
  const [valorFrete, setValorFrete] = useState(valorFreteAtual)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estados para novo imposto
  const [novoImposto, setNovoImposto] = useState({
    tipo_imposto: '',
    percentual: 0
  })

  // Estados para edição de impostos
  const [editandoImposto, setEditandoImposto] = useState<string | null>(null)
  const [impostoEditado, setImpostoEditado] = useState({
    tipo_imposto: '',
    percentual: 0
  })

  useEffect(() => {
    setValorFrete(valorFreteAtual)
  }, [valorFreteAtual])

  useEffect(() => {
    fetchImpostos()
  }, [pedidoId])

  const fetchImpostos = async () => {
    try {
      const response = await api.get(`/api/pedidos/${pedidoId}/impostos`)
      if (Array.isArray(response)) {
        setImpostos(response)
      } else {
        setImpostos([])
      }
    } catch (error) {
      console.error('Erro ao buscar impostos:', error)
      setError('Erro ao carregar impostos')
    }
  }

  const salvarTaxas = async () => {
    setLoading(true)
    setError(null)
    try {
      await api.put(`/api/pedidos/${pedidoId}/taxas`, {
        valor_frete: valorFrete
      })
      onTaxasChange?.()
    } catch (error) {
      console.error('Erro ao salvar taxas:', error)
      setError('Erro ao salvar taxas')
    } finally {
      setLoading(false)
    }
  }

  const adicionarImposto = async () => {
    if (!novoImposto.tipo_imposto.trim()) {
      setError('Tipo de imposto é obrigatório')
      return
    }

    if (novoImposto.percentual < 0) {
      setError('Percentual deve ser maior ou igual a zero')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await api.post(`/api/pedidos/${pedidoId}/impostos`, novoImposto)
      setImpostos([...impostos, response])
      setNovoImposto({ tipo_imposto: '', percentual: 0 })
      onTaxasChange?.()
    } catch (error) {
      console.error('Erro ao adicionar imposto:', error)
      setError('Erro ao adicionar imposto')
    } finally {
      setLoading(false)
    }
  }

  const iniciarEdicaoImposto = (imposto: ImpostoPedido) => {
    setEditandoImposto(imposto.id)
    setImpostoEditado({
      tipo_imposto: imposto.tipo_imposto,
      percentual: imposto.percentual
    })
  }

  const salvarEdicaoImposto = async () => {
    if (!impostoEditado.tipo_imposto.trim()) {
      setError('Tipo de imposto é obrigatório')
      return
    }

    if (impostoEditado.percentual < 0) {
      setError('Percentual deve ser maior ou igual a zero')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await api.put(`/api/pedidos/impostos/${editandoImposto}`, impostoEditado)
      setImpostos(impostos.map(imp => 
        imp.id === editandoImposto ? response : imp
      ))
      setEditandoImposto(null)
      setImpostoEditado({ tipo_imposto: '', percentual: 0 })
      onTaxasChange?.()
    } catch (error) {
      console.error('Erro ao salvar imposto:', error)
      setError('Erro ao salvar imposto')
    } finally {
      setLoading(false)
    }
  }

  const cancelarEdicaoImposto = () => {
    setEditandoImposto(null)
    setImpostoEditado({ tipo_imposto: '', percentual: 0 })
    setError(null)
  }

  const excluirImposto = async (impostoId: string) => {
    if (!confirm('Tem certeza que deseja excluir este imposto?')) {
      return
    }

    setLoading(true)
    setError(null)
    try {
      await api.delete(`/api/pedidos/impostos/${impostoId}`)
      setImpostos(impostos.filter(imp => imp.id !== impostoId))
      onTaxasChange?.()
    } catch (error) {
      console.error('Erro ao excluir imposto:', error)
      setError('Erro ao excluir imposto')
    } finally {
      setLoading(false)
    }
  }

  const totalImpostos = impostos.reduce((total, imposto) => total + imposto.percentual, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Frete e Impostos</h3>
        {editando && (
          <button
            onClick={salvarTaxas}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar Frete'}
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
        {/* Valor do Frete */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Valor do Frete (R$)
          </label>
          <div className="mt-1">
            {editando ? (
              <input
                type="number"
                min="0"
                step="0.01"
                value={valorFrete}
                onChange={(e) => setValorFrete(parseFloat(e.target.value) || 0)}
                className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                placeholder="0.00"
              />
            ) : (
              <p className="text-sm text-gray-900 dark:text-white">
                R$ {valorFrete.toFixed(2)}
              </p>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Valor do frete será adicionado ao total final do pedido
          </p>
        </div>
      </div>

      {/* Seção de Impostos */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-medium text-gray-900 dark:text-white">Impostos</h4>
          {impostos.length > 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Total: {totalImpostos.toFixed(2)}%
            </p>
          )}
        </div>

        {/* Lista de impostos */}
        {impostos.length > 0 ? (
          <div className="space-y-2 mb-4">
            {impostos.map((imposto) => (
              <div key={imposto.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                {editandoImposto === imposto.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={impostoEditado.tipo_imposto}
                      onChange={(e) => setImpostoEditado({
                        ...impostoEditado,
                        tipo_imposto: e.target.value
                      })}
                      placeholder="Tipo do imposto"
                      className="flex-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white rounded-md"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={impostoEditado.percentual}
                      onChange={(e) => setImpostoEditado({
                        ...impostoEditado,
                        percentual: parseFloat(e.target.value) || 0
                      })}
                      placeholder="0.00"
                      className="w-24 shadow-sm focus:ring-blue-500 focus:border-blue-500 block sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-600 dark:text-white rounded-md"
                    />
                    <span className="flex items-center text-sm text-gray-600 dark:text-gray-400">%</span>
                    <button
                      type="button"
                      onClick={salvarEdicaoImposto}
                      disabled={loading}
                      className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 disabled:opacity-50"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={cancelarEdicaoImposto}
                      className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {imposto.tipo_imposto}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {imposto.percentual.toFixed(2)}%
                      </p>
                    </div>
                    {editando && (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => iniciarEdicaoImposto(imposto)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => excluirImposto(imposto.id)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm disabled:opacity-50"
                        >
                          Excluir
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 bg-gray-50 dark:bg-gray-700 rounded-md mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum imposto adicionado</p>
          </div>
        )}

        {/* Formulário para adicionar novo imposto */}
        {editando && (
          <div className="flex gap-2">
            <input
              type="text"
              value={novoImposto.tipo_imposto}
              onChange={(e) => setNovoImposto({
                ...novoImposto,
                tipo_imposto: e.target.value
              })}
              placeholder="Tipo do imposto (ex: ICMS, IPI, ISS)"
              className="flex-1 shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={novoImposto.percentual}
              onChange={(e) => setNovoImposto({
                ...novoImposto,
                percentual: parseFloat(e.target.value) || 0
              })}
              placeholder="0.00"
              className="w-24 shadow-sm focus:ring-blue-500 focus:border-blue-500 block sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
            />
            <span className="flex items-center text-sm text-gray-600 dark:text-gray-400">%</span>
            <button
              type="button"
              onClick={adicionarImposto}
              disabled={loading || !novoImposto.tipo_imposto.trim()}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {loading ? 'Adicionando...' : 'Adicionar'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}