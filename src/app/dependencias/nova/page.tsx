'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'

type Produto = {
  id: string
  nome: string
  e_materia_prima: boolean
}

export default function NovaDependenciaPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingProdutos, setLoadingProdutos] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [produtos, setProdutos] = useState<Produto[]>([])
  
  const [formData, setFormData] = useState({
    produto_pai_id: '',
    produto_filho_id: '',
    quantidade_necessaria: ''
  })

  // Buscar lista de produtos
  useEffect(() => {
    const fetchProdutos = async () => {
      setLoadingProdutos(true)
      try {
        const response = await api.get('/produtos')
        setProdutos(response.data || [])
      } catch (err) {
        console.error('Erro ao buscar produtos:', err)
        setError('Não foi possível carregar a lista de produtos.')
      } finally {
        setLoadingProdutos(false)
      }
    }

    fetchProdutos()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    
    if (name === 'quantidade_necessaria') {
      // Permitir apenas números e ponto decimal
      const formattedValue = value.replace(/[^\d.]/g, '')
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
      if (!formData.produto_pai_id) {
        throw new Error('Selecione o produto principal')
      }

      if (!formData.produto_filho_id) {
        throw new Error('Selecione o componente necessário')
      }

      if (formData.produto_pai_id === formData.produto_filho_id) {
        throw new Error('Um produto não pode depender de si mesmo')
      }

      if (!formData.quantidade_necessaria || parseFloat(formData.quantidade_necessaria) <= 0) {
        throw new Error('A quantidade necessária deve ser maior que zero')
      }

      // Formata os dados para envio
      const dependenciaData = {
        produto_pai_id: formData.produto_pai_id,
        produto_filho_id: formData.produto_filho_id,
        quantidade_necessaria: parseFloat(formData.quantidade_necessaria)
      }

      // Envia os dados para a API
      const response = await api.post('/dependencias', dependenciaData)

      if (!response.data) {
        throw new Error('Erro ao cadastrar dependência')
      }

      // Redireciona para a lista de dependências após o cadastro bem-sucedido
      router.push('/dependencias')
    } catch (err) {
      console.error('Erro ao cadastrar dependência:', err)
      setError(err instanceof Error ? err.message : 'Ocorreu um erro ao cadastrar a dependência')
    } finally {
      setLoading(false)
    }
  }

  // Filtrar produtos para evitar dependências circulares
  const produtosPai = produtos.filter(p => !p.e_materia_prima)
  const produtosFilho = produtos.filter(p => p.id !== formData.produto_pai_id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Nova Dependência
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Cadastre uma nova relação de dependência entre produtos
          </p>
        </div>
        <Link
          href="/dependencias"
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
                Erro ao cadastrar dependência
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
          {loadingProdutos ? (
            <div className="text-center py-4">
              <div className="animate-spin inline-block w-6 h-6 border-t-2 border-b-2 border-blue-600 rounded-full"></div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Carregando produtos...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="produto_pai_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Produto
                </label>
                <div className="mt-1">
                  <select
                    id="produto_pai_id"
                    name="produto_pai_id"
                    required
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                    value={formData.produto_pai_id}
                    onChange={handleChange}
                  >
                    <option value="">Selecione um produto</option>
                    {produtosPai.map(produto => (
                      <option key={produto.id} value={produto.id}>
                        {produto.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Selecione o produto principal
                </p>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="produto_filho_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Componente Necessário
                </label>
                <div className="mt-1">
                  <select
                    id="produto_filho_id"
                    name="produto_filho_id"
                    required
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                    value={formData.produto_filho_id}
                    onChange={handleChange}
                    disabled={!formData.produto_pai_id}
                  >
                    <option value="">Selecione um componente</option>
                    {produtosFilho.map(produto => (
                      <option key={produto.id} value={produto.id}>
                        {produto.nome} {produto.e_materia_prima ? '(Matéria-prima)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Selecione o componente ou matéria-prima necessária
                </p>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="quantidade_necessaria" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Quantidade Necessária
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="quantidade_necessaria"
                    id="quantidade_necessaria"
                    required
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                    placeholder="0"
                    value={formData.quantidade_necessaria}
                    onChange={handleChange}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Quantidade necessária por unidade do produto
                </p>
              </div>
            </div>
          )}

          <div className="pt-5 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-end">
              <Link
                href="/dependencias"
                className="bg-white dark:bg-gray-800 py-2 px-4 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={loading || loadingProdutos}
                className={`ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  (loading || loadingProdutos) ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
} 