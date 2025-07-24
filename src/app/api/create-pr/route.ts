import {
  WarpCoreConfig,
  WarpCoreConfigSchema,
  WarpRouteDeployConfig,
  WarpRouteDeployConfigSchema,
} from '@hyperlane-xyz/sdk';
import { Octokit } from '@octokit/rest';
import humanId from 'human-id';
import { NextRequest } from 'next/server';
import { encodePacked, isHex, keccak256, toBytes, toHex, verifyMessage } from 'viem';
import { stringify } from 'yaml';
import { serverConfig } from '../../../consts/config.server';
import { mimeToExt, warpRoutesPath } from '../../../consts/consts';
import { parseWarpRouteConfigId, sortWarpCoreConfig } from '../../../features/deployment/utils';
import { getOctokitClient } from '../../../libs/github';
import { ApiError, ApiSuccess } from '../../../types/api';
import {
  CreatePrBody,
  CreatePrBodySchema,
  DeployFile,
  VerifyPrSignature,
  VerifyPrSignatureSchema,
} from '../../../types/createPr';
import { sendJsonResponse } from '../../../utils/api';
import { sortObjByKeys } from '../../../utils/object';
import { validateStringToZodSchema, zodErrorToString } from '../../../utils/zod';

export async function POST(req: NextRequest) {
  const formData = await req.formData();

  const prBody = JSON.parse(formData.get('prBody') as string);
  const signatureVerification = JSON.parse(formData.get('signatureVerification') as string);
  const logoBody = formData.get('logo') as File | null;

  const {
    githubBaseBranch,
    githubForkOwner,
    githubRepoName,
    githubUpstreamOwner,
    serverEnvironment,
  } = serverConfig;
  const octokit = getOctokitClient();
  if (!octokit) {
    return sendJsonResponse(500, {
      error:
        serverEnvironment === 'development'
          ? 'Missing Github configurations, check your environment variables'
          : 'Internal Server Error',
    });
  }

  const requestBody = await validateRequestBody(prBody, logoBody);
  if (!requestBody.success) return sendJsonResponse(400, { error: requestBody.error });

  const signatureVerificationResponse = await validateRequestSignature(signatureVerification);
  if (!signatureVerificationResponse.success)
    return sendJsonResponse(400, { error: signatureVerificationResponse.error });

  const { deployConfig, warpConfig, warpRouteId, organization, username, logoFile } =
    requestBody.data;

  const branch = getBranchName(warpRouteId, deployConfig.content, warpConfig.content);
  if (!branch.success) return sendJsonResponse(400, { error: branch.error });

  const branchName = branch.data;
  const validBranch = await isValidBranchName(octokit, githubForkOwner, githubRepoName, branchName);

  if (!validBranch)
    return sendJsonResponse(400, { error: 'A PR already exists with these config!' });

  try {
    // Get latest SHA of base branch in fork
    const { data: refData } = await octokit.git.getRef({
      owner: githubForkOwner,
      repo: githubRepoName,
      ref: `heads/${githubBaseBranch}`,
    });

    const latestCommitSha = refData.object.sha;

    // Create new branch
    await octokit.git.createRef({
      owner: githubForkOwner,
      repo: githubRepoName,
      ref: `refs/heads/${branchName}`,
      sha: latestCommitSha,
    });

    const changesetFile = writeChangeset(`Add ${warpRouteId} warp route deploy artifacts`);
    const filesToUpload: Array<{ content: ArrayBuffer | string; path: string }> = [
      deployConfig,
      warpConfig,
      changesetFile,
    ];
    if (logoFile) filesToUpload.push(logoFile);

    // Upload files to the new branch
    for (const file of filesToUpload) {
      await octokit.repos.createOrUpdateFileContents({
        owner: githubForkOwner,
        repo: githubRepoName,
        path: file.path,
        message: `feat: add ${file.path}`,
        content:
          typeof file.content === 'string'
            ? Buffer.from(file.content).toString('base64')
            : Buffer.from(file.content).toString('base64'),
        branch: branchName,
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
      head: `${githubForkOwner}:${branchName}`,
      base: githubBaseBranch,
      body: `This PR was created from the deploy app to add ${warpRouteId} warp route deploy artifacts.${
        githubInfo ? `\n\nThis config was provided ${githubInfo}.` : ''
      }`,
    });

    return sendJsonResponse(200, { data: { prUrl: pr.html_url }, success: true });
  } catch (err: any) {
    // when using octokit.createOrUpdateFileContents and the file path already exists
    // this will throw the following error, so instead of getting the sha of the existing file
    // is it probably better to just tell the user that these files already exists
    if (
      err?.status === 422 &&
      typeof err?.message === 'string' &&
      err.message.includes(`"sha" wasn't supplied`)
    ) {
      try {
        // if it hits this error the branch has already been created, hence we need to delete this branch
        await octokit.git.deleteRef({
          owner: githubForkOwner,
          repo: githubRepoName,
          ref: `heads/${branchName}`,
        });
        return sendJsonResponse(404, {
          error:
            'Files already exists in this path, please check the registry for these files or logo',
        });
      } catch (innerErr: any) {
        return sendJsonResponse(500, { error: innerErr.message });
      }
    }

    return sendJsonResponse(500, { error: err.message });
  }
}

async function validateRequestBody(
  body: unknown,
  logoBody: File | null,
): Promise<
  | ApiError
  | ApiSuccess<
      CreatePrBody & {
        deployConfigResult: WarpRouteDeployConfig;
        warpConfigResult: WarpCoreConfig;
        logoFile: BufferFile | undefined;
      }
    >
> {
  if (!body) return { error: 'Missing request body' };

  const parsedBody = CreatePrBodySchema.safeParse({ ...body, logo: logoBody });
  if (!parsedBody.success) return { error: zodErrorToString(parsedBody.error) };

  const { deployConfig, warpConfig, warpRouteId, organization, username, logo } = parsedBody.data;

  const deployConfigResult = validateStringToZodSchema(
    deployConfig.content,
    WarpRouteDeployConfigSchema,
  );
  if (!deployConfigResult) return { error: 'Invalid deploy config content' };

  const warpConfigResult = validateStringToZodSchema(warpConfig.content, WarpCoreConfigSchema);
  if (!warpConfigResult) return { error: 'Invalid warp config content' };

  const logoFile = await getLogoFile(logo, warpRouteId);

  const sortedDeployConfig = sortObjByKeys(deployConfigResult);
  const sortedWarpCoreConfig = sortObjByKeys(
    sortWarpCoreConfig({
      ...warpConfigResult,
      tokens: warpConfigResult.tokens.map((token) => ({ ...token, logoURI: logoFile?.path })),
    })!,
  );

  return {
    success: true,
    data: {
      deployConfig: {
        ...deployConfig,
        content: stringify(sortedDeployConfig, { sortMapEntries: true }),
      },
      warpConfig: {
        ...warpConfig,
        content: stringify(sortedWarpCoreConfig, { sortMapEntries: true }),
      },
      warpRouteId,
      organization,
      username,
      deployConfigResult: sortedDeployConfig,
      warpConfigResult: sortedWarpCoreConfig,
      logo,
      logoFile,
    },
  };
}

const MAX_TIMESTAMP_DURATION = 2 * 60 * 1000; // 2 minutes

async function validateRequestSignature(
  signatureVerification: unknown,
): Promise<ApiError | ApiSuccess<VerifyPrSignature>> {
  if (!signatureVerification) return { error: 'Missing signatureVerification' };

  const parsedSignatureBody = VerifyPrSignatureSchema.safeParse(signatureVerification);
  if (!parsedSignatureBody.success) return { error: zodErrorToString(parsedSignatureBody.error) };

  const { address, message, signature } = parsedSignatureBody.data;

  if (!isHex(address)) return { error: 'Address is not a valid EVM hex string' };
  if (!isHex(signature)) return { error: 'Signature is a not a valid EVM hex string' };

  try {
    const isValidSignature = await verifyMessage({
      address,
      message,
      signature,
    });
    if (!isValidSignature) return { error: 'Invalid signature' };
  } catch {
    return { error: 'Invalid signature' };
  }

  // validate that signature is not older than `MAX_TIMESTAMP_DURATION`
  const splitMessage = message.split('timestamp:');
  if (splitMessage.length !== 2) return { error: 'Timestamp not found in message' };

  const isoString = splitMessage[1].trim();
  const timestamp = new Date(isoString);
  if (isNaN(timestamp.getTime())) {
    return { error: 'Invalid timestamp format' };
  }

  const currentTimestamp = new Date();
  const diffInMs = currentTimestamp.getTime() - timestamp.getTime();
  if (diffInMs > MAX_TIMESTAMP_DURATION) return { error: 'Expired signature' };

  return { success: true, data: { address, message, signature } };
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

  return { path: `.changeset/${filename}`, content };
}

function getBranchName(
  warpRouteId: string,
  deployConfig: string,
  warpConfig: string,
): ApiError | ApiSuccess<string> {
  const deployConfigBuffer = toBytes(deployConfig);
  const warpConfigBuffer = toBytes(warpConfig);

  try {
    const requestBodyHash = keccak256(
      encodePacked(
        ['string', 'bytes', 'bytes'],
        [warpRouteId, toHex(deployConfigBuffer), toHex(warpConfigBuffer)],
      ),
    );
    return { success: true, data: `${warpRouteId}-${requestBodyHash}` };
  } catch {
    return { error: 'Failed to create branch name' };
  }
}

async function isValidBranchName(
  octokit: Octokit,
  owner: string,
  repo: string,
  branchName: string,
) {
  try {
    await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branchName}`,
    });

    // If no error is thrown, the branch exists
    return false;
  } catch (error: any) {
    // branch does not exist
    if (error.status === 404) return true;

    // Something else went wrong
    throw new Error(`Failed to check branch existence: ${error.message}`);
  }
}

type BufferFile = { content: ArrayBuffer; path: string };

async function getLogoFile(
  logo: File | undefined | null,
  warpRouteId: string,
): Promise<BufferFile | undefined> {
  if (!logo) return undefined;

  const { symbol } = parseWarpRouteConfigId(warpRouteId);
  const extension = mimeToExt[logo.type];
  const basePath = `${warpRoutesPath}/${symbol}`;

  return {
    path: `${basePath}/logo.${extension}`,
    content: await logo.arrayBuffer(),
  };
}
