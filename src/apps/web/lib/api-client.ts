// (Admin tests helper removed here in favor of ApiClient-backed `api` below)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
      } catch (e) { }
      console.error(`GET ${endpoint} failed:`, errorMessage);
      throw new Error(errorMessage);
    }
    return response.json();
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      let errorMessage = `API Error: ${response.status}`;
      try { const errorData = await response.json(); errorMessage = errorData.message || errorData.error; } catch (e) { }
      throw new Error(errorMessage);
    }
    return response.json();
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      let errorMessage = `API Error: ${response.status}`;
      try { const errorData = await response.json(); errorMessage = errorData.message || errorData.error; } catch (e) { }
      throw new Error(errorMessage);
    }
    return response.json();
  }

  async patch<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      let errorMessage = `API Error: ${response.status}`;
      try { const errorData = await response.json(); errorMessage = errorData.message || errorData.error; } catch (e) { }
      throw new Error(errorMessage);
    }
    return response.json();
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    });
    if (!response.ok) {
      let errorMessage = `API Error: ${response.status}`;
      try { const errorData = await response.json(); errorMessage = errorData.message || errorData.error; } catch (e) { }
      throw new Error(errorMessage);
    }
    return response.json();
  }
}

export const apiClient = new ApiClient();

export const api = {
  users: {
    getAll: () => apiClient.get<any[]>('/api/users'),
    getById: (id: string) => apiClient.get<any>(`/api/users/${id}`),
    create: (data: any) => apiClient.post<any>('/api/users', data),
    update: (id: string, data: any) => apiClient.put<any>(`/api/users/${id}`, data),
    delete: (id: string) => apiClient.delete<any>(`/api/users/${id}`),
  },

  tests: {
    getAll: (params?: {
      query?: string;
      type?: string;
      category?: string;
      status?: string;
      sort?: string;
      page?: number;
      limit?: number;
      userId?: string;
    }) => {
      const searchParams = new URLSearchParams();
      if (params) {
        if (params.query) searchParams.set('query', params.query);
        if (params.category && params.category !== 'all') searchParams.set('category', params.category);
        if (params.status && params.status !== 'all') searchParams.set('status', params.status);
        if (params.sort) searchParams.set('sort', params.sort);
        if (params.userId) searchParams.set('userId', params.userId); // <--- THÊM

        if (params.page) searchParams.set('page', params.page.toString());
        if (params.limit) searchParams.set('limit', params.limit.toString());
      }
      return apiClient.get<any>(`/api/tests?${searchParams.toString()}`);
    },
    getById: (id: string) => apiClient.get<any>(`/api/tests/${id}`),
    create: (data: any) => apiClient.post<any>('/api/tests', data),
    update: (id: string, data: any) => apiClient.put<any>(`/api/tests/${id}`, data),
    delete: (id: string) => apiClient.delete<any>(`/api/tests/${id}`),
    getPages: (trialId: string) => apiClient.get<any>(`/api/exam/${trialId}/pages`),
  },

  trials: {
    getAll: () => apiClient.get<any[]>('/api/trials'),
    getById: (id: string) => apiClient.get<any>(`/api/trials/${id}`),
    create: (data: any) => apiClient.post<any>('/api/trials', data),
    update: (id: string, data: any) => apiClient.put<any>(`/api/trials/${id}`, data),
    getByStudent: (studentId: string) =>
      apiClient.get<any>(`/api/students/${encodeURIComponent(studentId)}/trials`),
    getDetails: (trialId: string) =>
      apiClient.get<any>(`/api/trials/${encodeURIComponent(trialId)}/details`),
    cleanup: (trialId: string) => apiClient.post<any>('/api/trials/cleanup', { trialId }),
  },
  responses: {
    getAll: () => apiClient.get<any[]>('/api/responses'),
    getByTrial: (trialId: string) => apiClient.get<any[]>(`/api/responses?trialId=${trialId}`),
    create: (data: any) => apiClient.post<any>('/api/responses', data),
  },
  jobs: {
    scoreTest: (data: { trialId: string; userId: string }) =>
      apiClient.post<any>('/api/jobs/score-test', data),
    getStatus: (jobId: string) => apiClient.get<any>(`/api/jobs/status/${jobId}`),
    triggerIrt: (testId: string) =>
      apiClient.post<any>(`/api/tests/${encodeURIComponent(testId)}/calculate-irt`, {}),
  },
  health: {
    check: () => apiClient.get<any>('/health'),
    checkQueue: () => apiClient.get<any>('/health/queue'),
  },
  auth: {
    signup: (data: { name: string; email: string; password: string }) =>
      apiClient.post<any>('/api/auth/signup', data),
    login: (data: { email: string; password: string; captchaToken: string }) =>
      apiClient.post<any>('/api/auth/login', data),
    oauthGoogle: (data: { email: string; name?: string; picture?: string }) =>
      apiClient.post<any>('/api/auth/oauth/google', data),
    sendOtp: (data: { email: string; name: string }) =>
      apiClient.post<any>('/api/auth/send-otp', data),
    verifyOtp: (data: { email: string; code: string }) =>
      apiClient.post<any>('/api/auth/verify-otp', data),
    completeSignup: (data: { email: string; password: string }) =>
      apiClient.post<any>('/api/auth/complete-signup', data),
    // Forgot password
    forgotPasswordSendOtp: (data: { email: string }) =>
      apiClient.post<any>('/api/auth/forgot-password/send-otp', data),
    forgotPasswordVerifyOtp: (data: { email: string; code: string }) =>
      apiClient.post<any>('/api/auth/forgot-password/verify-otp', data),
    forgotPasswordReset: (data: { email: string; password: string }) =>
      apiClient.post<any>('/api/auth/forgot-password/reset', data),
  },
  admin: {
    tests: {
      // use relative fetch when running in browser so requests hit Next.js API routes
      getAll: (params?: Record<string, any>) => {
        if (typeof window !== 'undefined') {
          const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
          return fetch('/api/admin/tests' + qs).then(r => r.json());
        }
        const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
        return apiClient.get<any>('/api/admin/tests' + qs);
      },

      create: (data: any) => {
        if (typeof window !== 'undefined') {
          // allow sending FormData directly from browser
          if (data instanceof FormData) return fetch('/api/admin/tests', { method: 'POST', body: data }).then(r => r.json());
          return fetch('/api/admin/tests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json());
        }
        return apiClient.post<any>('/api/admin/tests', data);
      },

      update: (data: any) => {
        if (typeof window !== 'undefined') {
          return fetch('/api/admin/tests', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json());
        }
        return apiClient.put<any>('/api/admin/tests', data);
      },

      delete: (testId: string) => {
        if (typeof window !== 'undefined') {
          return fetch(`/api/admin/tests?test_id=${encodeURIComponent(testId)}`, { method: 'DELETE' }).then(r => r.json());
        }
        return apiClient.delete<any>(`/api/admin/tests?test_id=${encodeURIComponent(testId)}`);
      },

      // aliases using get/post/put/delete naming preferred by new code
      get: (params?: Record<string, any>) => {
        const qs = params ? '?' + new URLSearchParams(params as any).toString() : '';
        if (typeof window !== 'undefined') return fetch('/api/admin/tests' + qs).then(r => r.json());
        return apiClient.get<any>('/api/admin/tests' + qs);
      },
      post: (data: any) => {
        if (typeof window !== 'undefined') {
          if (data instanceof FormData) return fetch('/api/admin/tests', { method: 'POST', body: data }).then(r => r.json());
          return fetch('/api/admin/tests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json());
        }
        return apiClient.post<any>('/api/admin/tests', data);
      },
      put: (data: any) => {
        if (typeof window !== 'undefined') {
          return fetch('/api/admin/tests', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json());
        }
        return apiClient.put<any>('/api/admin/tests', data);
      },
    },
    users: {
      list: () => {
        if (typeof window !== 'undefined') {
          return fetch('/api/admin/users').then(r => r.json());
        }
        return apiClient.get<any>('/api/admin/users');
      },
      updateRole: (userId: string, role: 'Student' | 'Admin') => {
        const payload = { userId, role };
        if (typeof window !== 'undefined') {
          return fetch('/api/admin/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }).then(r => r.json());
        }
        return apiClient.patch<any>('/api/admin/users', payload);
      },
    },
  },
  teachers: {
    getAll: () => apiClient.get<any>('/api/teachers'),
    create: (data: any) => apiClient.post<any>('/api/teachers', data),
    update: (data: any) => apiClient.put<any>('/api/teachers', data),
    delete: (teacherId: string) => apiClient.delete<any>(`/api/teachers?teacher_id=${encodeURIComponent(teacherId)}`),
  },
  leaderboard: {
    get: (testId?: string) => {
      const query = testId ? `?testId=${testId}` : '';
      return apiClient.get<any>(`/api/leaderboard${query}`);
    },
    getExams: () => apiClient.get<any>('/api/leaderboard/exams'),
    getLatest: () => apiClient.get<any>('/api/leaderboard/latest'),
  },
  news: {
    getAll: () => apiClient.get<any>('/api/news'),
  },
  userStats: {
    get: () => {
      if (typeof window !== 'undefined') {
        return fetch('/api/user/stats').then(r => r.json());
      }
      return apiClient.get<any>('/api/user/stats');
    },
  },
  notifications: {
    getAll: () => apiClient.get<any>('/api/notifications'),
    getVersion: () => apiClient.get<any>('/api/notifications/version'),
    create: (data: { title: string; message?: string; type: string; link?: string; userId?: string }) =>
      apiClient.post<any>('/api/notifications', data),
  },
};

export default api;