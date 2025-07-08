import { z } from 'zod';
import { ApiResponseBody } from './api';

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

export const DeployFileSchema = z.object({
  path: z.string().min(1, 'File path is required').describe('Location for the file'),
  content: z
    .string()
    .min(1, 'File content is required')
    .describe('Stringified content of the file'),
});

export type DeployFile = z.infer<typeof DeployFileSchema>;

export interface CreatePrData {
  prUrl: string;
}

export const CreatePrBodySchema = z
  .object({
    deployConfig: DeployFileSchema,
    warpConfig: DeployFileSchema,
    warpRouteId: z.string().min(1, 'Warp Route ID is required'),
  })
  .merge(GitHubIdentitySchema);

export type CreatePrBody = z.infer<typeof CreatePrBodySchema>;

export type CreatePrResponse = ApiResponseBody<CreatePrData>;

export const VerifyPrSignatureSchema = z.object({
  message: z.string().min(1).describe('Message to be signed'),
  address: z.string().min(1).describe('Owner of the signed message'),
  signature: z.string().min(1).describe('The signed message'),
});

export type VerifyPrSignature = z.infer<typeof VerifyPrSignatureSchema>;

export type CreatePrRequestBody = {
  prBody: CreatePrBody;
  signatureVerification: VerifyPrSignature;
};
