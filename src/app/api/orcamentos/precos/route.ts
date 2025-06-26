/**
 * API para atualização de preços
 * Endpoint para atualizar preços de produtos, processos e mão de obra (US-015)
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';
import { withAuth } from '../../middleware';
import { logError, logInfo } from '@/utils/logger';

// Tipos para validação
interface AtualizacaoProduto {
  id: string;
  preco_unitario: number;
}

interface AtualizacaoProcesso {
  id: string;
  preco_por_unidade: number;
}

interface AtualizacaoMaoDeObra {
  id: string;
  preco_por_hora: number;
}

interface RequestBody {
  produtos?: AtualizacaoProduto[];
  processos?: AtualizacaoProcesso[];
  mao_de_obra?: AtualizacaoMaoDeObra[];
}

// Função auxiliar para validar preços positivos
function validarPrecoPositivo(preco: number): boolean {
  return typeof preco === 'number' && preco >= 0;
}

/**
 * PATCH /api/orcamentos/precos
 * Atualiza preços de produtos, processos e mão de obra (US-015)
 */
export const PATCH = withAuth(async (req: NextRequest) => {
  try {
    // Parse do corpo da requisição
    const body: RequestBody = await req.json();
    
    // Verifica se pelo menos uma categoria de atualização foi fornecida
    if (!body.produtos && !body.processos && !body.mao_de_obra) {
      return NextResponse.json(
        { error: 'Nenhum item para atualização foi fornecido' },
        { status: 400 }
      );
    }
    
    // Obtém o usuário atual a partir do token
    const authHeader = req.headers.get('authorization')!;
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Erro ao identificar o usuário' },
        { status: 401 }
      );
    }
    
    // Resultados das atualizações
    const resultados = {
      produtos: { sucesso: 0, erros: 0, detalhes: [] as any[] },
      processos: { sucesso: 0, erros: 0, detalhes: [] as any[] },
      mao_de_obra: { sucesso: 0, erros: 0, detalhes: [] as any[] }
    };
    
    // Atualiza preços de produtos
    if (body.produtos && body.produtos.length > 0) {
      const produtosSucesso = await Promise.allSettled(
        body.produtos.map(async (produto: { id: string; preco_unitario: number }) => {
          const { error } = await supabase
            .from('produtos')
            .update({ preco_unitario: produto.preco_unitario })
            .eq('id', produto.id)
            
          if (error) throw error
          
          // Busca nome do produto para incluir na resposta
          const { data } = await supabase
            .from('produtos')
            .select('nome')
            .eq('id', produto.id)
            .single()
            
          return {
            id: produto.id,
            nome: data?.nome || 'N/A',
            preco_atualizado: produto.preco_unitario
          }
        })
      )
      
      produtosSucesso.forEach((result) => {
        if (result.status === 'fulfilled') {
          resultados.produtos.sucesso++
          resultados.produtos.detalhes.push(result.value)
        } else {
          resultados.produtos.erros++
        }
      })
    }
    
    // Atualiza preços de processos de fabricação
    if (body.processos && body.processos.length > 0) {
      const processosSucesso = await Promise.allSettled(
        body.processos.map(async (processo: { id: string; preco_por_unidade: number }) => {
          const { error } = await supabase
            .from('processos_fabricacao')
            .update({ preco_por_unidade: processo.preco_por_unidade })
            .eq('id', processo.id)
            
          if (error) throw error
          
          // Busca nome do processo para incluir na resposta
          const { data } = await supabase
            .from('processos_fabricacao')
            .select('nome')
            .eq('id', processo.id)
            .single()
            
          return {
            id: processo.id,
            nome: data?.nome || 'N/A',
            preco_atualizado: processo.preco_por_unidade
          }
        })
      )
      
      processosSucesso.forEach((result) => {
        if (result.status === 'fulfilled') {
          resultados.processos.sucesso++
          resultados.processos.detalhes.push(result.value)
        } else {
          resultados.processos.erros++
        }
      })
    }
    
    // Atualiza preços de tipos de mão de obra
    if (body.mao_de_obra && body.mao_de_obra.length > 0) {
      const maoDeObraSucesso = await Promise.allSettled(
        body.mao_de_obra.map(async (mao: { id: string; preco_por_hora: number }) => {
          const { error } = await supabase
            .from('mao_de_obra')
            .update({ preco_por_hora: mao.preco_por_hora })
            .eq('id', mao.id)
            
          if (error) throw error
          
          // Busca tipo de mão de obra para incluir na resposta
          const { data } = await supabase
            .from('mao_de_obra')
            .select('tipo')
            .eq('id', mao.id)
            .single()
            
          return {
            id: mao.id,
            tipo: data?.tipo || 'N/A',
            preco_atualizado: mao.preco_por_hora
          }
        })
      )
      
      maoDeObraSucesso.forEach((result) => {
        if (result.status === 'fulfilled') {
          resultados.mao_de_obra.sucesso++
          resultados.mao_de_obra.detalhes.push(result.value)
        } else {
          resultados.mao_de_obra.erros++
        }
      })
    }
    
    // Calcula o total de atualizações com sucesso e erros
    const totalSucesso = resultados.produtos.sucesso + resultados.processos.sucesso + resultados.mao_de_obra.sucesso;
    const totalErros = resultados.produtos.erros + resultados.processos.erros + resultados.mao_de_obra.erros;
    
    logInfo(`Atualização de preços concluída: ${totalSucesso} itens atualizados com sucesso, ${totalErros} erros`);
    
    return NextResponse.json({
      message: `Atualização de preços concluída: ${totalSucesso} itens atualizados com sucesso, ${totalErros} erros`,
      data: resultados
    });
  } catch (error) {
    logError('Erro não tratado ao atualizar preços', error);
    return NextResponse.json(
      { error: 'Erro interno ao processar a requisição' },
      { status: 500 }
    );
  }
}); 