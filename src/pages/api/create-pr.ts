// pages/api/open-pr.ts
import { Octokit } from '@octokit/rest';
import type { NextApiRequest, NextApiResponse } from 'next';
import { serverConfig, ServerConfigSchema } from '../../consts/config.server';
import { CreatePrError, CreatePrResponse } from '../../types/api';

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

  const { files } = req.body as {
    files: Array<{ path: string; content: string }>;
  };
  try {
    // Step 1: Get latest SHA of base branch in fork
    const { data: refData } = await octokit.git.getRef({
      owner: githubForkOwner,
      repo: githubRepoName,
      ref: `heads/${githubBaseBranch}`,
    });

    const latestCommitSha = refData.object.sha;
    const newBranch = `upload-${Date.now()}`;

    // Step 2: Create new branch
    await octokit.git.createRef({
      owner: githubForkOwner,
      repo: githubRepoName,
      ref: `refs/heads/${newBranch}`,
      sha: latestCommitSha,
    });

    // Step 3: Upload files to the new branch
    for (const file of files) {
      await octokit.repos.createOrUpdateFileContents({
        owner: githubForkOwner,
        repo: githubRepoName,
        path: file.path,
        message: `Add ${file.path}`,
        content: Buffer.from(file.content).toString('base64'),
        branch: newBranch,
      });
    }

    // Step 4: Create a PR from the fork branch to upstream main
    const { data: pr } = await octokit.pulls.create({
      owner: githubUpstreamOwner,
      repo: githubRepoName,
      title: `Auto PR: ${newBranch}`,
      head: `${githubForkOwner}:${newBranch}`,
      base: githubBaseBranch,
      body: `This PR was opened by the dummy bot.`,
    });

    return res.status(200).json({ success: true, prUrl: pr.html_url });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
