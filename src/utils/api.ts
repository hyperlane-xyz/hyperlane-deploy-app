import { NextResponse } from 'next/server';
import { ApiResponseBody } from '../types/api';

export function sendJsonResponse<T>(statusCode: number, body?: ApiResponseBody<T>) {
  if (body) return NextResponse.json(body, { status: statusCode });

  return new NextResponse(null, { status: statusCode });
}
