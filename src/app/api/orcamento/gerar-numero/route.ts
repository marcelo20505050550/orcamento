import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { numero_manual } = await request.json()

    if (!numero_manual || isNaN(parseInt(numero_manual))) {
      return NextResponse.json({ error: 'Número manual é obrigatório e deve ser um número válido' }, { status: 400 })
    }

    const { data, error } = await supabase
      .rpc('gerar_numero_orcamento_manual', { numero_manual: parseInt(numero_manual) })

    if (error) {
      console.error('Erro ao gerar número de orçamento:', error)
      return NextResponse.json({ error: 'Erro ao gerar número de orçamento' }, { status: 500 })
    }

    return NextResponse.json({ numero: data })
  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}