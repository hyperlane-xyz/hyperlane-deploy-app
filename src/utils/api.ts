import { NextApiResponse } from 'next';
import { ApiResponseBody } from '../types/api';

export function sendJsonResponse<T>(
  res: NextApiResponse<ApiResponseBody<T>>,
  statusCode: number,
  body?: ApiResponseBody<T>,
) {
  if (body) return res.status(statusCode).json(body);

  return res.status(statusCode).end();
}
