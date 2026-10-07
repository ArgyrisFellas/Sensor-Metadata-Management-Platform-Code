import type { Page } from './types';
import { demoMode, demoRequest } from './demo';

let csrfToken: string | null = null;
export class ApiError extends Error {
  status: number;
  details: unknown;
  constructor(status: number, details: unknown) {
    super(errorText(details));
    this.status = status;
    this.details = details;
  }
}

export function errorText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(errorText).join(' ');
  if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 1 && entries[0][0] === 'detail') return errorText(entries[0][1]);
    return entries.map(([key, item]) => `${key.replaceAll('_', ' ')}: ${errorText(item)}`).join(' · ');
  }
  return 'The request could not be completed. Please try again.';
}

export async function getCsrf(): Promise<string> {
  if (demoMode) return 'demo-only';
  const response = await fetch('/api/v1/auth/csrf/', { credentials: 'same-origin' });
  if (!response.ok) throw new ApiError(response.status, 'Unable to connect to Sensor Atlas. Check that the server is running.');
  const data = await response.json();
  csrfToken = data.csrfToken;
  if (!csrfToken) throw new Error('The server did not provide a security token.');
  return csrfToken;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (demoMode) return await demoRequest(path, init) as T;
  const headers = new Headers(init.headers);
  const method = init.method || 'GET';
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    headers.set('X-CSRFToken', csrfToken || await getCsrf());
  }
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const response = await fetch(path.startsWith('/api/') ? path : `/api/v1/${path}`, { ...init, headers, credentials: 'same-origin' });
  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('json') ? await response.json() : null;
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event('atlas:unauthorized'));
    throw new ApiError(response.status, data || `Request failed (${response.status}). Please check your connection and retry.`);
  }
  return data as T;
}

export async function mutate<T>(path: string, method: string, data?: unknown): Promise<T> {
  return api<T>(path, { method, body: data === undefined ? undefined : JSON.stringify(data) });
}

export async function allRecords<T>(path: string): Promise<T[]> {
  const separator = path.includes('?') ? '&' : '?';
  let page = 1;
  const records: T[] = [];
  while (true) {
    const data = await api<Page<T>>(`${path}${separator}page_size=500&page=${page}`);
    records.push(...data.results);
    if (!data.next) return records;
    page += 1;
    if (page > 1000) throw new Error('This list is too large to load at once. Please contact your administrator.');
  }
}

export async function login(username: string, password: string) {
  const user = await mutate<import('./types').User>('auth/login/', 'POST', { username, password });
  // Django rotates the CSRF secret on login. Refresh before the next mutation.
  await getCsrf();
  return user;
}
