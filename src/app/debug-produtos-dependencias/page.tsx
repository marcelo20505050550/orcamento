'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'

type Produto = {
    id: string
    nome: string
    e_materia_prima: boolean
    preco_unitario?: number
}

export default function DebugProdutosDependenciasPage() {
    const [produtos, setProdutos] = useState<Produto[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [logs, setLogs] = useState<string[]>([])

    const addLog = (message: string) => {
        const timestamp = new Date().toLocaleTimeString()
        setLogs(prev => [...prev, `[${timestamp}] ${message}`])
        console.log(`[DEBUG] ${message}`)
    }

    const testarAPI = async () => {
        setLoading(true)
        setError(null)
        setProdutos([])
        setLogs([])

        try {
            addLog('🔍 Iniciando teste da API de produtos...')

            // Teste 1: Verificar autenticação
            addLog('🔐 Verificando autenticação...')
            const { data: { session } } = await (await import('@/lib/supabase/client')).default.auth.getSession()
            addLog(`🔐 Status da sessão: ${session ? 'Autenticado' : 'Não autenticado'}`)
            addLog(`🔐 Token presente: ${session?.access_token ? 'Sim' : 'Não'}`)
            addLog(`🔐 Email do usuário: ${session?.user?.email || 'N/A'}`)

            if (!session) {
                throw new Error('Usuário não está autenticado')
            }

            // Teste 2: Chamar API com pageSize grande
            addLog('📡 Fazendo requisição para /api/produtos?pageSize=1000')
            const response = await api.get('/api/produtos?pageSize=1000')
            addLog(`📦 Resposta recebida: ${JSON.stringify(response, null, 2)}`)

            // Teste 3: Verificar estrutura da resposta
            addLog('📊 Analisando estrutura da resposta...')
            addLog(`📊 Tipo da resposta: ${typeof response}`)
            addLog(`📊 Chaves da resposta: ${response ? Object.keys(response).join(', ') : 'N/A'}`)

            // Teste 4: Extrair produtos
            let produtosExtraidos: Produto[] = []

            if (response?.data) {
                produtosExtraidos = response.data
                addLog(`✅ Produtos encontrados em response.data: ${produtosExtraidos.length}`)
            } else if (Array.isArray(response)) {
                produtosExtraidos = response
                addLog(`✅ Produtos encontrados como array direto: ${produtosExtraidos.length}`)
            } else {
                addLog(`❌ Estrutura de resposta não reconhecida`)
            }

            // Teste 5: Filtrar produtos disponíveis (excluir o produto atual)
            const produtoAtualId = '6e53efc7-0ab1-4aab-9c37-e81007533034'
            const produtosDisponiveis = produtosExtraidos.filter(p => p.id !== produtoAtualId)
            addLog(`🔍 Produtos disponíveis (excluindo produto atual): ${produtosDisponiveis.length}`)

            setProdutos(produtosDisponiveis)
            addLog(`✅ Teste concluído com sucesso!`)

        } catch (err: any) {
            const errorMessage = err.message || 'Erro desconhecido'
            addLog(`❌ Erro: ${errorMessage}`)
            setError(errorMessage)
            console.error('Erro no teste:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-6 space-y-6">
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    Debug: Produtos para Dependências
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Esta página testa o carregamento de produtos para o formulário de dependências.
                </p>

                <button
                    onClick={testarAPI}
                    disabled={loading}
                    className={`px-4 py-2 rounded-md text-white font-medium ${loading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                >
                    {loading ? 'Testando...' : 'Testar API de Produtos'}
                </button>
            </div>

            {/* Logs */}
            {logs.length > 0 && (
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
                    <h3 className="text-white font-bold mb-2">Logs de Debug:</h3>
                    <div className="space-y-1 max-h-96 overflow-y-auto">
                        {logs.map((log, index) => (
                            <div key={index}>{log}</div>
                        ))}
                    </div>
                </div>
            )}

            {/* Erro */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-md">
                    <h3 className="text-red-800 dark:text-red-200 font-medium">Erro:</h3>
                    <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
                </div>
            )}

            {/* Produtos carregados */}
            {produtos.length > 0 && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Produtos Carregados ({produtos.length})
                    </h3>
                    <div className="space-y-2">
                        {produtos.map((produto) => (
                            <div
                                key={produto.id}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md"
                            >
                                <div>
                                    <span className="font-medium text-gray-900 dark:text-white">
                                        {produto.nome}
                                    </span>
                                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${produto.e_materia_prima
                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                                        }`}>
                                        {produto.e_materia_prima ? 'Matéria-prima' : 'Produto'}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    ID: {produto.id.substring(0, 8)}...
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Simulação do select */}
            {produtos.length > 0 && (
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Simulação do Select de Produtos
                    </h3>
                    <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                        <option value="">Selecione um produto</option>
                        {produtos.map((produto) => (
                            <option key={produto.id} value={produto.id}>
                                {produto.nome} {produto.e_materia_prima ? '(Matéria-prima)' : '(Produto)'}
                            </option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    )
}