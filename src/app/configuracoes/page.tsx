'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api'

type EmpresaConfig = {
  id: string
  nome_empresa: string
  cnpj: string
  inscricao_estadual: string
  endereco: string
  telefone_1: string
  telefone_2?: string
  email: string
  instagram?: string
}

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState<EmpresaConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await api.get('/api/empresa-config')
        if (response.error) {
          throw new Error(response.error)
        }
        setConfig(response.data)
      } catch (err) {
        console.error('Erro ao carregar configurações:', err)
        setError(err instanceof Error ? err.message : 'Erro ao carregar configurações')
      } finally {
        setLoading(false)
      }
    }

    fetchConfig()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!config) return

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await api.put('/api/empresa-config', config)
      if (response.error) {
        throw new Error(response.error)
      }
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error('Erro ao salvar configurações:', err)
      setError(err instanceof Error ? err.message : 'Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (field: keyof EmpresaConfig, value: string) => {
    if (!config) return
    setConfig({ ...config, [field]: value })
  }

  if (loading) {
    return (
      <div className="p-4 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Configurações da Empresa
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Gerencie as informações da sua empresa que aparecem nos orçamentos
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-md">
          <p className="text-green-800 dark:text-green-200">Configurações salvas com sucesso!</p>
        </div>
      )}

      {config && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nome da Empresa
              </label>
              <input
                type="text"
                value={config.nome_empresa}
                onChange={(e) => handleChange('nome_empresa', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                CNPJ
              </label>
              <input
                type="text"
                value={config.cnpj}
                onChange={(e) => handleChange('cnpj', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Inscrição Estadual
              </label>
              <input
                type="text"
                value={config.inscricao_estadual}
                onChange={(e) => handleChange('inscricao_estadual', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={config.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Telefone Principal
              </label>
              <input
                type="text"
                value={config.telefone_1}
                onChange={(e) => handleChange('telefone_1', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Telefone Secundário
              </label>
              <input
                type="text"
                value={config.telefone_2 || ''}
                onChange={(e) => handleChange('telefone_2', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Instagram
              </label>
              <input
                type="text"
                value={config.instagram || ''}
                onChange={(e) => handleChange('instagram', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="@usuario"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Endereço Completo
            </label>
            <textarea
              value={config.endereco}
              onChange={(e) => handleChange('endereco', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              required
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}