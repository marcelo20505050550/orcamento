'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { getCurrentSession } from '@/lib/supabase/auth'

export default function NovoProdutoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    preco_unitario: '',
    quantidade_estoque: '',
    e_materia_prima: false
  })

  // Verificar autenticação
  useEffect(() => {
    const checkAuth = async () => {
      const session = await getCurrentSession();
      console.log('Estado da sessão:', session ? 'Autenticado' : 'Não autenticado');
      if (!session) {
        console.log('Usuário não autenticado, redirecionando para login...');
        router.push('/login');
      }
    };
    
    checkAuth();
  }, [router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement
      setFormData({
        ...formData,
        [name]: target.checked
      })
    } else if (name === 'preco_unitario' || name === 'quantidade_estoque') {
      // Remove todos os caracteres não numéricos, exceto ponto decimal
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      // Log para debug
      console.log('Enviando dados do produto:', formData);
      
      // Verificar se o usuário está autenticado
      const session = await getCurrentSession();
      console.log('Status da autenticação antes do envio:', session ? 'Autenticado' : 'Não autenticado');
      
      if (!session) {
        throw new Error('Usuário não autenticado. Faça login para continuar.');
      }
      
      // Convertendo strings para números onde necessário
      const produtoData = {
        ...formData,
        preco_unitario: formData.preco_unitario ? parseFloat(formData.preco_unitario) : 0,
        quantidade_estoque: parseFloat(formData.quantidade_estoque) || 0
      }
      
      const response = await api.post('/produtos', produtoData);
      console.log('Resposta da API:', response);
      
      router.push('/produtos')
    } catch (err) {
      console.error('Erro ao cadastrar produto:', err);
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar produto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Novo Produto</h1>
        <Link href="/produtos" className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">
          Voltar
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="nome">
            Nome<span className="text-red-500 ml-1">*</span>
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="nome"
            type="text"
            name="nome"
            value={formData.nome}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="descricao">
            Descrição
          </label>
          <textarea
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="descricao"
            name="descricao"
            value={formData.descricao}
            onChange={handleChange}
            rows={3}
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="preco_unitario">
            Preço Unitário (R$){formData.e_materia_prima && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="preco_unitario"
            type="text"
            name="preco_unitario"
            value={formData.preco_unitario}
            onChange={handleChange}
            required={formData.e_materia_prima}
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="quantidade_estoque">
            Estoque Inicial
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="quantidade_estoque"
            type="text"
            name="quantidade_estoque"
            value={formData.quantidade_estoque}
            onChange={handleChange}
          />
        </div>
        
        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              name="e_materia_prima"
              checked={formData.e_materia_prima}
              onChange={handleChange}
              className="mr-2"
            />
            <span className="text-gray-700 text-sm font-bold">É matéria-prima?</span>
          </label>
        </div>
        
        <div className="flex items-center justify-between">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <span className="text-red-500">*</span> Campos obrigatórios
        </div>
      </form>
    </div>
  )
} 