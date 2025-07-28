export interface ApiError {
  success?: false;
  error: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export type ApiResponseBody<T> = ApiSuccess<T> | ApiError;
