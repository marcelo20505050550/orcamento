import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { valor_frete } = body

    if (valor_frete !== undefined && valor_frete < 0) {
      return NextResponse.json({ error: 'Valor do frete deve ser maior ou igual a zero' }, { status: 400 })
    }

    const supabase = supabaseAdmin

    const updateData: any = {
      updated_at: new Date().toISOString()
    }



    if (valor_frete !== undefined) {
      updateData.valor_frete = valor_frete
      updateData.tem_frete = valor_frete > 0
    }

    const { data: pedido, error } = await supabase
      .from('pedidos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar taxas do pedido:', error)
      return NextResponse.json({ error: 'Erro ao atualizar taxas do pedido' }, { status: 500 })
    }

    return NextResponse.json(pedido)
  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}