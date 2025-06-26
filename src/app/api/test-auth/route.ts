import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    console.log(' [TEST-AUTH] Starting test auth route');
    
    // Verifica variáveis de ambiente
    const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    console.log(' [TEST-AUTH] Environment check:', { hasUrl, hasKey });
    
    if (!hasUrl || !hasKey) {
      return NextResponse.json({
        error: 'Missing environment variables',
        hasUrl,
        hasKey
      }, { status: 500 });
    }
    
    // Testa conexão com o banco
    console.log(' [TEST-AUTH] Testing database connection...');
    const { data, error } = await supabaseAdmin
      .from('produtos')
      .select('count', { count: 'exact', head: true });
    
    console.log(' [TEST-AUTH] Database test result:', { 
      hasData: !!data, 
      hasError: !!error,
      errorMessage: error?.message 
    });
    
    if (error) {
      return NextResponse.json({
        error: 'Database connection failed',
        message: error.message,
        details: error
      }, { status: 500 });
    }
    
    // Testa autenticação se token fornecido
    const authHeader = req.headers.get('authorization');
    let authTest = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      console.log(' [TEST-AUTH] Testing token authentication...');
      
      const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
      
      authTest = {
        hasToken: true,
        tokenLength: token.length,
        isValid: !authError && !!userData.user,
        error: authError?.message,
        userId: userData.user?.id
      };
    } else {
      authTest = {
        hasToken: false,
        message: 'No authorization header provided'
      };
    }
    
    return NextResponse.json({
      status: 'Test route working',
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: !!process.env.VERCEL,
        hasSupabaseUrl: hasUrl,
        hasServiceKey: hasKey
      },
      database: {
        connected: !error,
        error: error?.message
      },
      authentication: authTest
    });
    
  } catch (error) {
    console.error(' [TEST-AUTH] Exception:', error);
    return NextResponse.json({
      error: 'Test route failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack'
    }, { status: 500 });
  }
}
