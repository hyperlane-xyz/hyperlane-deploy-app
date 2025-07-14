import type { NextApiRequest, NextApiResponse } from 'next';
import { ApiError } from '../../types/api';
import { CreatePrResponse } from '../../types/createPr';
import { sendJsonResponse } from '../../utils/api';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreatePrResponse | ApiError>,
) {
  return sendJsonResponse(res, 400, { error: 'testing error' });
}
