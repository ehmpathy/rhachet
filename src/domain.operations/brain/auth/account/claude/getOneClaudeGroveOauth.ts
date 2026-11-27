import { getFileContentOrNull } from '@src/infra/filesystem/getFileContentOrNull';

import { asClaudeGroveOauth } from './asClaudeGroveOauth';

/**
 * .what = the oauth block a claude credentials file holds; null when absent or unusable
 * .why = every read of a login file is the same read then cast, so it has one home
 * .note = never returns a token to a log; the caller holds it in memory only
 */
export const getOneClaudeGroveOauth = (input: {
  path: string;
}): ReturnType<typeof asClaudeGroveOauth> =>
  asClaudeGroveOauth({ content: getFileContentOrNull({ path: input.path }) });
