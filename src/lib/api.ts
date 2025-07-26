/**
 * Utilitário para chamadas de API com tratamento de autenticação e erros
 */
import supabase from './supabase/client';

// Tipo para opções de requisição
interface RequestOptions extends RequestInit {
  requireAuth?: boolean;
  params?: Record<string, string>;
}

// Função principal para fazer requisições à API
export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  // Verifica se o endpoint já começa com /api/
  const apiEndpoint = endpoint.startsWith('/api/') 
    ? endpoint 
    : `/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  // Configura os headers básicos
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  
  // Adiciona o token de autenticação se necessário
  if (options.requireAuth !== false) {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError.message);
      }
      
      const token = session?.access_token;
      
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      } else if (options.requireAuth) {
        throw new Error('Autenticação necessária para acessar este recurso');
      }
    } catch (error) {
      console.error('Auth error:', error);
      if (options.requireAuth) {
        throw new Error('Falha na autenticação');
      }
    }
  }
  
  // Adiciona parâmetros de query string, se fornecidos
  let url = apiEndpoint;
  if (options.params) {
    const queryParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value);
      }
    });
    
    const queryString = queryParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }
  
  // Faz a requisição
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    // Verifica por erros HTTP
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const errorMessage = errorData?.error || errorData?.message || 'Erro desconhecido';
      
      throw new Error(
        `Erro ${response.status}: ${errorMessage}`
      );
    }
    
    // Verifica se a resposta é JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return await response.text() as unknown as T;
  } catch (error) {
    console.error(`Erro ao chamar API ${apiEndpoint}:`, error);
    throw error;
  }
}

// Métodos auxiliares para diferentes tipos de requisições
export const api = {
  get<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return fetchApi<T>(endpoint, { ...options, method: 'GET' });
  },
  
  post<T = any>(endpoint: string, data: any, options: RequestOptions = {}): Promise<T> {
    return fetchApi<T>(endpoint, { 
      ...options, 
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  put<T = any>(endpoint: string, data: any, options: RequestOptions = {}): Promise<T> {
    return fetchApi<T>(endpoint, { 
      ...options, 
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  patch<T = any>(endpoint: string, data: any, options: RequestOptions = {}): Promise<T> {
    return fetchApi<T>(endpoint, { 
      ...options, 
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
  
  delete<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    return fetchApi<T>(endpoint, { ...options, method: 'DELETE' });
  },
};

export default api; 