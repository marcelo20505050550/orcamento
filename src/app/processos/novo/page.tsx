'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'

export default function NovoProcessoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    nome: '',
    preco_por_unidade: '',
    tempo_estimado_minutos: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    if (name === 'preco_por_unidade') {
      // Remove todos os caracteres não numéricos, exceto ponto decimal
      const formattedValue = value.replace(/[^\d.]/g, '')
      setFormData({
        ...formData,
        [name]: formattedValue
      })
    } else if (name === 'tempo_estimado_minutos') {
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
      if (!formData.nome.trim()) {
        throw new Error('Nome do processo é obrigatório')
      }

      if (!formData.preco_por_unidade || parseFloat(formData.preco_por_unidade) < 0) {
        throw new Error('Preço por unidade deve ser um valor válido (maior ou igual a zero)')
      }

      if (!formData.tempo_estimado_minutos || parseInt(formData.tempo_estimado_minutos) <= 0) {
        throw new Error('Tempo estimado deve ser maior que zero')
      }

      // Formata os dados para envio
      const processoData = {
        nome: formData.nome,
        preco_por_unidade: parseFloat(formData.preco_por_unidade),
        tempo_estimado_minutos: parseInt(formData.tempo_estimado_minutos) * 60 // Converte horas para minutos
      }

      // Envia os dados para a API
      const response = await api.post('/processos', processoData)

      if (!response.data) {
        throw new Error('Erro ao cadastrar processo')
      }

      // Redireciona para a lista de processos após o cadastro bem-sucedido
      router.push('/processos')
    } catch (err) {
      console.error('Erro ao cadastrar processo:', err)
      setError(err instanceof Error ? err.message : 'Ocorreu um erro ao cadastrar o processo')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Novo Processo de Fabricação
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Cadastre um novo processo utilizado na fabricação dos produtos
          </p>
        </div>
        <Link
          href="/processos"
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
                Erro ao cadastrar processo
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
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nome do Processo
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="nome"
                  id="nome"
                  required
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                  value={formData.nome}
                  onChange={handleChange}
                />
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Ex: Usinagem, Corte e Dobra, Pintura, etc.
              </p>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="preco_por_unidade" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Preço por Hora (R$)
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 dark:text-gray-400 sm:text-sm">R$</span>
                </div>
                <input
                  type="text"
                  name="preco_por_unidade"
                  id="preco_por_unidade"
                  required
                  className="pl-8 focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                  placeholder="0.00"
                  value={formData.preco_por_unidade}
                  onChange={handleChange}
                />
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Custo por hora de trabalho
              </p>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="tempo_estimado_minutos" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Tempo Estimado (horas)
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="tempo_estimado_minutos"
                  id="tempo_estimado_minutos"
                  required
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                  placeholder="0"
                  value={formData.tempo_estimado_minutos}
                  onChange={handleChange}
                />
              </div>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Tempo estimado em horas por unidade
              </p>
            </div>
          </div>

          <div className="pt-5 border-t border-gray-200 dark:border-gray-700">
            <div className="flex justify-end">
              <Link
                href="/processos"
                className="bg-white dark:bg-gray-800 py-2 px-4 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={loading}
                className={`ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
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