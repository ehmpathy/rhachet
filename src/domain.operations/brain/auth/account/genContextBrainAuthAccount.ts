import { getOneClaudeAccessMinted } from '@src/domain.operations/brain/auth/account/claude/getOneClaudeAccessMinted';
import { getOneClaudeProfile } from '@src/domain.operations/brain/auth/account/claude/getOneClaudeProfile';
import { getOneClaudeUsageReply } from '@src/domain.operations/brain/auth/account/claude/getOneClaudeUsageReply';
import { assertBrainAuthSlotWritable } from '@src/domain.operations/brain/auth/account/slot/assertBrainAuthSlotWritable';
import { delBrainAuthSlotToken } from '@src/domain.operations/brain/auth/account/slot/delBrainAuthSlotToken';
import { getAllBrainAuthSlotEmails } from '@src/domain.operations/brain/auth/account/slot/getAllBrainAuthSlotEmails';
import { getOneBrainAuthSlotToken } from '@src/domain.operations/brain/auth/account/slot/getOneBrainAuthSlotToken';
import { setBrainAuthSlotToken } from '@src/domain.operations/brain/auth/account/slot/setBrainAuthSlotToken';

import { spawnSync } from 'node:child_process';

/**
 * .what = the deps every brain auth account op reaches past this process: the keyrack slots, the
 *   provider's oauth reads, the login spawn, and the pace waits
 * .why = `set`, `get` and `use` share one seam, so a test can run each op whole over a temp home with
 *   an in-memory keyrack and a fake provider, while the order of writes stays the real code's
 * .note = shared by five ops across `get`, `set` and `use`, so it is a named shape rather than an
 *   inline one (rule.forbid.io-as-domain-objects, its reuse exception)
 */
export type ContextBrainAuthAccount = {
  getSlotToken: typeof getOneBrainAuthSlotToken;
  setSlotToken: typeof setBrainAuthSlotToken;
  delSlotToken: typeof delBrainAuthSlotToken;
  getSlotEmails: typeof getAllBrainAuthSlotEmails;
  assertSlotWritable: typeof assertBrainAuthSlotWritable;
  mint: typeof getOneClaudeAccessMinted;
  getProfile: typeof getOneClaudeProfile;
  getUsageReply: typeof getOneClaudeUsageReply;
  spawnLogin: (input: { env: NodeJS.ProcessEnv; cwd: string }) => {
    error: Error | null;
  };
  sleep: (input: { ms: number }) => Promise<void>;
};

/**
 * .what = the real deps: the keyrack, claude's oauth endpoints, and the claude cli
 * .why = the default every caller outside a test takes
 */
export const genContextBrainAuthAccount = (): ContextBrainAuthAccount => ({
  getSlotToken: getOneBrainAuthSlotToken,
  setSlotToken: setBrainAuthSlotToken,
  delSlotToken: delBrainAuthSlotToken,
  getSlotEmails: getAllBrainAuthSlotEmails,
  assertSlotWritable: assertBrainAuthSlotWritable,
  mint: getOneClaudeAccessMinted,
  getProfile: getOneClaudeProfile,
  getUsageReply: getOneClaudeUsageReply,
  spawnLogin: ({ env, cwd }) => {
    // the human logs in, then exits; the cli renders on this terminal's stderr, so stdout stays
    // clean for `--output json`, and runs in `cwd` so no repo's own hooks or settings load into
    // the login session
    const ran = spawnSync('claude', [], { stdio: [0, 2, 2], env, cwd });
    return { error: ran.error ?? null };
  },
  sleep: ({ ms }) => new Promise<void>((done) => setTimeout(done, ms)),
});
