import { getFileContentOrNull } from '@src/infra/filesystem/getFileContentOrNull';

import { join } from 'node:path';
import { asClaudeJsonAccountClaimed } from './asClaudeJsonAccountClaimed';

/**
 * .what = the email `~/.claude.json` names as the signed-in account, or null when it names none
 * .why = when the grove's live access token has lapsed, the cli's own record is the only name left
 *   (case=5 [t3]); it is a claim, never a proof, since no provider read confirms it
 */
export const getOneClaudeJsonAccountClaimed = (input: {
  home: string;
}): { email: string } | null =>
  asClaudeJsonAccountClaimed({
    content: getFileContentOrNull({ path: join(input.home, '.claude.json') }),
  });
