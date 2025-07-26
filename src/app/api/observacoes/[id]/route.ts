import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function PUT(
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

    // Verificar se a observação existe
    const { data: observacaoExistente, error: erroVerificacao } = await supabaseAdmin
      .from('observacoes_pedidos')
      .select('id')
      .eq('id', id)
      .single()

    if (erroVerificacao) {
      if (erroVerificacao.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Observação não encontrada' },
          { status: 404 }
        )
      }
      console.error('Erro ao verificar observação:', erroVerificacao)
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

    const { data, error } = await supabaseAdmin
      .from('observacoes_pedidos')
      .update({ observacao: body.observacao.trim() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar observação:', error)
      return NextResponse.json(
        { error: 'Erro ao atualizar observação' },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erro inesperado:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Verificar se a observação existe
    const { data: observacaoExistente, error: erroVerificacao } = await supabaseAdmin
      .from('observacoes_pedidos')
      .select('id')
      .eq('id', id)
      .single()

    if (erroVerificacao) {
      if (erroVerificacao.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Observação não encontrada' },
          { status: 404 }
        )
      }
      console.error('Erro ao verificar observação:', erroVerificacao)
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

    const { error } = await supabaseAdmin
      .from('observacoes_pedidos')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erro ao excluir observação:', error)
      return NextResponse.json(
        { error: 'Erro ao excluir observação' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Observação excluída com sucesso' })
  } catch (error) {
    console.error('Erro inesperado:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}