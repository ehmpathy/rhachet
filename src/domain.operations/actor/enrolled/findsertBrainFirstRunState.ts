import { MalfunctionError } from 'helpful-errors';

import { getOneGitMainCheckoutOrNull } from '@src/infra/git/getOneGitMainCheckoutOrNull';
import { withRepoMutex } from '@src/infra/lock/withRepoMutex';
import { setFileAtomic } from '@src/infra/setFileAtomic';

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { asBrainFirstRunState } from './asBrainFirstRunState';

/**
 * .what = read one `.claude.json` as an object; absent → {}
 * .why = a file we cannot parse is never overwritten — it may hold state we would lose
 */
const getClaudeJsonRecord = (input: {
  path: string;
}): Record<string, unknown> => {
  if (!existsSync(input.path)) return {};
  const content = readFileSync(input.path, 'utf-8');
  const parsed = (() => {
    try {
      return JSON.parse(content) as unknown;
    } catch (error) {
      throw new MalfunctionError(
        `unparseable claude state file: ${input.path}`,
        {
          path: input.path,
          cause: error instanceof Error ? error : new Error(String(error)),
        },
      );
    }
  })();
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
    throw new MalfunctionError(
      `claude state file is not a json object: ${input.path}`,
      {
        path: input.path,
      },
    );
  return parsed as Record<string, unknown>;
};

/**
 * .what = findsert the accepted first-run state into `<brainDir>/.claude.json`
 * .why = a relocated clone reads its first-run state from its own config dir, so
 *   with none it meets the trust and api-key prompts with no keyboard behind it (D11)
 * .note = a write lands only when a key is absent; a re-run makes no write
 * .note = the read and the write share one `.claude.json` mutex, so two enrolls of one actor
 *   never both read the same prior and drop each other's keys
 */
export const findsertBrainFirstRunState = async (input: {
  brainDir: string;
  repoPath: string;
  home: string;
}): Promise<{ status: 'written' | 'unchanged'; path: string }> => {
  const path = join(input.brainDir, '.claude.json');
  const repoPathMain = getOneGitMainCheckoutOrNull({
    repoRoot: input.repoPath,
  });

  return withRepoMutex({ repoPath: input.repoPath, path }, async () => {
    // read the brain dir's state and the human's
    const prior = getClaudeJsonRecord({ path });
    const human = getClaudeJsonRecord({
      path: join(input.home, '.claude.json'),
    });

    // compute the next state; null means no key is absent
    //   .note = trust rides under the main checkout too — claude keys it there in a worktree
    const next = asBrainFirstRunState({
      prior,
      human,
      repoPath: input.repoPath,
      repoPathMain,
    });
    if (!next) return { status: 'unchanged' as const, path };

    // write the whole file at once
    setFileAtomic({ path, content: `${JSON.stringify(next, null, 2)}\n` });
    return { status: 'written' as const, path };
  });
};
