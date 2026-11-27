import { asClaudeGroveCredentialsSwapped } from '@src/domain.operations/brain/auth/account/claude/asClaudeGroveCredentialsSwapped';
import { asClaudeGroveOauth } from '@src/domain.operations/brain/auth/account/claude/asClaudeGroveOauth';
import { withBrainAuthWriteLock } from '@src/domain.operations/brain/auth/withBrainAuthWriteLock';
import { getFileContentOrNull } from '@src/infra/filesystem/getFileContentOrNull';
import { setFileAtomic } from '@src/infra/setFileAtomic';

/**
 * .what = install a login into the grove file, only if the grove still holds the refresh token it
 *   held when the caller read it
 * .why = a live claude session may rotate the grove login at any moment; a swap over a rotation
 *   would strand that session's account, so the session wins and the swap reports `false`
 * .note = compare and write both run under claude's own write lock, so no claude process writes
 *   between them
 * .note = every key of the file beside the login is kept as found
 */
export const setClaudeGroveOauthSwapped = async (input: {
  brainAuthPath: string;
  refreshTokenBefore: string | null;
  oauth: Parameters<typeof asClaudeGroveCredentialsSwapped>[0]['oauth'];
}): Promise<boolean> =>
  withBrainAuthWriteLock(
    { brainAuthPath: input.brainAuthPath, retry: 'use' },
    async () => {
      // a rotation since the caller's read wins; this swap backs off
      const content = getFileContentOrNull({ path: input.brainAuthPath });
      const refreshTokenNow =
        asClaudeGroveOauth({ content })?.refreshToken ?? null;
      if (refreshTokenNow !== input.refreshTokenBefore) return false;

      // install the login
      setFileAtomic(
        {
          path: input.brainAuthPath,
          content: asClaudeGroveCredentialsSwapped({
            content,
            oauth: input.oauth,
          }),
        },
        { mode: 0o600 },
      );
      return true;
    },
  );
