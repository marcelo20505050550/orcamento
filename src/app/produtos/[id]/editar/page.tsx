'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import api from '@/lib/api'
import { getCurrentSession } from '@/lib/supabase/auth'

interface Produto {
  id: string
  nome: string
  descricao: string
  preco_unitario: number
  quantidade_estoque: number
  e_materia_prima: boolean
}

interface Dependencia {
  id: string
  produto_pai_id: string
  produto_filho_id: string
  quantidade_necessaria: number
  produto_pai?: Produto
}

export default function EditarProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const produtoId = use(params).id
  const [loading, setLoading] = useState(false)
  const [loadingProduto, setLoadingProduto] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loadingProdutos, setLoadingProdutos] = useState(false)
  const [dependenciaAtual, setDependenciaAtual] = useState<Dependencia | null>(null)
  
  const [formData, setFormData] = useState({
    nome: '',
    codigo_produto: '',
    descricao: '',
    preco_unitario: '',
    quantidade_necessaria: '',
    e_materia_prima: false,
    tipo_produto: 'simples' as 'simples' | 'calculo',
    produto_pai_id: ''
  })

  // Verificar autenticação e carregar dados do produto
  useEffect(() => {
    const checkAuthAndLoadProduto = async () => {
      // Verificar autenticação
      const session = await getCurrentSession();
      if (!session) {
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
            codigo_produto: produto.codigo_produto || '',
            descricao: produto.descricao || '',
            preco_unitario: produto.preco_unitario?.toString() || '',
            quantidade_necessaria: produto.quantidade_necessaria?.toString() || '',
            e_materia_prima: produto.e_materia_prima || false,
            tipo_produto: produto.tipo_produto || 'calculo',
            produto_pai_id: ''
          });

          // Se é matéria-prima, buscar dependências existentes
          if (produto.e_materia_prima) {
            // Buscar em todos os produtos para encontrar qual produto usa este como dependência
            const produtosResponse = await api.get('/api/produtos?pageSize=1000');
            const todosProdutos = produtosResponse.data?.data || produtosResponse.data || [];
            let dependenciaAtualEncontrada = null;
            
            for (const prod of todosProdutos) {
              try {
                const depResponse = await api.get(`/api/produtos/${prod.id}/dependencias`);
                // Corrigir estrutura de resposta similar ao que fizemos na página de detalhes
                const deps = Array.isArray(depResponse) ? depResponse : (depResponse.data || []);
                const depEncontrada = deps.find((d: any) => d.produto_filho.id === produtoId);
                if (depEncontrada) {
                  dependenciaAtualEncontrada = {
                    id: depEncontrada.id,
                    produto_pai_id: prod.id,
                    produto_filho_id: produtoId,
                    quantidade_necessaria: depEncontrada.quantidade_necessaria
                  };
                  break;
                }
              } catch (error) {
                // Erro silencioso ao buscar dependências
              }
            }
            
            if (dependenciaAtualEncontrada) {
              const dep = dependenciaAtualEncontrada;
              setDependenciaAtual(dep);
              setFormData(prev => ({
                ...prev,
                produto_pai_id: dep.produto_pai_id,
                quantidade_necessaria: dep.quantidade_necessaria?.toString() || prev.quantidade_necessaria
              }));
            }
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar produto');
        } finally {
          setLoadingProduto(false);
        }
      }
    };
    
    checkAuthAndLoadProduto();
  }, [router, produtoId]);

  // Buscar produtos disponíveis quando marcar como matéria-prima
  useEffect(() => {
    const fetchProdutos = async () => {
      if (formData.e_materia_prima) {
        setLoadingProdutos(true);
        try {
          // Buscar TODOS os produtos, excluindo apenas o produto atual para evitar dependência circular
          const response = await api.get('/api/produtos?pageSize=1000');
          
          // Tentar diferentes estruturas de resposta
          let produtosArray: Produto[] = [];
          if (response.data?.data) {
            produtosArray = response.data.data;
          } else if (Array.isArray(response.data)) {
            produtosArray = response.data;
          }
          const produtosFiltrados = produtosArray.filter((p: Produto) => p.id !== produtoId);
          setProdutos(produtosFiltrados);
        } catch (error) {
          // Erro silencioso ao buscar produtos
        } finally {
          setLoadingProdutos(false);
        }
      }
    };
    
    fetchProdutos();
  }, [formData.e_materia_prima, produtoId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      const target = e.target as HTMLInputElement
      setFormData({
        ...formData,
        [name]: target.checked,
        // Limpar produto pai quando desmarcar matéria-prima
        produto_pai_id: target.checked ? formData.produto_pai_id : ''
      })
    } else if (name === 'preco_unitario' || name === 'quantidade_necessaria') {
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
        nome: formData.nome,
        codigo_produto: formData.codigo_produto,
        descricao: formData.descricao,
        // Para produtos de cálculo, preço unitário é sempre NULL (será calculado)
        // Para produtos simples, usar o valor informado
        preco_unitario: formData.tipo_produto === 'calculo' ? null : (formData.preco_unitario ? parseFloat(formData.preco_unitario) : null),
        quantidade_necessaria: formData.tipo_produto === 'simples' && formData.quantidade_necessaria ? parseFloat(formData.quantidade_necessaria) : null,
        e_materia_prima: formData.e_materia_prima,
        tipo_produto: formData.tipo_produto
      }
      
      const response = await api.put(`/api/produtos/${produtoId}`, produtoData);
      
      if (response.error) {
        throw new Error(response.error || 'Erro ao atualizar produto');
      }

      // Gerenciar dependências
      if (formData.e_materia_prima && formData.produto_pai_id && formData.tipo_produto === 'simples') {
        // Se tinha dependência e mudou o produto pai ou quantidade
        if (dependenciaAtual) {
          if (dependenciaAtual.produto_pai_id !== formData.produto_pai_id || 
              dependenciaAtual.quantidade_necessaria !== parseFloat(formData.quantidade_necessaria)) {
            // Atualizar dependência existente
            await api.put(`/api/produtos/dependencias/${dependenciaAtual.id}`, {
              produto_pai_id: formData.produto_pai_id,
              produto_filho_id: produtoId,
              quantidade_necessaria: parseFloat(formData.quantidade_necessaria)
            });
          }
        } else {
          // Criar nova dependência
          await api.post(`/api/produtos/${formData.produto_pai_id}/dependencias`, {
            produto_pai_id: formData.produto_pai_id,
            produto_filho_id: produtoId,
            quantidade_necessaria: parseFloat(formData.quantidade_necessaria)
          });
        }
      } else if (!formData.e_materia_prima && dependenciaAtual) {
        // Remover dependência se deixou de ser matéria-prima
        await api.delete(`/api/produtos/dependencias/${dependenciaAtual.id}`);
      } else if (formData.e_materia_prima && !formData.produto_pai_id && dependenciaAtual) {
        // Remover dependência se desmarcou o produto pai
        await api.delete(`/api/produtos/dependencias/${dependenciaAtual.id}`);
      }
      
      router.push('/produtos')
    } catch (err) {
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

      {/* Descrição explicativa */}
      <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded mb-6">
        <h3 className="font-semibold mb-2">ℹ️ Como usar este formulário:</h3>
        <ul className="text-sm space-y-1">
          <li>• <strong>Produto Simples:</strong> Tem preço fixo (preço unitário × quantidade). Ideal para produtos com custo conhecido.</li>
          <li>• <strong>Produto para Cálculo:</strong> Preço calculado automaticamente baseado em dependências, processos e mão de obra.</li>
          <li>• <strong>Componente/Matéria-prima:</strong> Marque se este item é usado para fabricar outros produtos.</li>
          <li>• <strong>Código do Produto:</strong> Identificação única opcional para organização.</li>
        </ul>
      </div>
      
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
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="codigo_produto">
            Código do Produto
          </label>
          <input
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            id="codigo_produto"
            type="text"
            name="codigo_produto"
            value={formData.codigo_produto}
            onChange={handleChange}
            placeholder="Ex: PROD001, MAT-ABC, etc."
          />
          <p className="text-xs text-gray-500 mt-1">
            Código único para identificação do produto (opcional)
          </p>
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
            placeholder="Descrição detalhada do produto ou matéria-prima"
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
            <span className="text-gray-700 text-sm font-bold">É componente/matéria-prima?</span>
          </label>
          <p className="text-xs text-gray-500 mt-1">
            Marque esta opção se este item é usado como componente para fabricar outros produtos (pode ser matéria-prima, subproduto, etc.)
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Tipo de Produto<span className="text-red-500 ml-1">*</span>
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="tipo_produto"
                value="simples"
                checked={formData.tipo_produto === 'simples'}
                onChange={handleChange}
                className="mr-2"
              />
              <span className="text-gray-700 text-sm">Produto Simples</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="tipo_produto"
                value="calculo"
                checked={formData.tipo_produto === 'calculo'}
                onChange={handleChange}
                className="mr-2"
              />
              <span className="text-gray-700 text-sm">Produto para Cálculo</span>
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            <strong>Produto Simples:</strong> Preço fixo baseado em preço unitário × quantidade<br/>
            <strong>Produto para Cálculo:</strong> Preço calculado automaticamente com base em dependências, processos e mão de obra
          </p>
        </div>

        {/* Seletor de produto pai - aparece apenas para matérias-primas */}
        {formData.e_materia_prima && (
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="produto_pai_id">
              Produto que utiliza este componente<span className="text-red-500 ml-1">*</span>
            </label>
            {loadingProdutos ? (
              <div className="text-sm text-gray-500">Carregando produtos...</div>
            ) : (
              <select
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="produto_pai_id"
                name="produto_pai_id"
                value={formData.produto_pai_id}
                onChange={handleChange}
                required
              >
                <option value="">Selecione um produto</option>
                {produtos.map((produto) => (
                  <option key={produto.id} value={produto.id}>
                    {produto.nome} {produto.e_materia_prima ? '(Matéria-prima)' : '(Produto)'}
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Selecione o produto que utiliza este componente. Pode ser um produto final ou intermediário.
            </p>
          </div>
        )}
        
        {/* Campos específicos para produto simples */}
        {formData.tipo_produto === 'simples' && (
          <>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="preco_unitario">
                Preço Unitário (R$)<span className="text-red-500 ml-1">*</span>
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="preco_unitario"
                type="text"
                name="preco_unitario"
                value={formData.preco_unitario}
                onChange={handleChange}
                required
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Preço por unidade do produto
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="quantidade_necessaria">
                Quantidade Necessária<span className="text-red-500 ml-1">*</span>
              </label>
              <input
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                id="quantidade_necessaria"
                type="text"
                name="quantidade_necessaria"
                value={formData.quantidade_necessaria}
                onChange={handleChange}
                required
                placeholder="1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Quantidade necessária deste produto
              </p>
            </div>
          </>
        )}
        
        <div className="flex items-center justify-between">
          <button
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
        
        <div className="mt-4 text-sm text-gray-600">
          <span className="text-red-500">*</span> Campos obrigatórios
        </div>
      </form>
    </div>
  )
} 