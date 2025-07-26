'use client'

import { useState, useEffect } from 'react'

interface ResumoCustoProdutoProps {
  custoTotalProduto: number
  margemLucro: number
  nomeProduto: string
}

export default function ResumoCustoProduto({
  custoTotalProduto,
  margemLucro,
  nomeProduto
}: ResumoCustoProdutoProps) {
  // Aplicar margem de lucro: valor_com_margem = valor_total / (1 - margem_percentual/100)
  const margemDecimal = margemLucro / 100
  const valorComMargem = margemDecimal > 0 && margemDecimal < 1 
    ? custoTotalProduto / (1 - margemDecimal)
    : custoTotalProduto

  const valorMargemLucro = valorComMargem - custoTotalProduto

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
          Resumo de Custos - {nomeProduto}
        </h3>

        <div className="space-y-4">
          {/* Custo base do produto */}
          <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Custo Total do Produto
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              R$ {custoTotalProduto.toFixed(2)}
            </span>
          </div>

          {/* Margem de lucro */}
          {margemLucro > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Margem de Lucro ({margemLucro.toFixed(2)}%)
                </span>
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  R$ {valorMargemLucro.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-blue-600 dark:text-blue-300">
                  Preço com Margem
                </span>
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  R$ {valorComMargem.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Preço final */}
          <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-green-800 dark:text-green-200">
                Preço Final do Produto
              </span>
              <span className="text-lg font-bold text-green-800 dark:text-green-200">
                R$ {valorComMargem.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Fórmula aplicada */}
          {margemLucro > 0 && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Fórmula Aplicada:
              </h4>
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <div>1. Custo base do produto: R$ {custoTotalProduto.toFixed(2)}</div>
                <div>2. Com margem de lucro: R$ {custoTotalProduto.toFixed(2)} ÷ (1 - {margemLucro.toFixed(2)}%) = R$ {valorComMargem.toFixed(2)}</div>
                <div>3. Valor da margem: R$ {valorComMargem.toFixed(2)} - R$ {custoTotalProduto.toFixed(2)} = R$ {valorMargemLucro.toFixed(2)}</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}