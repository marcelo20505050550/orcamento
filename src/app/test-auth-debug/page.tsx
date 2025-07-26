'use client';

import { useState, useEffect } from 'react';
import supabase from '@/lib/supabase/client';
import { api } from '@/lib/api';

export default function TestAuthDebug() {
  const [session, setSession] = useState<any>(null);
  const [token, setToken] = useState<string>('');
  const [testResults, setTestResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Verifica a sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setToken(session?.access_token || '');
    });

    // Escuta mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setToken(session?.access_token || '');
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const testProtectedRoute = async () => {
    setLoading(true);
    try {
      // Teste 1: Usar a função api.get (deveria funcionar se logado)
      console.log('🧪 Testing with api.get...');
      const result1 = await api.get('/api/test-protected-route');
      setTestResults(prev => ({
        ...prev,
        apiGet: { success: true, data: result1 }
      }));
    } catch (error) {
      console.error('Error with api.get:', error);
      setTestResults(prev => ({
        ...prev,
        apiGet: { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }));
    }

    try {
      // Teste 2: Fazer requisição manual com token
      console.log('🧪 Testing with manual fetch...');
      const response = await fetch('/api/test-protected-route', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const result2 = await response.json();
      setTestResults(prev => ({
        ...prev,
        manualFetch: { 
          success: response.ok, 
          status: response.status,
          data: result2 
        }
      }));
    } catch (error) {
      console.error('Error with manual fetch:', error);
      setTestResults(prev => ({
        ...prev,
        manualFetch: { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }));
    }

    try {
      // Teste 3: Rota não protegida (POST)
      console.log('🧪 Testing unprotected route...');
      const response = await fetch('/api/test-protected-route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result3 = await response.json();
      setTestResults(prev => ({
        ...prev,
        unprotectedRoute: { 
          success: response.ok, 
          status: response.status,
          data: result3 
        }
      }));
    } catch (error) {
      console.error('Error with unprotected route:', error);
      setTestResults(prev => ({
        ...prev,
        unprotectedRoute: { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }));
    }

    setLoading(false);
  };

  const testOtherApis = async () => {
    setLoading(true);
    try {
      // Teste das outras APIs que estavam dando erro 500
      const tests = [
        { name: 'produtos', endpoint: '/produtos' },
        { name: 'produtos', endpoint: '/produtos' },
        { name: 'processos', endpoint: '/processos' },
        { name: 'mao-de-obra', endpoint: '/mao-de-obra' }
      ];

      for (const test of tests) {
        try {
          console.log(`🧪 Testing ${test.name}...`);
          const result = await api.get(test.endpoint);
          setTestResults(prev => ({
            ...prev,
            [test.name]: { success: true, data: result }
          }));
        } catch (error) {
          console.error(`Error with ${test.name}:`, error);
          setTestResults(prev => ({
            ...prev,
            [test.name]: { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
          }));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    const email = prompt('Email:');
    const password = prompt('Senha:');
    
    if (email && password) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        alert('Erro no login: ' + error.message);
      }
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">🔐 Teste de Autenticação e APIs</h1>
      
      {/* Status da sessão */}
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Status da Sessão</h2>
        {session ? (
          <div className="space-y-2">
            <p><strong>Email:</strong> {session.user.email}</p>
            <p><strong>User ID:</strong> {session.user.id}</p>
            <p><strong>Token (primeiros 50 chars):</strong> {token.substring(0, 50)}...</p>
            <p><strong>Token Length:</strong> {token.length}</p>
            <button 
              onClick={logout}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Logout
            </button>
          </div>
        ) : (
          <div>
            <p>Não logado</p>
            <button 
              onClick={login}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Login
            </button>
          </div>
        )}
      </div>

      {/* Testes */}
      <div className="space-y-4">
        <button
          onClick={testProtectedRoute}
          disabled={loading || !session}
          className="bg-green-500 text-white px-6 py-3 rounded hover:bg-green-600 disabled:bg-gray-400"
        >
          {loading ? 'Testando...' : '🧪 Testar Rota Protegida'}
        </button>

        <button
          onClick={testOtherApis}
          disabled={loading || !session}
          className="bg-purple-500 text-white px-6 py-3 rounded hover:bg-purple-600 disabled:bg-gray-400 ml-4"
        >
          {loading ? 'Testando...' : '🧪 Testar APIs Principais'}
        </button>
      </div>

      {/* Resultados */}
      {Object.keys(testResults).length > 0 && (
        <div className="bg-gray-100 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Resultados dos Testes</h2>
          <pre className="text-sm bg-white p-4 rounded border overflow-x-auto">
            {JSON.stringify(testResults, null, 2)}
          </pre>
        </div>
      )}

      {/* Links de teste */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Links de Teste (sem autenticação)</h2>
        <div className="space-y-2">
          <a href="/api/debug" target="_blank" className="block text-blue-600 hover:underline">
            /api/debug
          </a>
          <a href="/api/produtos-test" target="_blank" className="block text-blue-600 hover:underline">
            /api/produtos-test
          </a>
          <a href="/api/produtos-test" target="_blank" className="block text-blue-600 hover:underline">
            /api/produtos-test
          </a>
        </div>
      </div>
    </div>
  );
} 