import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')
        const search = searchParams.get('search') || ''
        const status = searchParams.get('status') || ''

        const offset = (page - 1) * limit

        let query = supabaseAdmin
            .from('clientes')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })

        // Filtro por busca (nome do cliente/empresa ou responsável)
        if (search) {
            query = query.or(`nome_cliente_empresa.ilike.%${search}%,nome_responsavel.ilike.%${search}%`)
        }

        // Filtro por status
        if (status) {
            query = query.eq('status_orcamento', status)
        }

        // Paginação
        query = query.range(offset, offset + limit - 1)

        const { data, error, count } = await query

        if (error) {
            console.error('Erro ao buscar clientes:', error)
            return NextResponse.json(
                { error: 'Erro interno do servidor' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            data: data || [],
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit)
            }
        })
    } catch (error) {
        console.error('Erro inesperado:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}

export async function POST(request: NextRequest) {
    try {
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

        // Calcular data de cancelamento automático (7 dias a partir de agora)
        const dataCancelamento = new Date()
        dataCancelamento.setDate(dataCancelamento.getDate() + 7)

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
            status_orcamento: 'aberto',
            data_cancelamento_automatico: dataCancelamento.toISOString()
        }

        const { data, error } = await supabaseAdmin
            .from('clientes')
            .insert([clienteData])
            .select()
            .single()

        if (error) {
            console.error('Erro ao criar cliente:', error)
            return NextResponse.json(
                { error: 'Erro ao criar cliente' },
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