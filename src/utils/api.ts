import { NextApiResponse } from 'next';
import { ApiResponseBody } from '../types/api';

export function sendJsonResponse<T>(
  res: NextApiResponse<ApiResponseBody<T>>,
  statusCode: number,
  body?: ApiResponseBody<T>,
) {
  return res.status(statusCode).json(body as ApiResponseBody<T>);
}
