import { WarpCoreConfigSchema, WarpRouteDeployConfigSchema } from '@hyperlane-xyz/sdk';
import humanId from 'human-id';
import type { NextApiRequest, NextApiResponse } from 'next';
import { serverConfig } from '../../consts/config.server';
import { getOctokitClient } from '../../libs/github';
import { ApiError, ApiSuccess } from '../../types/api';
import {
  CreatePrBody,
  CreatePrBodySchema,
  CreatePrResponse,
  DeployFile,
} from '../../types/createPr';
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

  const requestBody = validateRequestBody(req.body);
  if (!requestBody.success) return sendJsonResponse(res, 400, { error: requestBody.error });

  const {
    data: { deployConfig, warpConfig, warpRouteId, organization, username },
  } = requestBody;

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

export function validateRequestBody(body: unknown): ApiError | ApiSuccess<CreatePrBody> {
  if (!body) return { error: 'Missing request body' };

  const parsedBody = CreatePrBodySchema.safeParse(body);
  if (!parsedBody.success) {
    return { error: zodErrorToString(parsedBody.error) };
  }

  const { deployConfig, warpConfig, warpRouteId, organization, username } = parsedBody.data;

  const deployConfigResult = validateStringToZodSchema(
    deployConfig.content,
    WarpRouteDeployConfigSchema,
  );
  if (!deployConfigResult) return { error: 'Invalid deploy config content' };

  const warpConfigResult = validateStringToZodSchema(warpConfig.content, WarpCoreConfigSchema);
  if (!warpConfigResult) return { error: 'Invalid warp config content' };

  return {
    success: true,
    data: {
      deployConfig,
      warpConfig,
      warpRouteId,
      organization,
      username,
    },
  };
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
