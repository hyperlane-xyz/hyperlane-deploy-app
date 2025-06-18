import { z } from 'zod';

export const ServerConfigSchema = z.object({
  githubForkOwner: z
    .string()
    .min(1, 'GITHUB_FORK_OWNER is required')
    .describe('Username of the forked repository owner'),
  githubRepoName: z
    .string()
    .min(1, 'GITHUB_REPO is required')
    .describe('Name of the repository (should match both upstream and fork)'),
  githubUpstreamOwner: z
    .string()
    .min(1, 'GITHUB_UPSTREAM_OWNER is required')
    .describe('Username of the base (upstream) repository owner'),
  githubBaseBranch: z
    .string()
    .min(1, 'GITHUB_BASE_BRANCH is required')
    .describe('Branch of the repositories (e.g., main or master)'),
  githubToken: z
    .string()
    .min(1, 'GITHUB_TOKEN is required')
    .describe('GitHub token of the fork owner with repo/pull access'),
});

export type ServerConfig = z.infer<typeof ServerConfigSchema>;

const githubForkOwner = process.env.GITHUB_FORK_OWNER || '';
const githubRepoName = process.env.GITHUB_REPO || '';
const githubUpstreamOwner = process.env.GITHUB_UPSTREAM_OWNER || '';
const githubBaseBranch = 'main';
const githubToken = process.env.GITHUB_TOKEN || '';

export const serverConfig: ServerConfig = Object.freeze({
  githubForkOwner,
  githubRepoName,
  githubUpstreamOwner,
  githubBaseBranch,
  githubToken,
});
