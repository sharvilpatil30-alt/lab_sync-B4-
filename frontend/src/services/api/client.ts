import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { API_BASE_URL } from '../../config';
import { getSupabaseAccessToken } from '../../lib/supabase';

export interface ApiErrorPayload {
  statusCode: number;
  message: string;
  errors?: string[];
  code?: string;
}

export class AppApiError extends Error {
  public statusCode: number;
  public errors: string[];
  public code?: string;

  constructor(statusCode: number, message: string, errors: string[] = [], code?: string) {
    super(message);
    this.name = 'AppApiError';
    this.statusCode = statusCode;
    this.errors = errors;
    this.code = code;
    Object.setPrototypeOf(this, AppApiError.prototype);
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor: attach Supabase JWT bearer token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await getSupabaseAccessToken();
      if (token && config.headers) {
        const cleanToken = token.trim();
        if (typeof config.headers.set === 'function') {
          config.headers.set('Authorization', `Bearer ${cleanToken}`);
        } else {
          config.headers['Authorization'] = `Bearer ${cleanToken}`;
        }
      }
    } catch {
      // Continue without token if extraction fails
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: normalization & standardized HTTP status handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError<any>) => {
    if (!error.response) {
      // Network disconnection or CORS failure
      const networkError = new AppApiError(
        0,
        'Campus network connection failed or server is unreachable. Please check connectivity.',
        ['NETWORK_ERROR'],
        'NETWORK_ERROR'
      );
      return Promise.reject(networkError);
    }

    const { status, data } = error.response;
    
    // Parse canonical error formats:
    // Format 1: { error: { code: '...', message: '...' } }
    // Format 2: { success: false, message: '...', errors?: [...] }
    let backendMessage = 'An unexpected error occurred';
    let errorCode = 'UNKNOWN_ERROR';
    let backendErrors: string[] = [];

    if (data?.error && typeof data.error === 'object') {
      backendMessage = data.error.message || backendMessage;
      errorCode = data.error.code || errorCode;
    } else if (data?.message) {
      backendMessage = data.message;
    } else if (typeof data === 'string') {
      backendMessage = data;
    }

    if (Array.isArray(data?.errors)) {
      backendErrors = data.errors;
    } else if (data?.errors) {
      backendErrors = [String(data.errors)];
    }

    switch (status) {
      case 400: {
        const appErr = new AppApiError(400, backendMessage || 'Bad request or validation error', backendErrors, errorCode || 'VALIDATION_ERROR');
        return Promise.reject(appErr);
      }

      case 401: {
        localStorage.removeItem('smart_campus_auth_token');
        localStorage.removeItem('smart_campus_auth_user');
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
        const appErr = new AppApiError(401, backendMessage || 'Your campus authentication session has expired. Please sign in again.', backendErrors, errorCode || 'UNAUTHORIZED');
        return Promise.reject(appErr);
      }

      case 403: {
        const appErr = new AppApiError(403, backendMessage || 'Access restricted. You lack authorization for this action.', backendErrors, errorCode || 'FORBIDDEN');
        return Promise.reject(appErr);
      }

      case 404: {
        const appErr = new AppApiError(404, backendMessage || 'The requested campus facility or record does not exist.', backendErrors, errorCode || 'NOT_FOUND');
        return Promise.reject(appErr);
      }

      case 409: {
        const appErr = new AppApiError(409, backendMessage || 'Scheduling conflict detected: This resource or time window is already reserved.', backendErrors, errorCode || 'CONFLICT');
        return Promise.reject(appErr);
      }

      case 422: {
        const appErr = new AppApiError(422, backendMessage || 'Unprocessable entity: payload could not be verified by scheduling algorithms.', backendErrors, errorCode || 'UNPROCESSABLE_ENTITY');
        return Promise.reject(appErr);
      }

      case 429: {
        const appErr = new AppApiError(429, 'Rate limit threshold exceeded. Please throttle consecutive scheduling requests.', backendErrors, errorCode || 'RATE_LIMITED');
        return Promise.reject(appErr);
      }

      case 500:
      default: {
        const appErr = new AppApiError(status || 500, backendMessage || 'Internal campus server error. Engineering team notified.', backendErrors, errorCode || 'SERVER_ERROR');
        return Promise.reject(appErr);
      }
    }
  }
);
