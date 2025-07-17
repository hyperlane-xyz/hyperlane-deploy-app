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

export const MAX_IMAGE_SIZE = 100 * 1024; // 100 KB
export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];

export const ImageFileSchema = z
  .instanceof(File)
  .refine((file) => ALLOWED_IMAGE_TYPES.includes(file.type), {
    message: `Invalid image file type, valid types are: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
  })
  .refine((file) => file.size <= MAX_IMAGE_SIZE, {
    message: 'File size should not exceed 100 KBs',
  })
  .optional();

export type ImageFile = z.infer<typeof ImageFileSchema>;

export interface CreatePrData {
  prUrl: string;
}

export const CreatePrBodySchema = z
  .object({
    deployConfig: DeployFileSchema,
    warpConfig: DeployFileSchema,
    warpRouteId: z.string().min(1, 'Warp Route ID is required'),
    logo: ImageFileSchema,
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

export const CreatePrFormSchema = z
  .object({
    logo: ImageFileSchema,
  })
  .merge(GitHubIdentitySchema);

export type CreatePrForm = z.infer<typeof CreatePrFormSchema>;

export type CreatePrRequestBody = {
  prBody: CreatePrBody;
  signatureVerification: VerifyPrSignature;
  logo?: ImageFile;
};
