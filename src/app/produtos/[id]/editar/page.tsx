'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { getCurrentSession } from '@/lib/supabase/auth'

type Produto = {
  id: string
  nome: string
  descricao: string
  preco_unitario: number
  quantidade_estoque: number
  e_materia_prima: boolean
}

export default function EditarProdutoPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const produtoId = use(params).id
  const [loading, setLoading] = useState(false)
  const [loadingProduto, setLoadingProduto] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    preco_unitario: '',
    quantidade_estoque: '',
    e_materia_prima: false
  })

  // Verificar autenticação e carregar dados do produto
  useEffect(() => {
    const checkAuthAndLoadProduto = async () => {
      // Verificar autenticação
      const session = await getCurrentSession();
      if (!session) {
        console.log('Usuário não autenticado, redirecionando para login...');
        router.push('/login');
        return;
      }
      
      // Carregar dados do produto
      if (produtoId) {
        setLoadingProduto(true);
        try {
          const response = await api.get(`/api/produtos/${produtoId}`);
          if (response.error) {
            throw new Error(response.error || 'Erro ao carregar produto');
          }
          
          const produto = response.data;
          setFormData({
            nome: produto.nome || '',
            descricao: produto.descricao || '',
            preco_unitario: produto.preco_unitario?.toString() || '',
            quantidade_estoque: produto.quantidade_estoque?.toString() || '',
            e_materia_prima: produto.e_materia_prima || false
          });
        } catch (err) {
          console.error('Erro ao carregar produto:', err);
          setError(err instanceof Error ? err.message : 'Erro ao carregar produto');
        } finally {
          setLoadingProduto(false);
        }
      }
    };
    
    checkAuthAndLoadProduto();
  }, [router, produtoId]);

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
      // Verificar se o usuário está autenticado
      const session = await getCurrentSession();
      if (!session) {
        throw new Error('Usuário não autenticado. Faça login para continuar.');
      }
      
      // Convertendo strings para números onde necessário
      const produtoData = {
        ...formData,
        preco_unitario: parseFloat(formData.preco_unitario) || 0,
        quantidade_estoque: parseFloat(formData.quantidade_estoque) || 0
      }
      
      const response = await api.put(`/api/produtos/${produtoId}`, produtoData);
      
      if (response.error) {
        throw new Error(response.error || 'Erro ao atualizar produto');
      }
      
      router.push('/produtos')
    } catch (err) {
      console.error('Erro ao atualizar produto:', err);
      setError(err instanceof Error ? err.message : 'Erro ao atualizar produto')
    } finally {
      setLoading(false)
    }
  }

  if (loadingProduto) {
    return (
      <div className="container mx-auto p-6 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6" suppressHydrationWarning>
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Editar Produto</h1>
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
            Nome
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
            Preço Unitário (R$)
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="preco_unitario"
            type="text"
            name="preco_unitario"
            value={formData.preco_unitario}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="quantidade_estoque">
            Quantidade em Estoque
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
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  )
} 