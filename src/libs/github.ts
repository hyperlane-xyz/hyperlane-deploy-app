// this is meant to be used server side only!
import { Octokit } from '@octokit/rest';
import { serverConfig, ServerConfigSchema } from '../consts/config.server';

let cachedOctokitClient: Octokit | null = null;

export function getOctokitClient(): Octokit | null {
  if (!cachedOctokitClient) {
    const serverConfigParseResult = ServerConfigSchema.safeParse(serverConfig);
    if (!serverConfigParseResult.success) return null;

    cachedOctokitClient = new Octokit({ auth: serverConfigParseResult.data.githubToken });
  }

  return cachedOctokitClient;
}
