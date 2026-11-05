/**
 * Custom fetch mutator used by the generated Orval client (ADR 0011).
 *
 * - prefixes every URL with `/api` (Caddy and the Vite dev proxy both mount the API there)
 * - passes the AbortSignal through, so TanStack Query can cancel stale requests
 * - throws `ApiError` for non-2xx responses (parsing `application/problem+json`)
 * - throws `NetworkError` when the request never reached the server
 * - resolves to `{ data, status, headers }`, the shape the generated code expects
 */

export const API_BASE = '/api';

export interface Problem {
  type?: string;
  title?: string;
  status?: number;
  detail?: string | null;
  errors?: { field: string; message: string; type?: string }[];
}

export class ApiError extends Error {
  readonly status: number;
  readonly problem: Problem;
  /** Dotted field path (for example `address.city`) to the first message for that field. */
  readonly fieldErrors: Record<string, string>;

  constructor(status: number, problem: Problem) {
    super(problem.detail || problem.title || `Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.problem = problem;
    this.fieldErrors = {};
    for (const error of problem.errors ?? []) {
      if (!(error.field in this.fieldErrors)) this.fieldErrors[error.field] = error.message;
    }
  }
}

export class NetworkError extends Error {
  constructor(options?: ErrorOptions) {
    super("Couldn't reach the server.", options);
    this.name = 'NetworkError';
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;
export const isNetworkError = (error: unknown): error is NetworkError =>
  error instanceof NetworkError;

const isAbort = (error: unknown, signal?: AbortSignal | null) =>
  signal?.aborted === true || (error instanceof DOMException && error.name === 'AbortError');

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export async function http<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${url}`, {
      ...init,
      headers: { Accept: 'application/json, application/problem+json', ...init?.headers },
    });
  } catch (error) {
    if (isAbort(error, init?.signal)) throw error;
    throw new NetworkError({ cause: error });
  }

  const data = await readBody(response);
  if (!response.ok) {
    const problem: Problem =
      typeof data === 'object' && data !== null
        ? (data as Problem)
        : { status: response.status, title: response.statusText };
    throw new ApiError(response.status, problem);
  }
  return { data, status: response.status, headers: response.headers } as T;
}
