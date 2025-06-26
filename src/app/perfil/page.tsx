'use client'

import { useState, useEffect } from 'react'
import supabase from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

type Profile = {
  id: string
  nome: string
  empresa: string | null
  cargo: string | null
  telefone: string | null
  avatar_url: string | null
}

export default function PerfilPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const router = useRouter()

  // Formulário
  const [nome, setNome] = useState('')
  const [empresa, setEmpresa] = useState('')
  const [cargo, setCargo] = useState('')
  const [telefone, setTelefone] = useState('')

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      setError(null)

      try {
        // Verificar se o usuário está autenticado
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          router.push('/login')
          return
        }

        // Buscar o perfil do usuário
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (error) {
          throw error
        }

        if (data) {
          setProfile(data)
          setNome(data.nome || '')
          setEmpresa(data.empresa || '')
          setCargo(data.cargo || '')
          setTelefone(data.telefone || '')
        }
      } catch (err) {
        console.error('Erro ao buscar perfil:', err)
        setError('Não foi possível carregar os dados do perfil. Tente novamente mais tarde.')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/login')
        return
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          nome,
          empresa,
          cargo,
          telefone,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.user.id)

      if (error) {
        throw error
      }

      setSuccessMessage('Perfil atualizado com sucesso!')
      
      // Atualizar o perfil local
      setProfile({
        ...profile!,
        nome,
        empresa,
        cargo,
        telefone
      })
    } catch (err) {
      console.error('Erro ao atualizar perfil:', err)
      setError('Não foi possível atualizar o perfil. Tente novamente mais tarde.')
    } finally {
      setSaving(false)
      
      // Limpar mensagem de sucesso após 3 segundos
      if (successMessage) {
        setTimeout(() => {
          setSuccessMessage(null)
        }, 3000)
      }
    }
  }

  if (loading) {
    return (
      <div className="p-4 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto" suppressHydrationWarning>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Meu Perfil
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Atualize suas informações pessoais
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-md">
            <h2 className="text-red-800 dark:text-red-200 font-medium">Erro</h2>
            <p className="text-red-700 dark:text-red-300 mt-1">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-md">
            <h2 className="text-green-800 dark:text-green-200 font-medium">Sucesso</h2>
            <p className="text-green-700 dark:text-green-300 mt-1">{successMessage}</p>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6" suppressHydrationWarning>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <div className="mt-1">
                <input
                  type="email"
                  id="email"
                  className="shadow-sm bg-gray-100 dark:bg-gray-700 focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 rounded-md py-2 px-3 cursor-not-allowed"
                  value={profile?.id}
                  disabled
                  readOnly
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  O email não pode ser alterado
                </p>
              </div>
            </div>

            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nome Completo *
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="nome"
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md py-2 px-3"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="empresa" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Empresa
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="empresa"
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md py-2 px-3"
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="cargo" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Cargo / Função
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  id="cargo"
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md py-2 px-3"
                  value={cargo}
                  onChange={(e) => setCargo(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label htmlFor="telefone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Telefone
              </label>
              <div className="mt-1">
                <input
                  type="tel"
                  id="telefone"
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md py-2 px-3"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Salvando...
                  </>
                ) : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 