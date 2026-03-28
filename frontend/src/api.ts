export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function handleResponse(res: Response) {
  if (res.status === 401) {
    throw new ApiError('Not authenticated', 401);
  }
  if (!res.ok) {
    let msg = 'API Error';
    try {
      const data = await res.json();
      msg = data.error || msg;
    } catch (e) {
      msg = res.statusText;
    }
    throw new ApiError(msg, res.status);
  }
  return res.json();
}

// Simple loader logic directly manipulating DOM for performance to match exact vanilla UX
let activeRequests = 0;
let loaderTimeout: number | null = null;

function toggleLoading(isLoading: boolean) {
  let loader = document.getElementById('global-loader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'global-loader';
    loader.className = 'global-loader';
    loader.innerHTML = '<div class="spinner"></div><span class="global-loader-text">Syncing...</span>';
    document.body.appendChild(loader);
  }
  
  activeRequests += isLoading ? 1 : -1;
  activeRequests = Math.max(0, activeRequests);
  
  if (activeRequests > 0) {
    if (loaderTimeout) clearTimeout(loaderTimeout);
    loader.classList.add('visible');
  } else {
    loaderTimeout = window.setTimeout(() => {
      if (activeRequests === 0) loader?.classList.remove('visible');
    }, 300);
  }
}

export const api = {
  async get<T = any>(url: string): Promise<T> {
    toggleLoading(true);
    try {
      const res = await fetch(url, { credentials: 'same-origin' });
      return await handleResponse(res);
    } finally {
      toggleLoading(false);
    }
  },
  
  async post<T = any>(url: string, data: any): Promise<T> {
    toggleLoading(true);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'same-origin'
      });
      return await handleResponse(res);
    } finally {
      toggleLoading(false);
    }
  },
  
  async put<T = any>(url: string, data: any): Promise<T> {
    toggleLoading(true);
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'same-origin'
      });
      return await handleResponse(res);
    } finally {
      toggleLoading(false);
    }
  },
  
  async del<T = any>(url: string): Promise<T> {
    toggleLoading(true);
    try {
      const res = await fetch(url, {
        method: 'DELETE',
        credentials: 'same-origin'
      });
      return await handleResponse(res);
    } finally {
      toggleLoading(false);
    }
  },
  
  async upload<T = any>(url: string, formData: FormData): Promise<T> {
    toggleLoading(true);
    try {
      const res = await fetch(url, {
        method: 'POST',
        body: formData,
        credentials: 'same-origin'
      });
      return await handleResponse(res);
    } finally {
      toggleLoading(false);
    }
  }
};
