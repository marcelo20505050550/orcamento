import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('empresa_config')
      .select('*')
      .single()

    if (error) {
      console.error('Erro ao buscar configurações da empresa:', error)
      return NextResponse.json({ error: 'Erro ao buscar configurações da empresa' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    const { data, error } = await supabase
      .from('empresa_config')
      .update({
        nome_empresa: body.nome_empresa,
        cnpj: body.cnpj,
        inscricao_estadual: body.inscricao_estadual,
        endereco: body.endereco,
        telefone_1: body.telefone_1,
        telefone_2: body.telefone_2,
        email: body.email,
        instagram: body.instagram,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.id)
      .select()
      .single()

    if (error) {
      console.error('Erro ao atualizar configurações da empresa:', error)
      return NextResponse.json({ error: 'Erro ao atualizar configurações da empresa' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}