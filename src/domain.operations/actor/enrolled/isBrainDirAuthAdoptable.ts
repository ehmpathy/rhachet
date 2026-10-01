import { asBrainAuthState } from '@src/domain.operations/brain/auth/asBrainAuthState';
import { isBrainAuthLive } from '@src/domain.operations/brain/auth/isBrainAuthLive';

/**
 * .what = may a 1.48.0 brain-dir login be adopted into the shared ~/.claude login
 * .why = a brain-dir login may be the last refresh winner, and so the only live token
 *   on the box. but the shared login is a file every live clone refreshes, under a lock
 *   enroll does not hold — so enroll may only write it when no clone can:
 *   - the shared login is DEAD (claude-code will not refresh a cleared token) or ABSENT
 *   - and the brain-dir login is LIVE (it holds a refresh token)
 *   a live shared login is never overwritten, even by a newer brain-dir one; a peer
 *   may refresh it in the same instant, and to clobber that write would de-auth the box
 *
 * .note = a 1.48.0 symlink to the shared login reads the shared content, so it is never
 *   adopted: when the shared login is dead, the link reads dead too
 */
export const isBrainDirAuthAdoptable = (input: {
  brainDirAuthContent: string | null;
  brainAuthContent: string | null;
}): boolean => {
  // the shared login must be one no peer can refresh
  const sharedState = asBrainAuthState({ content: input.brainAuthContent });
  if (sharedState === 'present') return false;

  // the brain-dir login must be able to recover itself
  return isBrainAuthLive({ content: input.brainDirAuthContent });
};
