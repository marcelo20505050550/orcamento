import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { tipo_imposto, percentual } = body

    if (!tipo_imposto || percentual === undefined) {
      return NextResponse.json({ error: 'Tipo de imposto e percentual são obrigatórios' }, { status: 400 })
    }

    if (percentual < 0) {
      return NextResponse.json({ error: 'Percentual deve ser maior ou igual a zero' }, { status: 400 })
    }

    const supabase = supabaseAdmin

    const { data: imposto, error } = await supabase
      .from('impostos_pedidos')
      .update({
        tipo_imposto,
        percentual,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar imposto:', error)
      return NextResponse.json({ error: 'Erro ao atualizar imposto' }, { status: 500 })
    }

    return NextResponse.json(imposto)
  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = supabaseAdmin

    const { error } = await supabase
      .from('impostos_pedidos')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erro ao excluir imposto:', error)
      return NextResponse.json({ error: 'Erro ao excluir imposto' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}