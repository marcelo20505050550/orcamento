'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'
import { ImpostoPedido } from '@/types'

interface ResumoPedidoProps {
  pedidoId: string
  produtosSelecionados: Array<{
    id: string
    nome: string
    custoTotal: number
    custoComMargem?: number
    quantidade: number
  }>
  valorFrete: number
}

export default function ResumoPedido({
  pedidoId,
  produtosSelecionados,
  valorFrete
}: ResumoPedidoProps) {
  const [impostos, setImpostos] = useState<ImpostoPedido[]>([])
  const [produtosComMargem, setProdutosComMargem] = useState(produtosSelecionados)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchImpostos()
    fetchCustosComMargem()
  }, [pedidoId, produtosSelecionados])

  useEffect(() => {
    setProdutosComMargem(produtosSelecionados)
  }, [produtosSelecionados])

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
      setImpostos([])
    } finally {
      setLoading(false)
    }
  }

  const fetchCustosComMargem = async () => {
    // Buscar o custo com margem de cada produto
    const custosComMargem = await Promise.all(
      produtosSelecionados.map(async (produto) => {
        try {
          const response = await api.get(`/api/produtos/${produto.id}/custo-com-margem`)
          return {
            ...produto,
            custoComMargem: response.custo_com_margem || produto.custoTotal
          }
        } catch (error) {
          console.error(`Erro ao buscar custo com margem do produto ${produto.id}:`, error)
          return {
            ...produto,
            custoComMargem: produto.custoTotal
          }
        }
      })
    )
    
    // Atualizar o estado com os custos com margem
    setProdutosComMargem(custosComMargem)
  }

  // Cálculo do valor total dos produtos (já com margem aplicada individualmente)
  const valorTotalProdutos = produtosComMargem.reduce((total, produto) => {
    const custoUsar = produto.custoComMargem || produto.custoTotal
    return total + (custoUsar * produto.quantidade)
  }, 0)

  // Aplicar impostos sequencialmente sobre o valor total dos produtos
  let valorComImpostos = valorTotalProdutos
  const detalhesImpostos: Array<{
    tipo: string
    percentual: number
    valorAnterior: number
    valorImposto: number
    valorFinal: number
  }> = []

  impostos.forEach(imposto => {
    const impostoDecimal = imposto.percentual / 100
    const valorAnterior = valorComImpostos
    const valorImposto = valorAnterior * impostoDecimal / (1 - impostoDecimal)
    valorComImpostos = valorAnterior + valorImposto

    detalhesImpostos.push({
      tipo: imposto.tipo_imposto,
      percentual: imposto.percentual,
      valorAnterior,
      valorImposto,
      valorFinal: valorComImpostos
    })
  })

  // Valor final com frete
  const valorFinal = valorComImpostos + valorFrete

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
          Resumo Financeiro
        </h3>

        <div className="space-y-4">
          {/* Valor base dos produtos */}
          <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Subtotal dos Produtos (com margem individual)
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              R$ {valorTotalProdutos.toFixed(2)}
            </span>
          </div>

          {/* Impostos aplicados sequencialmente */}
          {detalhesImpostos.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Impostos Aplicados:
              </h4>
              {detalhesImpostos.map((detalhe, index) => (
                <div key={index} className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      {detalhe.tipo} ({detalhe.percentual.toFixed(2)}%)
                    </span>
                    <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      R$ {detalhe.valorImposto.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-yellow-600 dark:text-yellow-300">
                      Sobre: R$ {detalhe.valorAnterior.toFixed(2)}
                    </span>
                    <span className="text-yellow-600 dark:text-yellow-300">
                      Total: R$ {detalhe.valorFinal.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Frete */}
          {valorFrete > 0 && (
            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Frete
              </span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                R$ {valorFrete.toFixed(2)}
              </span>
            </div>
          )}

          {/* Valor final */}
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-green-800 dark:text-green-200">
                Valor Total Final
              </span>
              <span className="text-lg font-bold text-green-800 dark:text-green-200">
                R$ {valorFinal.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Resumo dos cálculos */}
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Fórmula Aplicada:
            </h4>
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <div>1. Subtotal dos produtos (com margem individual): R$ {valorTotalProdutos.toFixed(2)}</div>
              {detalhesImpostos.map((detalhe, index) => (
                <div key={index}>
                  {index + 2}. Com {detalhe.tipo}: R$ {detalhe.valorAnterior.toFixed(2)} ÷ (1 - {detalhe.percentual.toFixed(2)}%) = R$ {detalhe.valorFinal.toFixed(2)}
                </div>
              ))}
              {valorFrete > 0 && (
                <div>{2 + detalhesImpostos.length}. + Frete: R$ {valorComImpostos.toFixed(2)} + R$ {valorFrete.toFixed(2)} = R$ {valorFinal.toFixed(2)}</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}