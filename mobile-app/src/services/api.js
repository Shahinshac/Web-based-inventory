import Constants from 'expo-constants';

export const API_BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl || 'https://inventory-api.onrender.com';

export function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function apiGet(path, token) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function apiPost(path, body, token) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function apiPut(path, body, token) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function apiDelete(path, token) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return res.json();
}
