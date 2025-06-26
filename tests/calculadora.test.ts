/**
 * Testes para as funções de cálculo do sistema de orçamentos
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as calculadora from '../src/utils/calculadora';
import { supabase } from '../src/lib/supabase/client';

// Mock do supabase
vi.mock('../src/lib/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockImplementation((table: string) => {
      // Mock básico que será sobrescrito nos testes específicos
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        single: vi.fn()
      };
    })
  }
}));

// Mock da função de log para evitar poluição nos testes
vi.mock('../src/utils/logger', () => ({
  logError: vi.fn(),
  logInfo: vi.fn()
}));

describe('Funções de Cálculo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calcularDependenciasRecursivas', () => {
    it('deve calcular dependências recursivas corretamente', async () => {
      const mockReturn = {
        data: [
          {
            produto_filho_id: 'filho-1',
            quantidade_necessaria: 2,
            produto_filho: {
              nome: 'Matéria Prima 1',
              e_materia_prima: true
            }
          },
          {
            produto_filho_id: 'filho-2',
            quantidade_necessaria: 1,
            produto_filho: {
              nome: 'Componente 1',
              e_materia_prima: false
            }
          }
        ],
        error: null
      };
      
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnValue(mockReturn);
      
      const fromSpy = vi.spyOn(supabase, 'from').mockReturnValue({
        select: mockSelect,
        eq: mockEq
      } as any);
      
      // Modificando o mock para calcularDependenciasRecursivas
      // Em vez de usar importActual, vamos simplesmente garantir que
      // a função retorne resultados diferentes para chamadas diferentes
      const originalFn = calculadora.calcularDependenciasRecursivas;
      const spy = vi.spyOn(calculadora, 'calcularDependenciasRecursivas');
      
      // Na primeira chamada, deixamos a função original ser executada
      spy.mockImplementationOnce(originalFn);
      
      // Para todas as chamadas subsequentes, retornamos um mapa vazio
      // (que seria para os filhos dos produtos)
      spy.mockImplementation(() => Promise.resolve(new Map()));

      const resultado = await calculadora.calcularDependenciasRecursivas('produto-pai', 5);
      
      // Verifica se a função foi chamada corretamente
      expect(fromSpy).toHaveBeenCalledWith('dependencias_produtos');
      expect(mockSelect).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('produto_pai_id', 'produto-pai');
      
      // Verifica se o mapa contém as entradas esperadas
      expect(resultado.size).toBe(2);
      expect(resultado.get('filho-1')).toBeDefined();
      expect(resultado.get('filho-1')?.quantidade_necessaria).toBe(10); // 2 * 5
      expect(resultado.get('filho-2')).toBeDefined();
      expect(resultado.get('filho-2')?.quantidade_necessaria).toBe(5); // 1 * 5
    });
  });

  describe('calcularRequisitosMateriasPrimas', () => {
    it('deve calcular requisitos de matérias-primas corretamente', async () => {
      // Mock de calcularDependenciasRecursivas
      const mockDependencias = new Map();
      mockDependencias.set('mp-1', { produto_id: 'mp-1', quantidade_necessaria: 10, nivel: 1, caminho: ['pai'] });
      mockDependencias.set('mp-2', { produto_id: 'mp-2', quantidade_necessaria: 5, nivel: 1, caminho: ['pai'] });
      
      vi.spyOn(calculadora, 'calcularDependenciasRecursivas')
        .mockResolvedValue(mockDependencias);
      
      // Mock do retorno da consulta de produtos
      const mockData = [
        { 
          id: 'mp-1', 
          nome: 'Matéria Prima 1', 
          preco_unitario: 10, 
          quantidade_estoque: 20, 
          e_materia_prima: true 
        },
        { 
          id: 'mp-2', 
          nome: 'Matéria Prima 2', 
          preco_unitario: 15, 
          quantidade_estoque: 3, 
          e_materia_prima: true 
        }
      ];
      
      // Configura o mock para retornar efetivamente os dados
      const mockSelect = vi.fn().mockReturnThis();
      const mockIn = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnValue({ data: mockData, error: null });
      
      const fromSpy = vi.spyOn(supabase, 'from').mockReturnValue({
        select: mockSelect,
        in: mockIn,
        eq: mockEq
      } as any);

      const resultado = await calculadora.calcularRequisitosMateriasPrimas('produto-pai', 5);
      
      // Verifica se foram retornadas as matérias-primas corretas
      expect(resultado.length).toBe(2);
      
      // Verifica se a primeira matéria-prima está correta
      const mp1 = resultado.find(mp => mp.produto_id === 'mp-1');
      expect(mp1).toBeDefined();
      expect(mp1?.nome).toBe('Matéria Prima 1');
      expect(mp1?.quantidade_necessaria).toBe(10);
      expect(mp1?.preco_unitario).toBe(10);
      expect(mp1?.subtotal).toBe(100); // 10 * 10
      expect(mp1?.disponivel_estoque).toBe(true); // 20 > 10
      
      // Verifica se a segunda matéria-prima está correta
      const mp2 = resultado.find(mp => mp.produto_id === 'mp-2');
      expect(mp2).toBeDefined();
      expect(mp2?.nome).toBe('Matéria Prima 2');
      expect(mp2?.quantidade_necessaria).toBe(5);
      expect(mp2?.preco_unitario).toBe(15);
      expect(mp2?.subtotal).toBe(75); // 5 * 15
      expect(mp2?.disponivel_estoque).toBe(false); // 3 < 5
    });
  });

  describe('calcularCustosProcessos', () => {
    it('deve calcular custos de processos corretamente', async () => {
      const mockData = [
        {
          processo_id: 'proc-1',
          quantidade: 5,
          processo: {
            nome: 'Corte',
            preco_por_unidade: 20,
            tempo_estimado_minutos: 30
          }
        },
        {
          processo_id: 'proc-2',
          quantidade: 2,
          processo: {
            nome: 'Montagem',
            preco_por_unidade: 50,
            tempo_estimado_minutos: 60
          }
        }
      ];
      
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnValue({ data: mockData, error: null });
      
      vi.spyOn(supabase, 'from').mockReturnValue({
        select: mockSelect,
        eq: mockEq
      } as any);

      const resultado = await calculadora.calcularCustosProcessos('pedido-1');
      
      // Verifica se foram retornados os processos corretos
      expect(resultado.length).toBe(2);
      
      // Verifica se o primeiro processo está correto
      const proc1 = resultado.find(p => p.processo_id === 'proc-1');
      expect(proc1).toBeDefined();
      expect(proc1?.nome).toBe('Corte');
      expect(proc1?.quantidade).toBe(5);
      expect(proc1?.preco_por_unidade).toBe(20);
      expect(proc1?.tempo_estimado_minutos).toBe(30);
      expect(proc1?.subtotal).toBe(100); // 5 * 20
      
      // Verifica se o segundo processo está correto
      const proc2 = resultado.find(p => p.processo_id === 'proc-2');
      expect(proc2).toBeDefined();
      expect(proc2?.nome).toBe('Montagem');
      expect(proc2?.quantidade).toBe(2);
      expect(proc2?.preco_por_unidade).toBe(50);
      expect(proc2?.tempo_estimado_minutos).toBe(60);
      expect(proc2?.subtotal).toBe(100); // 2 * 50
    });
  });

  describe('calcularCustosMaoDeObra', () => {
    it('deve calcular custos de mão de obra corretamente', async () => {
      const mockData = [
        {
          mao_de_obra_id: 'mdo-1',
          horas: 2,
          mao_de_obra: {
            tipo: 'Técnico',
            preco_por_hora: 80
          }
        },
        {
          mao_de_obra_id: 'mdo-2',
          horas: 1.5,
          mao_de_obra: {
            tipo: 'Engenheiro',
            preco_por_hora: 120
          }
        }
      ];
      
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnValue({ data: mockData, error: null });
      
      vi.spyOn(supabase, 'from').mockReturnValue({
        select: mockSelect,
        eq: mockEq
      } as any);

      const resultado = await calculadora.calcularCustosMaoDeObra('pedido-1');
      
      // Verifica se foram retornados os tipos de mão de obra corretos
      expect(resultado.length).toBe(2);
      
      // Verifica se o primeiro tipo está correto
      const mdo1 = resultado.find(m => m.mao_de_obra_id === 'mdo-1');
      expect(mdo1).toBeDefined();
      expect(mdo1?.tipo).toBe('Técnico');
      expect(mdo1?.horas).toBe(2);
      expect(mdo1?.preco_por_hora).toBe(80);
      expect(mdo1?.subtotal).toBe(160); // 2 * 80
      
      // Verifica se o segundo tipo está correto
      const mdo2 = resultado.find(m => m.mao_de_obra_id === 'mdo-2');
      expect(mdo2).toBeDefined();
      expect(mdo2?.tipo).toBe('Engenheiro');
      expect(mdo2?.horas).toBe(1.5);
      expect(mdo2?.preco_por_hora).toBe(120);
      expect(mdo2?.subtotal).toBe(180); // 1.5 * 120
    });
  });

  describe('gerarOrcamentoCompleto', () => {
    it('deve gerar um orçamento completo', async () => {
      // Mock do pedido
      const mockPedido = {
        produto_id: 'prod-1',
        quantidade: 10,
        produto: {
          nome: 'Produto Final',
          preco_unitario: 500
        }
      };
      
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockReturnValue({ data: mockPedido, error: null });
      
      vi.spyOn(supabase, 'from').mockReturnValue({
        select: mockSelect,
        eq: mockEq,
        single: mockSingle
      } as any);
      
      // Mock das funções de cálculo
      const mockMateriais = [
        { 
          produto_id: 'mp-1', 
          nome: 'Matéria Prima 1', 
          quantidade_necessaria: 10, 
          preco_unitario: 10, 
          subtotal: 100,
          disponivel_estoque: true 
        },
        { 
          produto_id: 'mp-2', 
          nome: 'Matéria Prima 2', 
          quantidade_necessaria: 5, 
          preco_unitario: 15, 
          subtotal: 75,
          disponivel_estoque: false 
        }
      ];
      
      const mockProcessos = [
        { 
          processo_id: 'proc-1', 
          nome: 'Corte', 
          quantidade: 5, 
          preco_por_unidade: 20, 
          tempo_estimado_minutos: 30,
          subtotal: 100 
        },
        { 
          processo_id: 'proc-2', 
          nome: 'Montagem', 
          quantidade: 2, 
          preco_por_unidade: 50, 
          tempo_estimado_minutos: 60,
          subtotal: 100 
        }
      ];
      
      const mockMaoDeObra = [
        { 
          mao_de_obra_id: 'mdo-1', 
          tipo: 'Técnico', 
          horas: 2, 
          preco_por_hora: 80,
          subtotal: 160 
        },
        { 
          mao_de_obra_id: 'mdo-2', 
          tipo: 'Engenheiro', 
          horas: 1.5, 
          preco_por_hora: 120,
          subtotal: 180 
        }
      ];
      
      // Os mocks precisam ser configurados ANTES de chamar gerarOrcamentoCompleto
      vi.spyOn(calculadora, 'calcularRequisitosMateriasPrimas')
        .mockResolvedValue(mockMateriais);
        
      vi.spyOn(calculadora, 'calcularCustosProcessos')
        .mockResolvedValue(mockProcessos);
        
      vi.spyOn(calculadora, 'calcularCustosMaoDeObra')
        .mockResolvedValue(mockMaoDeObra);

      const resultado = await calculadora.gerarOrcamentoCompleto('pedido-1');
      
      // Verifica se o orçamento foi gerado corretamente
      expect(resultado).toBeDefined();
      expect(resultado.pedido_id).toBe('pedido-1');
      expect(resultado.custo_total_materiais).toBe(175); // 100 + 75
      expect(resultado.custo_total_processos).toBe(200); // 100 + 100
      expect(resultado.custo_total_mao_de_obra).toBe(340); // 160 + 180
      expect(resultado.custo_total).toBe(715); // 175 + 200 + 340
      
      // Verifica os detalhes
      expect(resultado.detalhes_materiais.length).toBe(2);
      expect(resultado.detalhes_processos.length).toBe(2);
      expect(resultado.detalhes_mao_de_obra.length).toBe(2);
    });
  });
}); 