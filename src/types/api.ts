export interface CreatePrResponse {
  success: true;
  prUrl: string;
}

export interface CreatePrError {
  success?: false;
  error: string;
}

export interface DeployFile {
  path: string;
  content: string;
}

export interface CreatePrBody {
  deployConfig: DeployFile;
  warpConfig: DeployFile;
}
