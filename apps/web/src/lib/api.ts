import { useAuth } from '@clerk/nextjs';

/**
 * Centralized API client with automatic Clerk JWT injection.
 * Wraps fetch() and attaches Authorization: Bearer <token> headers.
 */
class ApiClient {
  private async getToken(): Promise<string | null> {
    // In browser context, useAuth hook isn't available outside components.
    // For server components / API routes, use the cookie directly.
    try {
      // @ts-ignore — Clerk window global for token retrieval
      if (typeof window !== 'undefined' && window.Clerk?.session) {
        // @ts-ignore
        return await window.Clerk.session.getToken();
      }
    } catch {
      // fall through
    }
    return null;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const token = await this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(endpoint, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      throw new Error('Unauthorized');
    }

    if (res.status === 403) {
      let message = 'Forbidden';
      try {
        const data = await res.json();
        message = data.error || message;
      } catch {
        const text = await res.text();
        message = text || message;
      }
      throw new Error(message);
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API error ${res.status}: ${text}`);
    }

    return res.json() as Promise<T>;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>('GET', endpoint);
  }

  async post<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    return this.request<T>('POST', endpoint, body);
  }

  async patch<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
    return this.request<T>('PATCH', endpoint, body);
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>('DELETE', endpoint);
  }
}

export const apiClient = new ApiClient();

/**
 * Hook version for React components that can use useAuth()
 */
export function useApiClient() {
  const { getToken } = useAuth();

  const request = async <T>(
    method: string,
    endpoint: string,
    body?: Record<string, unknown>
  ): Promise<T> => {
    const token = await getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(endpoint, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401) {
      throw new Error('Unauthorized');
    }

    if (res.status === 403) {
      let message = 'Forbidden';
      try {
        const data = await res.json();
        message = data.error || message;
      } catch {
        const text = await res.text();
        message = text || message;
      }
      throw new Error(message);
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API error ${res.status}: ${text}`);
    }

    return res.json() as Promise<T>;
  };

  return {
    get: <T>(endpoint: string) => request<T>('GET', endpoint),
    post: <T>(endpoint: string, body: Record<string, unknown>) => request<T>('POST', endpoint, body),
    patch: <T>(endpoint: string, body: Record<string, unknown>) => request<T>('PATCH', endpoint, body),
    delete: <T>(endpoint: string) => request<T>('DELETE', endpoint),
  };
}
