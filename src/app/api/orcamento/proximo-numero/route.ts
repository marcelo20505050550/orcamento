import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  try {
    // Retorna apenas o ano atual para formar o padrão BV-[manual]-25
    const anoAtual = new Date().getFullYear()
    const anoFormatado = anoAtual.toString().slice(-2)
    
    return NextResponse.json({ 
      ano: anoFormatado,
      formato: `BV-[número]-${anoFormatado}`,
      exemplo: `BV-00001-${anoFormatado}`
    })
  } catch (error) {
    console.error('Erro interno:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}