'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'

export default function NovoClientePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    nome_cliente_empresa: '',
    cnpj_cpf: '',
    nome_responsavel: '',
    telefone_whatsapp: '',
    email: '',
    endereco: '',
    bairro: '',
    cidade: '',
    estado_uf: '',
    cep: '',
    tipo_interesse: '',
    descricao_demanda: '',
    origem_contato: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Validações básicas
      if (!formData.nome_cliente_empresa.trim()) {
        throw new Error('Nome do cliente/empresa é obrigatório')
      }

      if (!formData.nome_responsavel.trim()) {
        throw new Error('Nome do responsável é obrigatório')
      }

      if (!formData.telefone_whatsapp.trim()) {
        throw new Error('Telefone/WhatsApp é obrigatório')
      }

      if (!formData.cidade.trim()) {
        throw new Error('Cidade é obrigatória')
      }

      if (!formData.estado_uf.trim()) {
        throw new Error('Estado (UF) é obrigatório')
      }

      // Envia os dados para a API
      const response = await api.post('/api/clientes', formData)

      // Redireciona para a lista de clientes
      router.push('/clientes')
    } catch (err) {
      console.error('Erro ao criar cliente:', err)
      setError(err instanceof Error ? err.message : 'Ocorreu um erro ao criar o cliente')
    } finally {
      setLoading(false)
    }
  }

  const estadosBrasil = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Novo Cliente
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Cadastre um novo cliente no sistema
          </p>
        </div>
        <Link
          href="/clientes"
          className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-700 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancelar
        </Link>
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
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Erro ao criar cliente
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
          {/* Identificação do Cliente */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Identificação do Cliente
            </h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-4">
                <label htmlFor="nome_cliente_empresa" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nome do Cliente / Empresa <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="nome_cliente_empresa"
                    id="nome_cliente_empresa"
                    required
                    value={formData.nome_cliente_empresa}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                    placeholder="Nome da empresa ou pessoa física"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="cnpj_cpf" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  CNPJ ou CPF
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="cnpj_cpf"
                    id="cnpj_cpf"
                    value={formData.cnpj_cpf}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Contato */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Contato
            </h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="nome_responsavel" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nome do Responsável <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="nome_responsavel"
                    id="nome_responsavel"
                    required
                    value={formData.nome_responsavel}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                    placeholder="Nome de quem solicita o orçamento"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="telefone_whatsapp" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Telefone / WhatsApp <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    type="tel"
                    name="telefone_whatsapp"
                    id="telefone_whatsapp"
                    required
                    value={formData.telefone_whatsapp}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  E-mail
                </label>
                <div className="mt-1">
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Localização */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Localização
            </h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-4">
                <label htmlFor="endereco" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Endereço
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="endereco"
                    id="endereco"
                    value={formData.endereco}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                    placeholder="Rua, número, complemento"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="bairro" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Bairro
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="bairro"
                    id="bairro"
                    value={formData.bairro}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                    placeholder="Nome do bairro"
                  />
                </div>
              </div>

              <div className="sm:col-span-3">
                <label htmlFor="cidade" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Cidade <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="cidade"
                    id="cidade"
                    required
                    value={formData.cidade}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                    placeholder="Nome da cidade"
                  />
                </div>
              </div>

              <div className="sm:col-span-1">
                <label htmlFor="estado_uf" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Estado (UF) <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  <select
                    name="estado_uf"
                    id="estado_uf"
                    required
                    value={formData.estado_uf}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                  >
                    <option value="">UF</option>
                    {estadosBrasil.map(estado => (
                      <option key={estado} value={estado}>{estado}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="cep" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  CEP
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="cep"
                    id="cep"
                    value={formData.cep}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                    placeholder="00000-000"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Detalhes do Orçamento */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Detalhes do Orçamento
            </h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-6">
                <label htmlFor="tipo_interesse" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tipo de Interesse
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="tipo_interesse"
                    id="tipo_interesse"
                    value={formData.tipo_interesse}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                    placeholder="Ex: Implemento Agrícola, Caldeiraria, Máquina Especial"
                  />
                </div>
              </div>

              <div className="sm:col-span-6">
                <label htmlFor="descricao_demanda" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Descrição do que precisa
                </label>
                <div className="mt-1">
                  <textarea
                    name="descricao_demanda"
                    id="descricao_demanda"
                    rows={4}
                    value={formData.descricao_demanda}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                    placeholder="Detalhe a demanda do cliente..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Campos Internos */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Campos Internos (para controle)
            </h3>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <div className="sm:col-span-6">
                <label htmlFor="origem_contato" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Origem do Contato
                </label>
                <div className="mt-1">
                  <select
                    name="origem_contato"
                    id="origem_contato"
                    value={formData.origem_contato}
                    onChange={handleChange}
                    className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md"
                  >
                    <option value="">Selecione a origem</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Indicação">Indicação</option>
                    <option value="Site">Site</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Telefone">Telefone</option>
                    <option value="E-mail">E-mail</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => router.push('/clientes')}
              className="mr-3 px-4 py-2 border border-gray-300 dark:border-gray-700 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Criando...' : 'Criar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}