'use client'

import { useState } from 'react'
import api from '@/lib/api'

export default function TestCustosSalvosPage() {
    const [produtoId, setProdutoId] = useState('d2741507-c416-4cf5-801a-88dccf0fbe7a')
    const [resultado, setResultado] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    const testarCusto = async () => {
        if (!produtoId.trim()) {
            alert('Digite um ID de produto')
            return
        }

        setLoading(true)
        setResultado(null)

        try {
            console.log(`Buscando custo para produto: ${produtoId}`)

            const response = await api.get(`/api/produtos/${produtoId}/custo-total`)
            setResultado(response)

            console.log('Resposta da API:', response)

        } catch (error) {
            console.error('Erro ao buscar custo:', error)
            alert(`Erro: ${error}`)
        } finally {
            setLoading(false)
        }
    }

    const forcarRecalculo = async () => {
        if (!produtoId.trim()) {
            alert('Digite um ID de produto')
            return
        }

        setLoading(true)

        try {
            console.log(`Forçando recálculo para produto: ${produtoId}`)

            const response = await api.post(`/api/produtos/${produtoId}/recalcular-custo`)

            console.log('Recálculo concluído:', response)

            // Buscar novamente os custos
            await testarCusto()

        } catch (error) {
            console.error('Erro ao forçar recálculo:', error)
            alert(`Erro no recálculo: ${error}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Teste - Custos Salvos no Banco</h1>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Testar Custos Salvos</h2>

                <div className="flex gap-4 mb-4">
                    <input
                        type="text"
                        placeholder="ID do Produto"
                        value={produtoId}
                        onChange={(e) => setProdutoId(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <button
                        onClick={testarCusto}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Carregando...' : 'Buscar Custo'}
                    </button>
                    <button
                        onClick={forcarRecalculo}
                        disabled={loading}
                        className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                    >
                        Forçar Recálculo
                    </button>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Os custos agora são salvos diretamente na tabela produtos.
                    ID padrão: d2741507-c416-4cf5-801a-88dccf0fbe7a (Produto para fim de teste)
                </p>
            </div>

            {resultado && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                    <h2 className="text-lg font-semibold mb-4">Resultado - Custos Salvos</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
                            <h4 className="font-medium text-green-700 dark:text-green-300 mb-2">
                                Custo Total
                            </h4>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                R$ {resultado.custo_total?.toFixed(2) || '0.00'}
                            </p>
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                            <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">
                                Fonte dos Dados
                            </h4>
                            <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                                🗄️ {resultado.detalhes?.fonte || 'Desconhecida'}
                            </p>
                        </div>
                    </div>

                    {resultado.detalhes && (
                        <div className="space-y-4">
                            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                                <h4 className="font-medium mb-3">Detalhamento dos Custos (Salvos no Banco)</h4>
                                <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <dt className="text-gray-500 dark:text-gray-400">Matérias-primas:</dt>
                                        <dd className="text-gray-900 dark:text-white font-semibold text-lg">
                                            R$ {resultado.detalhes.custo_materias_primas?.toFixed(2) || '0.00'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500 dark:text-gray-400">Processos:</dt>
                                        <dd className="text-gray-900 dark:text-white font-semibold text-lg">
                                            R$ {resultado.detalhes.custo_processos?.toFixed(2) || '0.00'}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500 dark:text-gray-400">Mão de Obra:</dt>
                                        <dd className="text-gray-900 dark:text-white font-semibold text-lg">
                                            R$ {resultado.detalhes.custo_mao_de_obra?.toFixed(2) || '0.00'}
                                        </dd>
                                    </div>
                                </dl>
                            </div>

                            <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg">
                                <h4 className="font-medium text-yellow-700 dark:text-yellow-300 mb-2">
                                    Informações Adicionais
                                </h4>
                                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <dt className="text-gray-500 dark:text-gray-400">Tipo do Produto:</dt>
                                        <dd className="text-gray-900 dark:text-white">{resultado.detalhes.tipo_produto}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-gray-500 dark:text-gray-400">Último Cálculo:</dt>
                                        <dd className="text-gray-900 dark:text-white">
                                            {resultado.detalhes.data_ultimo_calculo
                                                ? new Date(resultado.detalhes.data_ultimo_calculo).toLocaleString('pt-BR')
                                                : 'Nunca calculado'
                                            }
                                        </dd>
                                    </div>
                                </dl>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
                <h3 className="font-medium text-green-700 dark:text-green-300 mb-2">
                    ✅ Problema Resolvido!
                </h3>
                <p className="text-green-600 dark:text-green-400 text-sm">
                    O campo <code>custo_materias_primas</code> agora mostra <strong>R$ 518,00</strong> em vez de R$ 0,00.
                    Os cálculos são salvos diretamente na tabela produtos e atualizados automaticamente via triggers.
                </p>
            </div>
        </div>
    )
}