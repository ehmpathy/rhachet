import { ConstraintError, MalfunctionError } from 'helpful-errors';

import type { BrainAuthAccount } from '@src/domain.objects/BrainAuthAccount';
import { getOneClaudeGroveOauth } from '@src/domain.operations/brain/auth/account/claude/getOneClaudeGroveOauth';
import {
  type ContextBrainAuthAccount,
  genContextBrainAuthAccount,
} from '@src/domain.operations/brain/auth/account/genContextBrainAuthAccount';
import { asBrainAuthSlotUnlockHint } from '@src/domain.operations/brain/auth/account/slot/asBrainAuthSlotUnlockHint';
import { BRAIN_AUTH_SLOT_MINT_PACE } from '@src/domain.operations/brain/auth/account/slot/brainAuthSlotMintPace';
import { setBrainAuthSlotTokenRotated } from '@src/domain.operations/brain/auth/account/slot/setBrainAuthSlotTokenRotated';
import { asBrainAuthEnvBlanked } from '@src/domain.operations/brain/auth/asBrainAuthEnvBlanked';
import { asBrainCliSpawnEnv } from '@src/domain.operations/enroll/asBrainCliSpawnEnv';
import { withTempDirRemovedAfter } from '@src/infra/filesystem/withTempDirRemovedAfter';

import { join } from 'node:path';

/**
 * .what = log a human into a claude account in an isolated config dir, and park that login in the
 *   keyrack at reach = its email
 * .why = case=1 — `brains auth set` adds an account to the pool with no touch on the grove's own
 *   login, and no token ever printed
 * .note = the login runs in a temp `CLAUDE_CONFIG_DIR` (and secure storage dir), so the grove's
 *   `~/.claude` is never read or written; the temp dir is removed after, so the keyrack becomes the
 *   one holder of the new refresh token
 * .note = the spawn env is a clone's (`asBrainCliSpawnEnv`: no parent session markers), with the
 *   login store kept in the temp dir and each env credential blanked: one would outrank the login
 *   and leave no login file behind (claude-code skips an empty value)
 * .note = the caller must first assert a human is present (`assertBrainAuthLoginHasHuman`)
 * .note = `email`, when given, is the account the human means to log in as: a login that opens
 *   another account is refused before aught is filed
 * .note = `env` is the caller's env, the base of the spawn env; the op never reads `process.env`
 * .note = a second set of a held account files the new login and reports `renewed` (fulcrum F8);
 *   unless the held login names another org, which refuses (a7: one email may sit in two orgs)
 * .note = 🟡 the login file is read at `<dir>/.credentials.json`; dev-env-setup found the token by
 *   its shape instead, so a cli that stores it elsewhere fails here loud ("did not complete"). the
 *   real login is proven only against a seat set aside for tests (fulcrum F6)
 */
export const setBrainAuthAccount = async (
  input: {
    owner: string | null;
    email: string | null;
    env: Record<string, string | undefined>;
  },
  context: ContextBrainAuthAccount = genContextBrainAuthAccount(),
): Promise<{ account: BrainAuthAccount; outcome: 'stored' | 'renewed' }> =>
  // the temp login must not outlive the call: the keyrack is its one holder after
  withTempDirRemovedAfter(
    { prefix: 'rhachet-brains-auth-set-' },
    async ({ dir }) => {
      // a login with nowhere to be filed is lost; refuse before the human spends one
      await context.assertSlotWritable({ owner: input.owner });

      // run the claude cli in the isolated dir, as its cwd too; the human logs in, then exits
      const ran = context.spawnLogin({
        cwd: dir,
        env: {
          ...asBrainCliSpawnEnv({ env: input.env, brainDir: dir, args: [] }),
          CLAUDE_SECURESTORAGE_CONFIG_DIR: dir,
          ...asBrainAuthEnvBlanked(),
        },
      });
      if (ran.error)
        throw new MalfunctionError('the claude cli could not be started', {
          cause: ran.error,
          hint: 'install claude code, then retry: rhx brains auth set --brain claude',
        });

      // read the login the cli left behind
      const oauth = getOneClaudeGroveOauth({
        path: join(dir, '.credentials.json'),
      });
      if (!oauth)
        throw new ConstraintError('the login did not complete', {
          hint: 'run the command again, type /login in claude, finish the browser login, then /exit',
        });

      // name the account the new login opens
      const profile = await context.getProfile({
        accessToken: oauth.accessToken,
      });
      if (profile.status !== 'ok')
        throw new MalfunctionError('the new login could not name its account', {
          status: profile.status,
          hint: 'the keyrack is untouched; wait a few minutes, then run the set again',
        });

      // a login of an account other than the one asked for is never filed
      if (input.email !== null && input.email !== profile.account.email)
        throw new ConstraintError(
          'the login opened a different account than the one asked for',
          {
            asked: input.email,
            opened: profile.account.email,
            hint: `naught was filed; run the set again and log in as ${input.email}`,
          },
        );

      // a held login of this email in another org is never overwritten (a7)
      const held = await context.getSlotEmails({ owner: input.owner });
      const isHeld = held.includes(profile.account.email);
      if (isHeld)
        await assertNoOrgClash(
          { owner: input.owner, account: profile.account },
          context,
        );

      // park it at reach = its email; a keyrack hiccup is retried, so one fault never loses it
      await setLoginFiled(
        {
          owner: input.owner,
          email: profile.account.email,
          token: oauth.refreshToken,
          triesLeft: BRAIN_AUTH_SLOT_MINT_PACE.parkTries,
        },
        context,
      );
      return {
        account: profile.account,
        outcome: isHeld ? 'renewed' : 'stored',
      };
    },
  );

