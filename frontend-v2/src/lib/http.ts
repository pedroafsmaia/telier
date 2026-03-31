// Cliente HTTP base do Telier frontend-v2
// Wrapper fetch com token, timeout e tratamento de erro padronizado

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL?.trim() || '/api').replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = 30000;

// Token de autenticacao - sera injetado pelo modulo de auth
let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

// Tipos de erro da API
export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Falha de conexao com o servidor.') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends Error {
  constructor(message: string = 'Tempo limite atingido ao conectar ao servidor.') {
    super(message);
    this.name = 'TimeoutError';
  }
}

// Opcoes de requisicao
interface RequestOptions {
  timeout?: number;
  headers?: Record<string, string>;
}

export interface HttpMetaResponse<T> {
  data: T;
  headers: Headers;
}

function getPagesApiErrorMessage(status: number): string | null {
  if (typeof window === 'undefined') return null;
  if (!window.location.hostname.endsWith('pages.dev')) return null;
  if (!API_BASE_URL.startsWith('/')) return null;
  if (status !== 404 && status !== 405) return null;

  return 'A API nao esta configurada neste dominio. Configure o Cloudflare Pages para usar VITE_API_BASE_URL com a URL publica do Worker.';
}

// Funcao principal de requisicao HTTP
export async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = options.timeout ?? REQUEST_TIMEOUT_MS;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal: controller.signal,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TimeoutError();
    }
    throw new NetworkError();
  } finally {
    clearTimeout(timeoutId);
  }

  let data: T | null = null;
  try {
    const text = await response.text();
    if (text) {
      data = JSON.parse(text) as T;
    }
  } catch {
    if (!response.ok) {
      throw new ApiError(
        getPagesApiErrorMessage(response.status) || `Erro na requisicao (${response.status})`,
        response.status,
      );
    }
    throw new ApiError('Resposta invalida do servidor (nao e JSON).', response.status);
  }

  if (!response.ok) {
    const errorMessage =
      getPagesApiErrorMessage(response.status) ||
      (data as { error?: string })?.error ||
      `Erro na requisicao (${response.status})`;
    throw new ApiError(errorMessage, response.status);
  }

  return data as T;
}

export async function requestWithMeta<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<HttpMetaResponse<T>> {
  const controller = new AbortController();
  const timeoutMs = options.timeout ?? REQUEST_TIMEOUT_MS;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal: controller.signal,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new TimeoutError();
    }
    throw new NetworkError();
  } finally {
    clearTimeout(timeoutId);
  }

  let data: T | null = null;
  try {
    const text = await response.text();
    if (text) {
      data = JSON.parse(text) as T;
    }
  } catch {
    if (!response.ok) {
      throw new ApiError(
        getPagesApiErrorMessage(response.status) || `Erro na requisicao (${response.status})`,
        response.status,
      );
    }
    throw new ApiError('Resposta invalida do servidor (nao e JSON).', response.status);
  }

  if (!response.ok) {
    const errorMessage =
      getPagesApiErrorMessage(response.status) ||
      (data as { error?: string })?.error ||
      `Erro na requisicao (${response.status})`;
    throw new ApiError(errorMessage, response.status);
  }

  return {
    data: data as T,
    headers: response.headers,
  };
}

// Metodos de conveniencia
export const http = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
  getWithMeta: <T>(path: string, options?: RequestOptions) =>
    requestWithMeta<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('POST', path, body, options),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PUT', path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>('PATCH', path, body, options),
  delete: <T>(path: string, options?: RequestOptions) => request<T>('DELETE', path, undefined, options),
};

export default http;
