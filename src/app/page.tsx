'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated } from '@/lib/supabase/auth'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Verifica se o usuário está autenticado e redireciona apropriadamente
    const checkAuth = async () => {
      try {
        const authenticated = await isAuthenticated()
        
        if (authenticated) {
          router.push('/dashboard')
        } else {
          router.push('/login')
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error)
        router.push('/login')
      }
    }

    checkAuth()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600 mx-auto"></div>
        <h2 className="mt-6 text-xl font-medium text-gray-700 dark:text-gray-300">
          Carregando...
        </h2>
      </div>
    </div>
  )
}
