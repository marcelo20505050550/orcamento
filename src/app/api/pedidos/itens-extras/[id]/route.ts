import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import logger from '@/utils/logger'
import { withAuth } from '../../../middleware'

// Função para validar dados de item extra
function validarItemExtra(data: any) {
  const errors: string[] = []
  
  if (data.nome !== undefined) {
    if (!data.nome || typeof data.nome !== 'string' || data.nome.trim().length === 0) {
      errors.push('Nome é obrigatório')
    }
  }
  
  if (data.descricao !== undefined && typeof data.descricao !== 'string') {
    errors.push('Descrição deve ser uma string')
  }
  
  if (data.valor !== undefined) {
    if (typeof data.valor !== 'number' || data.valor <= 0) {
      errors.push('Valor deve ser um número positivo')
    }
  }
  
  if (errors.length > 0) {
    throw new Error(errors.join(', '))
  }
  
  const result: any = {}
  if (data.nome !== undefined) result.nome = data.nome.trim()
  if (data.descricao !== undefined) result.descricao = data.descricao?.trim() || null
  if (data.valor !== undefined) result.valor = data.valor
  
  return result
}

// Função auxiliar para verificar se o item extra pertence ao usuário
async function verificarItemExtraDoUsuario(itemExtraId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from('itens_extras_pedidos')
    .select(`
      id,
      pedido:pedidos!inner(
        id,
        user_id
      )
    `)
    .eq('id', itemExtraId)
    .single()
  
  if (error || !data) {
    logger.error('Item extra não encontrado', { itemExtraId, userId, error })
    return false
  }
  
  // Verificar se data.pedido é array ou objeto
  const pedido = Array.isArray(data.pedido) ? data.pedido[0] : data.pedido
  
  if (!pedido || pedido.user_id !== userId) {
    logger.error('Item extra não pertence ao usuário', { itemExtraId, userId, pedidoUserId: pedido?.user_id })
    return false
  }
  
  return true
}

// GET - Obter detalhes de um item extra específico
export const GET = withAuth(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id: itemExtraId } = await params
    
    // Verificar autenticação
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token de autenticação não fornecido' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      logger.error('Erro de autenticação:', authError)
      return NextResponse.json({ error: 'Token de autenticação inválido' }, { status: 401 })
    }

    // Verificar se o item extra pertence ao usuário
    const itemExtraValido = await verificarItemExtraDoUsuario(itemExtraId, user.id)
    if (!itemExtraValido) {
      return NextResponse.json({ error: 'Item extra não encontrado ou não pertence ao usuário atual' }, { status: 404 })
    }

    // Buscar item extra
    const { data: itemExtra, error } = await supabaseAdmin
      .from('itens_extras_pedidos')
      .select('*')
      .eq('id', itemExtraId)
      .single()

    if (error) {
      logger.error('Erro ao buscar item extra:', error)
      return NextResponse.json({ error: 'Erro ao carregar item extra' }, { status: 500 })
    }

    return NextResponse.json({ data: itemExtra })
    
  } catch (error) {
    logger.error('Erro interno ao buscar item extra:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
})

// PUT - Atualizar um item extra
export const PUT = withAuth(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id: itemExtraId } = await params
    
    // Verificar autenticação
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token de autenticação não fornecido' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      logger.error('Erro de autenticação:', authError)
      return NextResponse.json({ error: 'Token de autenticação inválido' }, { status: 401 })
    }

    // Verificar se o item extra pertence ao usuário
    const itemExtraValido = await verificarItemExtraDoUsuario(itemExtraId, user.id)
    if (!itemExtraValido) {
      return NextResponse.json({ error: 'Item extra não encontrado ou não pertence ao usuário atual' }, { status: 404 })
    }

    // Validar dados da requisição
    const body = await req.json()
    const validatedData = validarItemExtra(body)

    // Verificar se há dados para atualizar
    if (Object.keys(validatedData).length === 0) {
      return NextResponse.json({ error: 'Nenhum dado para atualizar foi fornecido' }, { status: 400 })
    }

    // Atualizar item extra
    const { data: itemExtraAtualizado, error } = await supabaseAdmin
      .from('itens_extras_pedidos')
      .update(validatedData)
      .eq('id', itemExtraId)
      .select()
      .single()

    if (error) {
      logger.error('Erro ao atualizar item extra:', error)
      return NextResponse.json({ error: 'Erro ao atualizar item extra' }, { status: 500 })
    }

    logger.info('Item extra atualizado com sucesso', { itemExtraId })
    return NextResponse.json({ 
      message: 'Item extra atualizado com sucesso',
      data: itemExtraAtualizado 
    })
    
  } catch (error) {
    if (error instanceof Error) {
      // Se for erro de validação, retorna 400
      if (error.message.includes('obrigatório') || error.message.includes('deve ser')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }
    
    logger.error('Erro interno ao atualizar item extra:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
})

// DELETE - Excluir um item extra
export const DELETE = withAuth(async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  try {
    const { id: itemExtraId } = await params
    
    // Verificar autenticação
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token de autenticação não fornecido' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      logger.error('Erro de autenticação:', authError)
      return NextResponse.json({ error: 'Token de autenticação inválido' }, { status: 401 })
    }

    // Verificar se o item extra pertence ao usuário
    const itemExtraValido = await verificarItemExtraDoUsuario(itemExtraId, user.id)
    if (!itemExtraValido) {
      return NextResponse.json({ error: 'Item extra não encontrado ou não pertence ao usuário atual' }, { status: 404 })
    }

    // Excluir item extra
    const { error } = await supabaseAdmin
      .from('itens_extras_pedidos')
      .delete()
      .eq('id', itemExtraId)

    if (error) {
      logger.error('Erro ao excluir item extra:', error)
      return NextResponse.json({ error: 'Erro ao excluir item extra' }, { status: 500 })
    }

    logger.info('Item extra excluído com sucesso', { itemExtraId })
    return NextResponse.json({ message: 'Item extra excluído com sucesso' })
    
  } catch (error) {
    logger.error('Erro interno ao excluir item extra:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}) 