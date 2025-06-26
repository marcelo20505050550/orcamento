'use client'

import { useState, useEffect } from 'react'
import { getCurrentUser } from '@/lib/supabase/auth'
import Link from 'next/link'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await getCurrentUser()
        setUser(currentUser)
      } catch (error) {
        console.error('Erro ao obter usuário:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  // Cards de resumo para o dashboard
  const summaryCards = [
    {
      title: 'Produtos',
      icon: (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          className="h-8 w-8"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      ),
      description: 'Gerenciar produtos e matérias-primas',
      link: '/produtos',
      color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200',
    },
    {
      title: 'Pedidos',
      icon: (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          className="h-8 w-8"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      ),
      description: 'Acompanhar e gerenciar pedidos',
      link: '/pedidos',
      color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-200',
    },
    {
      title: 'Orçamentos',
      icon: (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          className="h-8 w-8"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4 3h16a2 2 0 0 1 2 2v6a10 10 0 0 1-10 10A10 10 0 0 1 2 11V5a2 2 0 0 1 2-2z" />
          <polyline points="8 10 12 14 16 10" />
        </svg>
      ),
      description: 'Gerar e exportar orçamentos',
      link: '/orcamentos',
      color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-200',
    },
    {
      title: 'Processos',
      icon: (
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          className="h-8 w-8"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
      description: 'Gerenciar processos de fabricação',
      link: '/processos',
      color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-200',
    },
  ]

  if (loading) {
    return (
      <div className="p-4 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Bem-vindo ao Sistema de Orçamentos, {user?.user_metadata?.nome || 'Usuário'}!
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card, index) => (
          <Link 
            key={index} 
            href={card.link}
            className={`${card.color} rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow group`}
          >
            <div className="flex flex-col items-start">
              <div className="mb-3">
                {card.icon}
              </div>
              <h3 className="text-lg font-medium">{card.title}</h3>
              <p className="mt-1 text-sm opacity-90">{card.description}</p>
              <div className="mt-3 flex items-center text-sm font-medium">
                <span>Ver detalhes</span>
                <svg 
                  className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 20 20" 
                  fill="currentColor"
                >
                  <path 
                    fillRule="evenodd" 
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" 
                    clipRule="evenodd" 
                  />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Ações rápidas
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/produtos/novo"
            className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="rounded-full bg-blue-100 dark:bg-blue-900/30 p-2 mr-3">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                className="h-5 w-5 text-blue-600 dark:text-blue-400"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Cadastrar produto</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Adicionar um novo produto ou matéria-prima</p>
            </div>
          </Link>
          <Link
            href="/pedidos/novo"
            className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-2 mr-3">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                className="h-5 w-5 text-green-600 dark:text-green-400"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Criar pedido</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Iniciar um novo pedido de fabricação</p>
            </div>
          </Link>
          <Link
            href="/orcamentos/novo"
            className="flex items-center p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="rounded-full bg-purple-100 dark:bg-purple-900/30 p-2 mr-3">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                className="h-5 w-5 text-purple-600 dark:text-purple-400"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Gerar orçamento</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Criar um novo orçamento detalhado</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
} 