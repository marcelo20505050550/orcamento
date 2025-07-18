/**
 * Tipos TypeScript para as entidades principais do sistema de orçamentos
 */

// Tipo para produto ou matéria-prima
export interface Produto {
  id: string;
  nome: string;
  descricao: string;
  preco_unitario: number;
  quantidade_estoque: number;
  e_materia_prima: boolean;
  created_at: string;
  updated_at: string;
}

// Tipo para dependência entre produtos
export interface DependenciaProduto {
  id: string;
  produto_pai_id: string;
  produto_filho_id: string;
  quantidade_necessaria: number;
  created_at: string;
  updated_at: string;
  
  // Relacionamentos opcionais que podem ser carregados
  produto_pai?: Produto;
  produto_filho?: Produto;
}

// Tipo para processo de fabricação
export interface ProcessoFabricacao {
  id: string;
  nome: string;
  preco_por_unidade: number;
  tempo_estimado_minutos: number;
  created_at: string;
  updated_at: string;
}

// Tipo para mão de obra
export interface MaoDeObra {
  id: string;
  tipo: string; // 'fabricacao' ou 'desenho/projeto'
  preco_por_hora: number;
  created_at: string;
  updated_at: string;
}

// Enumeração para status do pedido
export enum StatusPedido {
  PENDENTE = 'pendente',
  EM_PRODUCAO = 'em_producao',
  FINALIZADO = 'finalizado',
  CANCELADO = 'cancelado'
}

// Tipo para pedido
export interface Pedido {
  id: string;
  produto_id: string;
  quantidade: number;
  status: StatusPedido;
  observacoes?: string;
  user_id: string;
  tem_frete: boolean;
  valor_frete: number;
  margem_lucro_percentual: number;
  impostos_percentual: number;
  created_at: string;
  updated_at: string;
  
  // Relacionamentos opcionais que podem ser carregados
  produto?: Produto;
  processos?: ProcessoPedido[];
  mao_de_obra?: MaoDeObraPedido[];
}

// Tipo para associação entre pedido e processo
export interface ProcessoPedido {
  id: string;
  pedido_id: string;
  processo_id: string;
  quantidade: number;
  created_at: string;
  updated_at: string;
  
  // Relacionamento opcional que pode ser carregado
  processo?: ProcessoFabricacao;
}

// Tipo para associação entre pedido e mão de obra
export interface MaoDeObraPedido {
  id: string;
  pedido_id: string;
  mao_de_obra_id: string;
  horas: number;
  created_at: string;
  updated_at: string;
  
  // Relacionamento opcional que pode ser carregado
  mao_de_obra?: MaoDeObra;
}

// Interface para representar dependências recursivas de produtos
export interface DependenciaRecursiva {
  produto_id: string;
  quantidade_necessaria: number;
  nivel: number;
  caminho: string[];
}

// Interface para representar matérias-primas necessárias
export interface MateriaPrimaNecessaria {
  produto_id: string;
  nome: string;
  quantidade_necessaria: number;
  preco_unitario: number;
  subtotal: number;
  disponivel_estoque: boolean;
}

// Interface para representar processos de fabricação no orçamento
export interface ProcessoOrcamento {
  processo_id: string;
  nome: string;
  quantidade: number;
  preco_por_unidade: number;
  tempo_estimado_minutos: number;
  subtotal: number;
}

// Interface para representar mão de obra no orçamento
export interface MaoDeObraOrcamento {
  mao_de_obra_id: string;
  tipo: string;
  horas: number;
  preco_por_hora: number;
  subtotal: number;
}

// Tipo para orçamento detalhado
export interface Orcamento {
  pedido_id: string;
  custo_total_materiais: number;
  custo_total_processos: number;
  custo_total_mao_de_obra: number;
  custo_total: number;
  detalhes_materiais: MateriaPrimaNecessaria[];
  detalhes_processos: ProcessoOrcamento[];
  detalhes_mao_de_obra: MaoDeObraOrcamento[];
}

// Detalhes para componentes do orçamento (legado)
export interface DetalheMaterial {
  produto_id: string;
  nome: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
}

export interface DetalheProcesso {
  processo_id: string;
  nome: string;
  quantidade: number;
  preco_por_unidade: number;
  subtotal: number;
  tempo_estimado_minutos: number;
}

export interface DetalheMaoDeObra {
  mao_de_obra_id: string;
  tipo: string;
  horas: number;
  preco_por_hora: number;
  subtotal: number;
}

// Interface para o objeto de orçamento completo
export interface OrcamentoCompleto {
  pedido_id: string;
  custo_total_materiais: number;
  custo_total_processos: number;
  custo_total_mao_de_obra: number;
  custo_total_itens_extras: number;
  valor_frete: number;
  subtotal: number; // materiais + processos + mão de obra + itens extras + frete
  margem_lucro_percentual: number;
  valor_margem_lucro: number;
  total_com_margem: number; // subtotal + margem
  impostos_percentual: number;
  valor_impostos: number;
  custo_total: number; // total final com impostos
  detalhes_materiais: MateriaPrimaNecessaria[];
  detalhes_processos: ProcessoOrcamento[];
  detalhes_mao_de_obra: MaoDeObraOrcamento[];
  detalhes_itens_extras: ItemExtraPedido[];
}

// Tipo para itens extras de pedidos
export interface ItemExtraPedido {
  id: string;
  pedido_id: string;
  nome: string;
  descricao?: string;
  valor: number;
  created_at: string;
  updated_at: string;
} 