const CUSTOMER_TOKEN_KEY = 'mns_customer_jwt';
const ADMIN_TOKEN_KEY = 'mns_admin_jwt';

export function getCustomerToken(): string | null {
  return localStorage.getItem(CUSTOMER_TOKEN_KEY) || sessionStorage.getItem(CUSTOMER_TOKEN_KEY);
}

export function setCustomerToken(token: string | null, remember = true) {
  localStorage.removeItem(CUSTOMER_TOKEN_KEY);
  sessionStorage.removeItem(CUSTOMER_TOKEN_KEY);
  if (token) {
    if (remember) localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
    else sessionStorage.setItem(CUSTOMER_TOKEN_KEY, token);
  }
}

export function getAdminToken(): string | null {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

export function setAdminToken(token: string | null) {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  if (token) sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
}

export async function apiRequest<T = any>(
  url: string,
  options: RequestInit & { authMode?: 'customer' | 'admin' | 'none' } = {}
): Promise<T> {
  const { authMode = 'customer', headers, ...rest } = options;
  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string> | undefined),
  };

  if (authMode === 'customer') {
    const token = getCustomerToken();
    if (token) finalHeaders['Authorization'] = `Bearer ${token}`;
  } else if (authMode === 'admin') {
    const token = getAdminToken();
    if (token) finalHeaders['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...rest,
    headers: finalHeaders,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}
