export interface ApiResponseEnvelope<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

export * from './dfd.types.js';
