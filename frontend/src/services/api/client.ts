import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { API_BASE_URL } from '../../config';

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

// Request interceptor: attach JWT bearer token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('smart_campus_auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: normalization & standardized HTTP status handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // 200 OK / 201 Created: Return clean response
    return response;
  },
  (error: AxiosError<any>) => {
    if (!error.response) {
      // Network disconnection or CORS failure
      const networkError = new AppApiError(
        0,
        'Campus network connection failed or server is unreachable. Please check connectivity.',
        ['NETWORK_ERROR']
      );
      return Promise.reject(networkError);
    }

    const { status, data } = error.response;
    const backendMessage = data?.message || error.message || 'An unexpected error occurred';
    const backendErrors = Array.isArray(data?.errors) ? data.errors : data?.errors ? [String(data.errors)] : [];

    switch (status) {
      case 400: {
        // Bad Request / Validation Failure
        const appErr = new AppApiError(400, backendMessage || 'Bad request or validation error', backendErrors, 'VALIDATION_ERROR');
        return Promise.reject(appErr);
      }

      case 401: {
        // Unauthorized / Session Expired
        localStorage.removeItem('smart_campus_auth_token');
        localStorage.removeItem('smart_campus_auth_user');
        window.dispatchEvent(new CustomEvent('auth:session-expired'));
        const appErr = new AppApiError(401, 'Your campus authentication session has expired. Please sign in again.', backendErrors, 'UNAUTHORIZED');
        return Promise.reject(appErr);
      }

      case 403: {
        // Forbidden / Insufficient Role Clearance
        const appErr = new AppApiError(403, backendMessage || 'Access restricted. You lack authorization for this action.', backendErrors, 'FORBIDDEN');
        return Promise.reject(appErr);
      }

      case 404: {
        // Resource Not Found
        const appErr = new AppApiError(404, backendMessage || 'The requested campus facility or record does not exist.', backendErrors, 'NOT_FOUND');
        return Promise.reject(appErr);
      }

      case 409: {
        // Conflict / Slot Overlap
        const appErr = new AppApiError(409, backendMessage || 'Scheduling conflict detected: This workstation or time window is already leased.', backendErrors, 'CONFLICT');
        return Promise.reject(appErr);
      }

      case 422: {
        // Unprocessable Entity
        const appErr = new AppApiError(422, backendMessage || 'Unprocessable entity: payload could not be verified by scheduling algorithms.', backendErrors, 'UNPROCESSABLE_ENTITY');
        return Promise.reject(appErr);
      }

      case 429: {
        // Rate Limited / Too Many Requests
        const appErr = new AppApiError(429, 'Rate limit threshold exceeded. Please throttle consecutive scheduling requests.', backendErrors, 'RATE_LIMITED');
        return Promise.reject(appErr);
      }

      case 500:
      default: {
        // Internal Server Error
        const appErr = new AppApiError(status || 500, backendMessage || 'Internal campus server error. Engineering team notified.', backendErrors, 'SERVER_ERROR');
        return Promise.reject(appErr);
      }
    }
  }
);
