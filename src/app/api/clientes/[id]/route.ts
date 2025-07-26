import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { data, error } = await supabaseAdmin
      .from('clientes')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Cliente não encontrado' },
          { status: 404 }
        )
      }
      console.error('Erro ao buscar cliente:', error)
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Validações básicas
    if (!body.nome_cliente_empresa?.trim()) {
      return NextResponse.json(
        { error: 'Nome do cliente/empresa é obrigatório' },
        { status: 400 }
      )
    }

    if (!body.nome_responsavel?.trim()) {
      return NextResponse.json(
        { error: 'Nome do responsável é obrigatório' },
        { status: 400 }
      )
    }

    if (!body.telefone_whatsapp?.trim()) {
      return NextResponse.json(
        { error: 'Telefone/WhatsApp é obrigatório' },
        { status: 400 }
      )
    }

    if (!body.cidade?.trim()) {
      return NextResponse.json(
        { error: 'Cidade é obrigatória' },
        { status: 400 }
      )
    }

    if (!body.estado_uf?.trim()) {
      return NextResponse.json(
        { error: 'Estado (UF) é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se o cliente existe
    const { data: clienteExistente, error: erroVerificacao } = await supabaseAdmin
      .from('clientes')
      .select('id')
      .eq('id', id)
      .single()

    if (erroVerificacao) {
      if (erroVerificacao.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Cliente não encontrado' },
          { status: 404 }
        )
      }
      console.error('Erro ao verificar cliente:', erroVerificacao)
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

    const clienteData = {
      nome_cliente_empresa: body.nome_cliente_empresa.trim(),
      cnpj_cpf: body.cnpj_cpf?.trim() || null,
      nome_responsavel: body.nome_responsavel.trim(),
      telefone_whatsapp: body.telefone_whatsapp.trim(),
      email: body.email?.trim() || null,
      cidade: body.cidade.trim(),
      estado_uf: body.estado_uf.trim(),
      tipo_interesse: body.tipo_interesse?.trim() || null,
      descricao_demanda: body.descricao_demanda?.trim() || null,
      origem_contato: body.origem_contato?.trim() || null,
      status_orcamento: body.status_orcamento || 'aberto'
    }

    const { data, error } = await supabaseAdmin
      .from('clientes')
      .update(clienteData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar cliente:', error)
      return NextResponse.json(
        { error: 'Erro ao atualizar cliente' },
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

    // Verificar se existem pedidos associados ao cliente
    const { data: pedidosAssociados, error: erroPedidos } = await supabaseAdmin
      .from('pedidos')
      .select('id')
      .eq('cliente_id', id)
      .limit(1)

    if (erroPedidos) {
      console.error('Erro ao verificar pedidos associados:', erroPedidos)
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

    if (pedidosAssociados && pedidosAssociados.length > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir cliente com pedidos associados' },
        { status: 400 }
      )
    }

    // Verificar se o cliente existe
    const { data: clienteExistente, error: erroVerificacao } = await supabaseAdmin
      .from('clientes')
      .select('id')
      .eq('id', id)
      .single()

    if (erroVerificacao) {
      if (erroVerificacao.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Cliente não encontrado' },
          { status: 404 }
        )
      }
      console.error('Erro ao verificar cliente:', erroVerificacao)
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      )
    }

    const { error } = await supabaseAdmin
      .from('clientes')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erro ao excluir cliente:', error)
      return NextResponse.json(
        { error: 'Erro ao excluir cliente' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Cliente excluído com sucesso' })
  } catch (error) {
    console.error('Erro inesperado:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}