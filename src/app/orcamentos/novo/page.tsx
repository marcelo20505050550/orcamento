'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HydrationSuppressor } from '@/components/HydrationSuppressor';

interface Produto {
  id: string;
  nome: string;
  descricao: string;
  preco_unitario: number;
  e_materia_prima: boolean;
}

export default function NovoOrcamento() {
  const router = useRouter();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    produto_id: '',
    quantidade: 1,
    observacoes: '',
    tem_frete: false,
    valor_frete: 0,
    margem_lucro_percentual: 0,
    impostos_percentual: 0
  });

  // Carrega lista de produtos que não são matérias-primas
  useEffect(() => {
    const fetchProdutos = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          router.push('/login');
          return;
        }

        const response = await fetch('/api/produtos?materiaPrima=false', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Erro ao carregar produtos');
        }

        const data = await response.json();
        setProdutos(data.data || []);
      } catch (error) {
        console.error('Erro ao buscar produtos:', error);
        alert('Erro ao carregar lista de produtos');
      } finally {
        setLoading(false);
      }
    };

    fetchProdutos();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/pedidos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar pedido');
      }

      const result = await response.json();
      alert('Pedido criado com sucesso! Redirecionando para detalhes...');
      router.push(`/pedidos/${result.data.id}?novo=true`);
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      alert(error instanceof Error ? error.message : 'Erro ao criar pedido');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              ['quantidade', 'valor_frete', 'margem_lucro_percentual', 'impostos_percentual'].includes(name) 
                ? parseFloat(value) || 0 : value
    }));
  };

  if (loading) {
    return (
      <HydrationSuppressor className="container mx-auto px-4 py-8">
        <div className="text-center">Carregando produtos...</div>
      </HydrationSuppressor>
    );
  }

  return (
    <HydrationSuppressor className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Novo Orçamento</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seleção de Produto */}
          <div>
            <label htmlFor="produto_id" className="block text-sm font-medium text-gray-700 mb-2">
              Produto *
            </label>
            <select
              id="produto_id"
              name="produto_id"
              value={formData.produto_id}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Selecione um produto</option>
              {produtos.map(produto => (
                <option key={produto.id} value={produto.id}>
                  {produto.nome} - R$ {produto.preco_unitario.toFixed(2)}
                </option>
              ))}
            </select>
          </div>

          {/* Quantidade */}
          <div>
            <label htmlFor="quantidade" className="block text-sm font-medium text-gray-700 mb-2">
              Quantidade *
            </label>
            <input
              type="number"
              id="quantidade"
              name="quantidade"
              value={formData.quantidade}
              onChange={handleInputChange}
              min="1"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Frete */}
          <div>
            <div className="flex items-center mb-2">
              <input
                type="checkbox"
                id="tem_frete"
                name="tem_frete"
                checked={formData.tem_frete}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="tem_frete" className="ml-2 block text-sm font-medium text-gray-700">
                Incluir frete
              </label>
            </div>
            {formData.tem_frete && (
              <input
                type="number"
                id="valor_frete"
                name="valor_frete"
                value={formData.valor_frete}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                placeholder="Valor do frete"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            )}
          </div>

          {/* Margem de Lucro */}
          <div>
            <label htmlFor="margem_lucro_percentual" className="block text-sm font-medium text-gray-700 mb-2">
              Margem de Lucro (%)
            </label>
            <input
              type="number"
              id="margem_lucro_percentual"
              name="margem_lucro_percentual"
              value={formData.margem_lucro_percentual}
              onChange={handleInputChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Impostos */}
          <div>
            <label htmlFor="impostos_percentual" className="block text-sm font-medium text-gray-700 mb-2">
              Impostos (%)
            </label>
            <input
              type="number"
              id="impostos_percentual"
              name="impostos_percentual"
              value={formData.impostos_percentual}
              onChange={handleInputChange}
              min="0"
              step="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Observações */}
          <div>
            <label htmlFor="observacoes" className="block text-sm font-medium text-gray-700 mb-2">
              Observações
            </label>
            <textarea
              id="observacoes"
              name="observacoes"
              value={formData.observacoes}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Observações sobre o pedido..."
            />
          </div>

          {/* Botões */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.produto_id}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {submitting ? 'Criando...' : 'Criar Pedido'}
            </button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-800">
            <strong>Próximos passos:</strong> Após criar o pedido, você poderá adicionar processos de fabricação e mão de obra para gerar um orçamento completo.
          </p>
        </div>
      </div>
    </HydrationSuppressor>
  );
} 