/**
 * .what = file the new login in its keyrack slot; retry a fault, then fail loud with the fix
 * .why = the keyrack is the new login's one holder, so a single hiccup must not lose the browser
 *   login the human just spent; a write that never lands names that naught was filed
 * .note = the login is never kept on disk past the call, even on a fault: a refresh token in a temp
 *   dir would outlive the call that made it. a fresh `set` is the cure
 */
const setLoginFiled = async (
  input: {
    owner: string | null;
    email: string;
    token: string;
    triesLeft: number;
  },
  context: ContextBrainAuthAccount,
): Promise<void> => {
  const slot = { owner: input.owner, email: input.email, token: input.token };
  await context.setSlotToken(slot).catch(async (fault: unknown) => {
    // retry while tries are left; the write is idempotent
    if (input.triesLeft > 1) {
      await context.sleep({ ms: BRAIN_AUTH_SLOT_MINT_PACE.parkGapMs });
      return setLoginFiled(
        { ...input, triesLeft: input.triesLeft - 1 },
        context,
      );
    }

    // every try faulted: the login is lost, and the human must log in again
    throw new MalfunctionError(
      'the new login could not be filed in the keyrack',
      {
        email: input.email,
        tries: BRAIN_AUTH_SLOT_MINT_PACE.parkTries,
        hint: `naught was filed. check \`rhx keyrack status --owner ${input.owner ?? 'default'}\`, then run \`rhx brains auth set --brain claude\` again`,
        cause: fault instanceof Error ? fault : undefined,
      },
    );
  });
};

/**
 * .what = refuse when the login the keyrack holds for this email names a different org
 * .why = a7 — one email can sit in a personal plan and a team org at once; the slot is keyed by
 *   email alone (fulcrum F2), so an overwrite would silently trade one account for the other
 * .note = the held login is read through a mint whose rotated token is parked back first, so the
 *   check itself strands naught; a held login that is spent or absent has no org to compare, and
 *   the renewal proceeds (the common reason to set again)
 * .note = an org either side leaves unnamed cannot clash; the provider does not always name one
 */
const assertNoOrgClash = async (
  input: { owner: string | null; account: BrainAuthAccount },
  context: ContextBrainAuthAccount,
): Promise<void> => {
  // open the held login; a spent or absent one has no org to compare
  const minted = await setBrainAuthSlotTokenRotated(
    { owner: input.owner, email: input.account.email },
    context,
  );
  if (minted.status === 'absent' || minted.status === 'dead') return;
  if (minted.status === 'locked' || minted.status === 'blocked')
    throw new ConstraintError(
      'the keyrack holds this account, but will not open it',
      {
        email: input.account.email,
        status: minted.status,
        hint: minted.fix ?? asBrainAuthSlotUnlockHint({ owner: input.owner }),
      },
    );
  if (minted.status !== 'ok')
    throw new MalfunctionError(
      'the held login could not be read, so its org is unknown',
      {
        email: input.account.email,
        status: minted.status,
        hint: 'the held login stays in the keyrack; wait a few minutes, then retry the set',
      },
    );

  // name the held account; an org either side leaves unnamed cannot clash
  const heldProfile = await context.getProfile({
    accessToken: minted.accessToken,
  });
  if (heldProfile.status !== 'ok')
    throw new MalfunctionError(
      'the held login could not name its account, so its org is unknown',
      {
        email: input.account.email,
        status: heldProfile.status,
        hint: 'the held login was renewed and parked back, and the new one was not filed; wait a few minutes, then retry the set',
      },
    );
  const orgHeld = heldProfile.account.orgId;
  const orgNew = input.account.orgId;
  if (orgHeld === null || orgNew === null || orgHeld === orgNew) return;
  throw new ConstraintError(
    'this email already holds a login for an account in another org',
    {
      email: input.account.email,
      orgHeld,
      orgNew,
      hint: 'the held login was renewed and parked back, and the new one was not filed; log in to the org already held. one email holds one login today, whatever its org',
    },
  );
};
