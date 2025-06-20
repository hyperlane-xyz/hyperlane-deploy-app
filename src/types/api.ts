export interface CreatePrResponse {
  success: true;
  prUrl: string;
}

export interface CreatePrError {
  success?: false;
  error: string;
}
