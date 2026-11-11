/**
 * Centralized API client for GT ERP Backend
 * Connects directly to Express.js API on http://localhost:7000/api (or VITE_API_BASE_URL)
 */

const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:7000/api').trim();

// Normalize API_BASE_URL: ensure no trailing slash, ensure /api suffix if not already present
export const API_BASE_URL = (() => {
  if (rawBaseUrl === '/api' || rawBaseUrl.endsWith('/api')) {
    return rawBaseUrl.replace(/\/+$/, '');
  }
  return `${rawBaseUrl.replace(/\/+$/, '')}/api`;
})();

// Base server URL (without /api) for root health checks, uploads, or static paths
export const SERVER_BASE_URL = API_BASE_URL === '/api' ? '' : API_BASE_URL.replace(/\/api\/?$/, '');

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('gt_erp_token');
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    // Bypass ngrok free-tier browser interstitial warning page which lacks CORS headers
    'ngrok-skip-browser-warning': 'true',
    ...options.headers,
  };

  let url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (options.params && typeof options.params === 'object') {
    const query = new URLSearchParams();
    Object.entries(options.params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        query.append(key, val);
      }
    });
    const qs = query.toString();
    if (qs) {
      url += (url.includes('?') ? '&' : '?') + qs;
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 Unauthorized (Expired or invalid token)
    if (response.status === 401) {
      localStorage.removeItem('gt_erp_token');
      localStorage.removeItem('gt_erp_user');
      window.dispatchEvent(new Event('auth:unauthorized'));
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const detail = data.error
        ? (typeof data.error === 'string' ? data.error : data.error.message || JSON.stringify(data.error))
        : '';
      const errorMsg = detail && data.message
        ? `${data.message} (${detail})`
        : (detail || data.message || `Request failed with status ${response.status}`);
      const error = new Error(errorMsg);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    console.error(`API Error [${options.method || 'GET'} ${endpoint}]:`, error);
    throw error;
  }
}

const serializeBody = (body) => {
  if (body === undefined) return undefined;
  if (typeof FormData !== 'undefined' && body instanceof FormData) return body;
  if (typeof body === 'string') return body;
  return JSON.stringify(body);
};

export const api = {
  get: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'POST', body: serializeBody(body) }),
  put: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'PUT', body: serializeBody(body) }),
  patch: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'PATCH', body: serializeBody(body) }),
  delete: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'DELETE' }),
};

/**
 * Safely extracts an array from various backend response shapes:
 * - Direct array: [item, ...]
 * - Standard envelope: { data: [item, ...] }
 * - Keyed envelope: { data: { [key]: [item, ...] } }
 * - Double envelope: { data: { data: { [key]: [item, ...] } } }
 * - Top-level key: { [key]: [item, ...] }
 */
export const extractArray = (res, key) => {
  if (!res) return [];
  if (Array.isArray(res)) return res;
  if (key && Array.isArray(res[key])) return res[key];
  if (Array.isArray(res.data)) return res.data;
  if (key && Array.isArray(res.data?.[key])) return res.data[key];
  if (key && Array.isArray(res.data?.data?.[key])) return res.data.data[key];
  if (Array.isArray(res.data?.data)) return res.data.data;
  return [];
};

/**
 * Safely extracts an object/record from various backend response shapes.
 */
export const extractData = (res, key) => {
  if (!res) return null;
  if (key && res[key] && typeof res[key] === 'object' && !Array.isArray(res[key])) return res[key];
  if (key && res.data?.[key] && typeof res.data[key] === 'object' && !Array.isArray(res.data[key])) return res.data[key];
  if (key && res.data?.data?.[key] && typeof res.data.data[key] === 'object' && !Array.isArray(res.data.data[key])) return res.data.data[key];
  if (res.data?.data && typeof res.data.data === 'object' && !Array.isArray(res.data.data)) return res.data.data;
  if (res.data && typeof res.data === 'object' && !Array.isArray(res.data)) return res.data;
  if (typeof res === 'object' && !Array.isArray(res)) return res;
  return null;
};

export default api;
