import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verificar se o pedido existe
    const { data: pedidoExistente, error: erroPedido } = await supabaseAdmin
      .from('pedidos')
      .select('id')
      .eq('id', id)
      .single()

    if (erroPedido) {
      if (erroPedido.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Pedido não encontrado' },
          { status: 404 }
        )
      }
      console.error('Erro ao verificar pedido:', erroPedido)
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('observacoes_pedidos')
      .select('*')
      .eq('pedido_id', id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Erro ao buscar observações:', error)
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Erro inesperado:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Validações básicas
    if (!body.observacao?.trim()) {
      return NextResponse.json(
        { error: 'Observação é obrigatória' },
        { status: 400 }
      )
    }

    // Verificar se o pedido existe
    const { data: pedidoExistente, error: erroPedido } = await supabaseAdmin
      .from('pedidos')
      .select('id')
      .eq('id', id)
      .single()

    if (erroPedido) {
      if (erroPedido.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Pedido não encontrado' },
          { status: 404 }
        )
      }
      console.error('Erro ao verificar pedido:', erroPedido)
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

    const observacaoData = {
      pedido_id: id,
      observacao: body.observacao.trim()
    }

    const { data, error } = await supabaseAdmin
      .from('observacoes_pedidos')
      .insert([observacaoData])
      .select()
      .single()

    if (error) {
      console.error('Erro ao criar observação:', error)
      return NextResponse.json(
        { error: 'Erro ao criar observação' },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erro inesperado:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}