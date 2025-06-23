import { z } from 'zod';

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
