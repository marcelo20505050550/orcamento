'use client'

import { useState } from 'react'
import { buscarProdutosHierarchiaDebug } from '@/utils/produtoHierarchyDebug'

export default function DebugProdutosPage() {
  const [resultado, setResultado] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testarFuncao = async () => {
    setLoading(true)
    try {
      const result = await buscarProdutosHierarchiaDebug()
      setResultado(result)
      console.log('Resultado completo:', result)
    } catch (error) {
      console.error('Erro no teste:', error)
      setResultado({
        produtos: [],
        debug: {
          erro: error instanceof Error ? error.message : 'Erro desconhecido'
        }
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">🔍 Debug - Carregamento de Produtos</h1>
      
      <div className="space-y-4">
        <button
          onClick={testarFuncao}
          disabled={loading}
          className="bg-blue-500 text-white px-6 py-3 rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? 'Testando...' : '🧪 Testar Carregamento de Produtos'}
        </button>
        
        {resultado && (
          <div className="space-y-4">
            {/* Resumo */}
            <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-green-800 mb-2">📊 Resumo</h2>
              <p><strong>Produtos encontrados:</strong> {resultado.produtos?.length || 0}</p>
              <p><strong>Tentativas realizadas:</strong> {resultado.debug?.tentativas?.length || 0}</p>
              <p><strong>Erros encontrados:</strong> {resultado.debug?.erros?.length || 0}</p>
            </div>
            
            {/* Produtos */}
            {resultado.produtos && resultado.produtos.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <h2 className="text-lg font-semibold text-blue-800 mb-2">📦 Produtos Carregados</h2>
                <div className="space-y-2">
                  {resultado.produtos.map((produto: any) => (
                    <div key={produto.id} className="bg-white p-2 rounded border">
                      <p><strong>{produto.nome}</strong></p>
                      <p className="text-sm text-gray-600">
                        ID: {produto.id} | 
                        Preço: R$ {produto.preco_unitario} | 
                        Estoque: {produto.quantidade_estoque} |
                        {produto.e_materia_prima ? ' Matéria-prima' : ' Produto final'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Debug Info */}
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-gray-800 mb-2">🔧 Informações de Debug</h2>
              <pre className="text-xs bg-white p-4 rounded border overflow-x-auto">
                {JSON.stringify(resultado.debug, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
      
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
        <h2 className="text-lg font-semibold text-yellow-800 mb-2">💡 Instruções</h2>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Clique no botão "Testar Carregamento de Produtos"</li>
          <li>Verifique o resumo para ver quantos produtos foram encontrados</li>
          <li>Se nenhum produto foi encontrado, verifique as informações de debug</li>
          <li>Verifique se você está logado (sessão deve ter token válido)</li>
          <li>Se ainda houver problemas, verifique as variáveis de ambiente conforme env.md</li>
        </ol>
      </div>
    </div>
  )
}