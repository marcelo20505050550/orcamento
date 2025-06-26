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
      for (const produto of body.produtos) {
        // Verifica se o ID e o preço são válidos
        if (!produto.id || !validarPrecoPositivo(produto.preco_unitario)) {
          resultados.produtos.erros++;
          resultados.produtos.detalhes.push({
            id: produto.id || 'ID inválido',
            erro: 'ID ou preço unitário inválido'
          });
          continue;
        }
        
        // Atualiza o preço no banco de dados
        const { data, error } = await supabase
          .from('produtos')
          .update({ preco_unitario: produto.preco_unitario })
          .eq('id', produto.id)
          .select('id, nome')
          .single();
          
        if (error) {
          resultados.produtos.erros++;
          resultados.produtos.detalhes.push({
            id: produto.id,
            erro: error.message
          });
        } else {
          resultados.produtos.sucesso++;
          resultados.produtos.detalhes.push({
            id: produto.id,
            nome: data?.nome,
            preco_atualizado: produto.preco_unitario
          });
        }
      }
    }
    
    // Atualiza preços de processos de fabricação
    if (body.processos && body.processos.length > 0) {
      for (const processo of body.processos) {
        // Verifica se o ID e o preço são válidos
        if (!processo.id || !validarPrecoPositivo(processo.preco_por_unidade)) {
          resultados.processos.erros++;
          resultados.processos.detalhes.push({
            id: processo.id || 'ID inválido',
            erro: 'ID ou preço por unidade inválido'
          });
          continue;
        }
        
        // Atualiza o preço no banco de dados
        const { data, error } = await supabase
          .from('processos_fabricacao')
          .update({ preco_por_unidade: processo.preco_por_unidade })
          .eq('id', processo.id)
          .select('id, nome')
          .single();
          
        if (error) {
          resultados.processos.erros++;
          resultados.processos.detalhes.push({
            id: processo.id,
            erro: error.message
          });
        } else {
          resultados.processos.sucesso++;
          resultados.processos.detalhes.push({
            id: processo.id,
            nome: data?.nome,
            preco_atualizado: processo.preco_por_unidade
          });
        }
      }
    }
    
    // Atualiza preços de tipos de mão de obra
    if (body.mao_de_obra && body.mao_de_obra.length > 0) {
      for (const maoDeObra of body.mao_de_obra) {
        // Verifica se o ID e o preço são válidos
        if (!maoDeObra.id || !validarPrecoPositivo(maoDeObra.preco_por_hora)) {
          resultados.mao_de_obra.erros++;
          resultados.mao_de_obra.detalhes.push({
            id: maoDeObra.id || 'ID inválido',
            erro: 'ID ou preço por hora inválido'
          });
          continue;
        }
        
        // Atualiza o preço no banco de dados
        const { data, error } = await supabase
          .from('mao_de_obra')
          .update({ preco_por_hora: maoDeObra.preco_por_hora })
          .eq('id', maoDeObra.id)
          .select('id, tipo')
          .single();
          
        if (error) {
          resultados.mao_de_obra.erros++;
          resultados.mao_de_obra.detalhes.push({
            id: maoDeObra.id,
            erro: error.message
          });
        } else {
          resultados.mao_de_obra.sucesso++;
          resultados.mao_de_obra.detalhes.push({
            id: maoDeObra.id,
            tipo: data?.tipo,
            preco_atualizado: maoDeObra.preco_por_hora
          });
        }
      }
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