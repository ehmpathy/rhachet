import { ConstraintError } from 'helpful-errors';

import { asBrainAuthState } from './asBrainAuthState';
import { isBrainAuthViaEnv } from './isBrainAuthViaEnv';

/**
 * .what = refuse an enroll whose clone would boot into a dead login
 * .why = every clone reads the one shared login. once claude-code clears it (a revoked
 *   login, or a refresh the server rejects), each new clone would boot straight into
 *   `Login expired` with no keyboard to answer it. a refusal with the cure is cheaper
 *   than a fleet of stuck panes, and one `/login` heals every live clone at once
 *
 * .note = an env credential (CLAUDE_CODE_OAUTH_TOKEN, ANTHROPIC_API_KEY,
 *   ANTHROPIC_AUTH_TOKEN) wins over the file in claude-code, so it is never refused
 * .note = only the dead-token clear is refused. an ABSENT login is not — the clone can
 *   `/login` on its own (asBrainAuthAbsentLine) — and a login that does not parse is
 *   claude-code's to judge, in the clone
 * .note = pure: the caller reads the login once and passes its content in
 */
export const assertBrainAuthNotDead = (input: {
  brainAuthPath: string;
  brainAuthContent: string | null;
  env: NodeJS.ProcessEnv;
}): void => {
  // an env credential wins over the file, so the file state does not matter
  if (isBrainAuthViaEnv({ env: input.env })) return;

  // refuse only the one shape we can name for certain: the dead-token clear
  if (asBrainAuthState({ content: input.brainAuthContent }) !== 'dead') return;

  throw new ConstraintError("the box's claude login is dead", {
    brainAuthPath: input.brainAuthPath,
    hint: 'run /login in any claude on this box (or `rhx git.grove.auth` on a grove); every live clone recovers on the refill, with no respawn. or set CLAUDE_CODE_OAUTH_TOKEN or ANTHROPIC_API_KEY for this clone',
  });
};
