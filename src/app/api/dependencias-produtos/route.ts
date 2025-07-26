/**
 * API para buscar todas as dependências entre produtos
 */
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(_req: NextRequest) {
    try {
        const { data: dependencias, error } = await supabaseAdmin
            .from('dependencias_produtos')
            .select('produto_pai_id, produto_filho_id, quantidade_necessaria');

        if (error) {
            console.error('Erro ao buscar dependências:', error);
            return NextResponse.json(
                { error: 'Erro ao buscar dependências' },
                { status: 500 }
            );
        }

        return NextResponse.json({ data: dependencias || [] });
    } catch (error) {
        console.error('Erro não tratado ao buscar dependências:', error);
        return NextResponse.json(
            { error: 'Erro interno ao processar a requisição' },
            { status: 500 }
        );
    }
}