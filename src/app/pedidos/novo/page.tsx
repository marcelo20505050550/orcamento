'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'

type Produto = {
  id: string
  nome: string
  descricao: string
  preco_unitario: number
  quantidade_estoque: number
  e_materia_prima: boolean
}

export default function NovoPedidoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fetchingProdutos, setFetchingProdutos] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [produtos, setProdutos] = useState<Produto[]>([])
  
  const [formData, setFormData] = useState({
    produto_id: '',
    quantidade: '',
    observacoes: ''
  })

  useEffect(() => {
    const fetchProdutos = async () => {
      setFetchingProdutos(true)
      try {
        // Busca apenas produtos finais (não matérias-primas) usando o utilitário api
        const response = await api.get('/produtos', {
          params: { materiaPrima: 'false' }
        });
        
        setProdutos(response.data || [])
      } catch (err) {
        console.error('Erro ao buscar produtos:', err)
        setError('Não foi possível carregar a lista de produtos. Tente novamente mais tarde.')
      } finally {
        setFetchingProdutos(false)
      }
    }

    fetchProdutos()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    if (name === 'quantidade') {
      // Somente aceita números inteiros
      const formattedValue = value.replace(/\D/g, '')
      setFormData({
        ...formData,
        [name]: formattedValue
      })
    } else {
      setFormData({
        ...formData,
        [name]: value
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validações básicas
      if (!formData.produto_id) {
        throw new Error('Selecione um produto')
      }

      if (!formData.quantidade || parseInt(formData.quantidade) <= 0) {
        throw new Error('A quantidade deve ser maior que zero')
      }

      // Formata os dados para envio
      const pedidoData = {
        ...formData,
        quantidade: parseInt(formData.quantidade)
      }

      // Envia os dados para a API usando o utilitário api
      const response = await api.post('/pedidos', pedidoData);

      // Redireciona para a página do pedido após a criação bem-sucedida
      const pedidoId = response.data?.id;
      if (pedidoId) {
        router.push(`/pedidos/${pedidoId}?novo=true`);
      } else {
        router.push('/pedidos');
      }
    } catch (err) {
      console.error('Erro ao criar pedido:', err)
      setError(err instanceof Error ? err.message : 'Ocorreu um erro ao criar o pedido')
    } finally {
      setLoading(false)
    }
  }

  const produtoSelecionado = formData.produto_id 
    ? produtos.find(p => p.id === formData.produto_id) 
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Novo Pedido
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Crie um novo pedido de fabricação
          </p>
        </div>
        <Link
          href="/pedidos"
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-700 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancelar
        </Link>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Erro ao criar pedido
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-4">
              <label htmlFor="produto_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Produto
              </label>
              <div className="mt-1">
                {fetchingProdutos ? (
                  <div className="flex items-center">
                    <div className="animate-spin h-5 w-5 mr-3 border-t-2 border-b-2 border-blue-600 rounded-full"></div>
                    <span className="text-gray-500 dark:text-gray-400">Carregando produtos...</span>
                  </div>
                ) : (
                  <select
                    id="produto_id"
                    name="produto_id"
                    required
                    value={formData.produto_id}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                  >
                    <option value="">Selecione um produto</option>
                    {produtos.map(produto => (
                      <option key={produto.id} value={produto.id}>
                        {produto.nome}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="quantidade" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Quantidade
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="quantidade"
                  id="quantidade"
                  required
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                  placeholder="1"
                  value={formData.quantidade}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="sm:col-span-6">
              <label htmlFor="observacoes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Observações
              </label>
              <div className="mt-1">
                <textarea
                  id="observacoes"
                  name="observacoes"
                  rows={3}
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                  placeholder="Observações adicionais sobre o pedido"
                  value={formData.observacoes}
                  onChange={handleChange}
                />
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Adicione informações relevantes sobre o pedido, como especificações especiais ou prazos.
              </p>
            </div>
          </div>

          {produtoSelecionado && (
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">Detalhes do Produto</h3>
              <div className="mt-2 grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-300">Preço Unitário</p>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produtoSelecionado.preco_unitario)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-300">Estoque Disponível</p>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {produtoSelecionado.quantidade_estoque} unidades
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-blue-700 dark:text-blue-300">Descrição</p>
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    {produtoSelecionado.descricao}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => router.push('/pedidos')}
              className="mr-3 px-4 py-2 border border-gray-300 dark:border-gray-700 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || fetchingProdutos}
              className="inline-flex justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Criando...' : 'Criar Pedido'}
            </button>
          </div>
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            <p>Após criar o pedido, você poderá adicionar processos de fabricação e mão de obra necessários.</p>
          </div>
        </form>
      </div>
    </div>
  )
} 