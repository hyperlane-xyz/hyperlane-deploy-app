// pages/api/open-pr.ts
import { WarpCoreConfigSchema, WarpRouteDeployConfigSchema } from '@hyperlane-xyz/sdk';
import { Octokit } from '@octokit/rest';
import humanId from 'human-id';
import type { NextApiRequest, NextApiResponse } from 'next';
import { serverConfig, ServerConfigSchema } from '../../consts/config.server';
import {
  CreatePrBody,
  CreatePrError,
  CreatePrResponse,
  DeployFile,
  GithubIdentity,
  GitHubIdentitySchema,
} from '../../types/api';
import { validateStringToZodSchema, zodErrorToString } from '../../utils/zod';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreatePrResponse | CreatePrError>,
) {
  const serverConfigParseResult = ServerConfigSchema.safeParse(serverConfig);
  if (!serverConfigParseResult.success)
    return res.status(500).json({
      error: 'Missing Github configurations, check your environment variables',
    });

  const { githubBaseBranch, githubForkOwner, githubRepoName, githubToken, githubUpstreamOwner } =
    serverConfigParseResult.data;
  const octokit = new Octokit({ auth: githubToken });

  const { deployConfig, warpConfig, symbol, organization, username } = req.body as CreatePrBody &
    GithubIdentity & { symbol: string };

  if (!deployConfig || !warpConfig || !symbol)
    return res.status(400).json({ error: 'Missing config files to create PR' });

  const githubInformationResult = GitHubIdentitySchema.safeParse({ organization, username });

  if (!githubInformationResult.success) {
    const githubInfoError = zodErrorToString(githubInformationResult.error);
    return res.status(400).json({ error: githubInfoError });
  }

  const deployConfigResult = validateStringToZodSchema(
    deployConfig.content,
    WarpRouteDeployConfigSchema,
  );
  if (!deployConfigResult) return res.status(400).json({ error: 'Invalid deploy config' });

  const warpConfigResult = validateStringToZodSchema(warpConfig.content, WarpCoreConfigSchema);
  if (!warpConfigResult) return res.status(400).json({ error: 'Invalid warp config' });

  try {
    // Get latest SHA of base branch in fork
    const { data: refData } = await octokit.git.getRef({
      owner: githubForkOwner,
      repo: githubRepoName,
      ref: `heads/${githubBaseBranch}`,
    });

    const latestCommitSha = refData.object.sha;
    const newBranch = `${symbol}-config-${Date.now()}`;

    // Create new branch
    await octokit.git.createRef({
      owner: githubForkOwner,
      repo: githubRepoName,
      ref: `refs/heads/${newBranch}`,
      sha: latestCommitSha,
    });

    const changesetFile = writeChangeset(`Add ${symbol} deploy artifacts`);

    // Upload files to the new branch
    for (const file of [deployConfig, warpConfig, changesetFile]) {
      await octokit.repos.createOrUpdateFileContents({
        owner: githubForkOwner,
        repo: githubRepoName,
        path: file.path,
        message: `feat: add ${file.path}`,
        content: Buffer.from(file.content).toString('base64'),
        branch: newBranch,
      });
    }

    const { username, organization } = githubInformationResult.data;
    const githubInfo = [username && `by ${username}`, organization && `from ${organization}`]
      .filter(Boolean)
      .join(' ');

    // Create a PR from the fork branch to upstream main
    const { data: pr } = await octokit.pulls.create({
      owner: githubUpstreamOwner,
      repo: githubRepoName,
      title: `feat: add ${symbol} deploy artifacts`,
      head: `${githubForkOwner}:${newBranch}`,
      base: githubBaseBranch,
      body: `This PR was created from the deploy app to add ${symbol} deploy artifacts.${
        githubInfo ? `\n\nThis config was provided ${githubInfo}.` : ''
      }`,
    });

    return res.status(200).json({ success: true, prUrl: pr.html_url });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

// adapted from https://github.com/changesets/changesets/blob/main/packages/write/src/index.ts
// so that it could be used in the deploy app
function writeChangeset(description: string): DeployFile {
  const id = humanId({ separator: '-', capitalize: false });
  const filename = `${id}.md`;

  const content = `---
'@hyperlane-xyz/registry': minor
---

${description.trim()}
`;

  return { path: `.changset/${filename}`, content };
}
