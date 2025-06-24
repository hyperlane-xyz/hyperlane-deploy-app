import { z } from 'zod';

export interface ApiError {
  success?: false;
  error: string;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export type ApiResponseBody<T> = ApiSuccess<T> | ApiError;

export interface CreatePrData {
  prUrl: string;
}

export type CreatePrResponse = ApiResponseBody<CreatePrData>;

export interface DeployFile {
  path: string;
  content: string;
}

const githubNameRegex = /^(?!-)(?!.*--)[a-zA-Z0-9-]{1,39}(?<!-)$/;
export const GitHubIdentitySchema = z.object({
  username: z
    .string()
    .regex(githubNameRegex, {
      message: 'Invalid GitHub username',
    })
    .optional(),
  organization: z
    .string()
    .regex(githubNameRegex, {
      message: 'Invalid GitHub organization',
    })
    .optional(),
});

export type GithubIdentity = z.infer<typeof GitHubIdentitySchema>;

export type CreatePrBody = {
  deployConfig: DeployFile;
  warpConfig: DeployFile;
  warpRouteId: string;
} & GithubIdentity;
