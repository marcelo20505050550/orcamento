/**
 * API para forçar o recálculo de custos de um produto
 * Remove o cache existente e força um novo cálculo
 */
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
    _req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: produtoId } = await params;
        
        if (!produtoId) {
            return NextResponse.json(
                { error: 'ID do produto não fornecido' },
                { status: 400 }
            );
        }

        console.log('[RECALCULAR API] Forçando recálculo para produto:', produtoId);

        // Não precisa invalidar cache, pois agora salvamos diretamente na tabela

        // Fazer uma nova requisição para a API de custo total para forçar o recálculo
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/produtos/${produtoId}/custo-total`);
        
        if (!response.ok) {
            throw new Error('Erro ao recalcular custo');
        }

        const resultado = await response.json();

        console.log('[RECALCULAR API] Recálculo concluído para produto:', produtoId);

        return NextResponse.json({
            success: true,
            message: 'Custo recalculado com sucesso',
            resultado
        });

    } catch (error) {
        console.error('[RECALCULAR API] Erro ao recalcular custo:', error);
        return NextResponse.json(
            { error: 'Erro interno ao recalcular custo' },
            { status: 500 }
        );
    }
}