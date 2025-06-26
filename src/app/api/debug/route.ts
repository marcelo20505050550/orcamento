import { NextResponse } from 'next/server';

export async function GET() {
  try {
    return NextResponse.json({
      status: 'API Debug Route Working',
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL ? 'true' : 'false',
        VERCEL_ENV: process.env.VERCEL_ENV,
      },
      supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
        serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
        urlPreview: process.env.NEXT_PUBLIC_SUPABASE_URL ? 
          process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30) + '...' : 
          'NOT_SET'
      }
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Debug route failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
