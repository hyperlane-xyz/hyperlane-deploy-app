import {
  WarpCoreConfig,
  WarpCoreConfigSchema,
  WarpRouteDeployConfig,
  WarpRouteDeployConfigSchema,
} from '@hyperlane-xyz/sdk';
import type { NextApiRequest, NextApiResponse } from 'next';
import { isHex, verifyMessage } from 'viem';
import { serverConfig } from '../../consts/config.server';
import { getOctokitClient } from '../../libs/github';
import { ApiError, ApiSuccess } from '../../types/api';
import {
  CreatePrBody,
  CreatePrBodySchema,
  CreatePrResponse,
  VerifyPrSignature,
  VerifyPrSignatureSchema,
} from '../../types/createPr';
import { sendJsonResponse } from '../../utils/api';
import { validateStringToZodSchema, zodErrorToString } from '../../utils/zod';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreatePrResponse | ApiError>,
) {
  if (req.method !== 'POST') return sendJsonResponse(res, 405, { error: 'Method not allowed' });

  const { serverEnvironment } = serverConfig;
  const octokit = getOctokitClient();
  if (!octokit) {
    return sendJsonResponse(res, 500, {
      error:
        serverEnvironment === 'development'
          ? 'Missing Github configurations, check your environment variables'
          : 'Internal Server Error',
    });
  }

  const { prBody, signatureVerification } = req.body;

  const requestBody = validateRequestBody(prBody);
  if (!requestBody.success) return sendJsonResponse(res, 400, { error: requestBody.error });

  const signatureVerificationResponse = await validateRequestSignature(signatureVerification);
  if (!signatureVerificationResponse.success)
    return sendJsonResponse(res, 400, { error: signatureVerificationResponse.error });

  return sendJsonResponse(res, 400, { error: ' testing error' });
}

export function validateRequestBody(
  body: unknown,
):
  | ApiError
  | ApiSuccess<
      CreatePrBody & { deployConfigResult: WarpRouteDeployConfig; warpConfigResult: WarpCoreConfig }
    > {
  if (!body) return { error: 'Missing request body' };

  const parsedBody = CreatePrBodySchema.safeParse(body);
  if (!parsedBody.success) return { error: zodErrorToString(parsedBody.error) };

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
      deployConfigResult,
      warpConfigResult,
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
