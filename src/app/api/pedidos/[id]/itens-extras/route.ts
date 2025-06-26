import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import logger from '@/utils/logger'

// Função para validar dados de item extra
interface ItemExtraInput {
  nome: string;
  descricao?: string;
  valor: number;
}

function validarItemExtra(data: ItemExtraInput) {
  const errors: string[] = []
  
  if (!data.nome || typeof data.nome !== 'string' || data.nome.trim().length === 0) {
    errors.push('Nome é obrigatório')
  }
  
  if (data.descricao !== undefined && typeof data.descricao !== 'string') {
    errors.push('Descrição deve ser uma string')
  }
  
  if (!data.valor || typeof data.valor !== 'number' || data.valor <= 0) {
    errors.push('Valor deve ser um número positivo')
  }
  
  if (errors.length > 0) {
    throw new Error(errors.join(', '))
  }
  
  return {
    nome: data.nome.trim(),
    descricao: data.descricao?.trim() || undefined,
    valor: data.valor
  }
}

// Função auxiliar para verificar se o pedido pertence ao usuário
async function verificarPedidoDoUsuario(pedidoId: string, userId: string) {
  const { data, error } = await supabaseAdmin
    .from('pedidos')
    .select('id')
    .eq('id', pedidoId)
    .eq('user_id', userId)
    .single()
  
  if (error || !data) {
    logger.error('Pedido não encontrado ou não pertence ao usuário', { pedidoId, userId, error })
    return false
  }
  
  return true
}

// GET - Listar itens extras de um pedido
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pedidoId } = await params
    
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

    // Verificar se o pedido pertence ao usuário
    const pedidoValido = await verificarPedidoDoUsuario(pedidoId, user.id)
    if (!pedidoValido) {
      return NextResponse.json({ error: 'Pedido não encontrado ou não pertence ao usuário atual' }, { status: 404 })
    }

    // Buscar itens extras do pedido
    const { data: itensExtras, error } = await supabaseAdmin
      .from('itens_extras_pedidos')
      .select('*')
      .eq('pedido_id', pedidoId)
      .order('created_at', { ascending: false })

    if (error) {
      logger.error('Erro ao buscar itens extras:', error)
      return NextResponse.json({ error: 'Erro ao carregar itens extras' }, { status: 500 })
    }

    return NextResponse.json({ data: itensExtras })
    
  } catch (error) {
    logger.error('Erro interno ao buscar itens extras:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

// POST - Criar um novo item extra para o pedido
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pedidoId } = await params
    
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

    // Verificar se o pedido pertence ao usuário
    const pedidoValido = await verificarPedidoDoUsuario(pedidoId, user.id)
    if (!pedidoValido) {
      return NextResponse.json({ error: 'Pedido não encontrado ou não pertence ao usuário atual' }, { status: 404 })
    }

    // Validar dados da requisição
    const body = await request.json()
    const validatedData = validarItemExtra(body)

    // Criar item extra
    const { data: novoItemExtra, error } = await supabaseAdmin
      .from('itens_extras_pedidos')
      .insert([{
        pedido_id: pedidoId,
        nome: validatedData.nome,
        descricao: validatedData.descricao,
        valor: validatedData.valor
      }])
      .select()
      .single()

    if (error) {
      logger.error('Erro ao criar item extra:', error)
      return NextResponse.json({ error: 'Erro ao criar item extra' }, { status: 500 })
    }

    logger.info('Item extra criado com sucesso', { itemExtraId: novoItemExtra.id, pedidoId })
    return NextResponse.json({ 
      message: 'Item extra criado com sucesso',
      data: novoItemExtra 
    }, { status: 201 })
    
  } catch (error) {
    if (error instanceof Error) {
      // Se for erro de validação, retorna 400
      if (error.message.includes('obrigatório') || error.message.includes('deve ser')) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }
    
    logger.error('Erro interno ao criar item extra:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
} 