import { WarpCoreConfigSchema, WarpRouteDeployConfigSchema } from '@hyperlane-xyz/sdk';
import humanId from 'human-id';
import type { NextApiRequest, NextApiResponse } from 'next';
import { serverConfig } from '../../consts/config.server';
import { getOctokitClient } from '../../libs/github';
import {
  ApiError,
  CreatePrBody,
  CreatePrResponse,
  DeployFile,
  GitHubIdentitySchema,
} from '../../types/api';
import { sendJsonResponse } from '../../utils/api';
import { validateStringToZodSchema, zodErrorToString } from '../../utils/zod';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreatePrResponse | ApiError>,
) {
  const {
    githubBaseBranch,
    githubForkOwner,
    githubRepoName,
    githubUpstreamOwner,
    serverEnvironment,
  } = serverConfig;
  const octokit = getOctokitClient();
  if (!octokit) {
    return sendJsonResponse(res, 500, {
      error:
        serverEnvironment === 'development'
          ? 'Missing Github configurations, check your environment variables'
          : 'Internal Server Error',
    });
  }

  const { deployConfig, warpConfig, warpRouteId, organization, username } =
    req.body as CreatePrBody;

  if (!deployConfig || !warpConfig || !warpRouteId)
    return sendJsonResponse(res, 400, { error: 'Missing config files to create PR' });

  const githubInformationResult = GitHubIdentitySchema.safeParse({ organization, username });

  if (!githubInformationResult.success) {
    const githubInfoError = zodErrorToString(githubInformationResult.error);
    return sendJsonResponse(res, 400, { error: githubInfoError });
  }

  const deployConfigResult = validateStringToZodSchema(
    deployConfig.content,
    WarpRouteDeployConfigSchema,
  );
  if (!deployConfigResult) sendJsonResponse(res, 400, { error: 'Invalid deploy config' });

  const warpConfigResult = validateStringToZodSchema(warpConfig.content, WarpCoreConfigSchema);
  if (!warpConfigResult) return sendJsonResponse(res, 400, { error: 'Invalid warp config' });

  try {
    // Get latest SHA of base branch in fork
    const { data: refData } = await octokit.git.getRef({
      owner: githubForkOwner,
      repo: githubRepoName,
      ref: `heads/${githubBaseBranch}`,
    });

    const latestCommitSha = refData.object.sha;
    const newBranch = `${warpRouteId}-config-${Date.now()}`;

    // Create new branch
    await octokit.git.createRef({
      owner: githubForkOwner,
      repo: githubRepoName,
      ref: `refs/heads/${newBranch}`,
      sha: latestCommitSha,
    });

    const changesetFile = writeChangeset(`Add ${warpRouteId} warp route deploy artifacts`);

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
      title: `feat: add ${warpRouteId} warp route deploy artifacts`,
      head: `${githubForkOwner}:${newBranch}`,
      base: githubBaseBranch,
      body: `This PR was created from the deploy app to add ${warpRouteId} warp route deploy artifacts.${
        githubInfo ? `\n\nThis config was provided ${githubInfo}.` : ''
      }`,
    });

    return sendJsonResponse(res, 200, { data: { prUrl: pr.html_url }, success: true });
  } catch (err: any) {
    return sendJsonResponse(res, 500, { error: err.message });
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
