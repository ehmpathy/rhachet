import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { now } from 'iso-time';

import type { BrainAuthAccount } from '@src/domain.objects/BrainAuthAccount';
import type { BrainAuthUsageWindow } from '@src/domain.objects/BrainAuthUsageWindow';
import { asBrainAuthSetHint } from '@src/domain.operations/brain/auth/account/asBrainAuthSetHint';
import { asBrainAuthSlotAbsentError } from '@src/domain.operations/brain/auth/account/asBrainAuthSlotAbsentError';
import { getOneClaudeGroveOauth } from '@src/domain.operations/brain/auth/account/claude/getOneClaudeGroveOauth';
import { getOneClaudeJsonAccountClaimed } from '@src/domain.operations/brain/auth/account/claude/getOneClaudeJsonAccountClaimed';
import { isClaudeOauthLapsed } from '@src/domain.operations/brain/auth/account/claude/isClaudeOauthLapsed';
import { setClaudeGroveOauthSwapped } from '@src/domain.operations/brain/auth/account/claude/setClaudeGroveOauthSwapped';
import { setClaudeJsonAccountSynced } from '@src/domain.operations/brain/auth/account/claude/setClaudeJsonAccountSynced';
import {
  type ContextBrainAuthAccount,
  genContextBrainAuthAccount,
} from '@src/domain.operations/brain/auth/account/genContextBrainAuthAccount';
import { getAllBrainAuthWindowsCapped } from '@src/domain.operations/brain/auth/account/getAllBrainAuthWindowsCapped';
import { isBrainAuthAccountSame } from '@src/domain.operations/brain/auth/account/isBrainAuthAccountSame';
import { asBrainAuthSlotUnlockHint } from '@src/domain.operations/brain/auth/account/slot/asBrainAuthSlotUnlockHint';
import { getOneBrainAuthSlotAccessMinted } from '@src/domain.operations/brain/auth/account/slot/getOneBrainAuthSlotAccessMinted';
import { withBrainAuthSlotTokenRefiledOnAbort } from '@src/domain.operations/brain/auth/account/slot/withBrainAuthSlotTokenRefiledOnAbort';
import { getAllBrainAuthEnvOutrankers } from '@src/domain.operations/brain/auth/getAllBrainAuthEnvOutrankers';
import { getBrainAuthPath } from '@src/domain.operations/brain/auth/getBrainAuthPath';

/**
 * .what = put a parked account to use for the whole grove: every clone on the box that reads the
 *   shared login
 * .why = case=3 — swap the grove's account, proven by a before and after compare, never by the
 *   write's exit code alone
 * .note = the order holds each refresh token in exactly one place at every step:
 *   0. an env credential that outranks the grove file refuses before any read or write: the grove
 *      file is not what clones read (case=8 [t0])
 *   1. read `before` with the live access token; never refresh it (case=9). lapsed or refused →
 *      refuse (exit 2); a busy or unreachable provider → malfunction (exit 1), retry later
 *   2. already on the target → `unchanged`: no mint, no write, no usage read (case=10 [t2])
 *   3. mint the target from its keyrack slot; its rotated token stays in memory, never parked
 *   4. name it, then under claude's own write lock: compare-and-swap on the live refresh token,
 *      then install. any abort refiles the rotated token, so the target stays usable (case=8 [t1])
 *   5. stow the prior account's token in its slot, the first write after the install: from the
 *      install on, the prior token lives only in memory until this lands
 *   6. clear the target's spent keyrack copy; a crash before this leaves only a spent copy, which
 *      `get` never reads since the grove names that account. a fault in 5 or 6 names the use as
 *      landed, so no human retries a swap that is done
 *   7. read `after` back from the grove file; it must name the target, by email and org
 *      (case=8 [t0b]). a read-back that does not answer says the use landed, unverified
 *   8. read the target's capped windows with the minted access token, after the install, so the
 *      swap's window from mint to install stays short
 * .note = the `unchanged` shortcut compares by email: the keyrack holds one login per email (F2),
 *   and its org is unknown without a mint, which a retry must not spend (case=10 [t2])
 * .note = never returns, logs, or throws a token value
 * .note = every reach past this process (keyrack, provider) rides `context`, so a test runs the
 *   whole order over a temp home; the grove file and claude's write lock are always real
 */
export const setBrainAuthAccountInUseAtGrove = async (
  input: {
    owner: string | null;
    home: string;
    email: string;
    env: NodeJS.ProcessEnv;
  },
  context: ContextBrainAuthAccount = genContextBrainAuthAccount(),
): Promise<{
  outcome: 'swapped' | 'unchanged';
  before: BrainAuthAccount | null;
  after: BrainAuthAccount;
  stowed: string | null;
  windowsCapped: BrainAuthUsageWindow[] | null;
}> => {
  const brainAuthPath = getBrainAuthPath({ home: input.home });

  // 0. an env credential that outranks the grove file means no swap would reach a clone; refuse first
  assertNoEnvOutrankers({ env: input.env, email: input.email });

  // 1. read the grove's live account, with its access token only; a lapsed one is not refreshed
  const groveBefore = getOneClaudeGroveOauth({ path: brainAuthPath });
  const isLapsed =
    !!groveBefore &&
    isClaudeOauthLapsed({ expiresAt: groveBefore.expiresAt, now: now() });
  const before =
    groveBefore && !isLapsed
      ? await context.getProfile({ accessToken: groveBefore.accessToken })
      : null;
  if (
    groveBefore &&
    (before?.status === 'rate-limited' || before?.status === 'unreadable')
  )
    throw new MalfunctionError(
      "the grove's signed-in account could not be read",
      {
        status: before.status,
        hint: 'the grove is untouched; the provider is busy or unreachable. wait a few minutes, then retry',
      },
    );
  if (groveBefore && before?.status !== 'ok')
    throw new ConstraintError("the grove's signed-in account is unverified", {
      signedIn:
        getOneClaudeJsonAccountClaimed({ home: input.home })?.email ?? 'none',
      why: isLapsed
        ? 'its live access token has lapsed, and a refresh would end the session it serves'
        : 'the provider no longer accepts its access token',
      hint: 'run any claude session on this box once; it renews the login. then retry',
    });
  const accountBefore = before?.status === 'ok' ? before.account : null;

  // 2. already on the target: naught to mint, naught to write, naught read of its usage
  // .note = a `.claude.json` record a prior use left stale is repaired here; one in sync is untouched
  if (accountBefore && accountBefore.email === input.email) {
    setClaudeJsonAccountSynced({ home: input.home, account: accountBefore });
    return {
      outcome: 'unchanged',
      before: accountBefore,
      after: accountBefore,
      stowed: null,
      windowsCapped: null,
    };
  }

  // 3. mint the target from its parked token; refuse before any write if it cannot open
  const minted = await getOneBrainAuthSlotAccessMinted(
    { owner: input.owner, email: input.email },
    context,
  );
  if (minted.status === 'absent')
    throw asBrainAuthSlotAbsentError({
      email: input.email,
      held: await context.getSlotEmails({ owner: input.owner }),
      signedIn: accountBefore?.email ?? null,
    });
  if (minted.status === 'locked' || minted.status === 'blocked')
    throw new ConstraintError(
      'the keyrack holds this account, but will not open it',
      {
        email: input.email,
        status: minted.status,
        hint: minted.fix ?? asBrainAuthSlotUnlockHint({ owner: input.owner }),
      },
    );
  if (minted.status === 'dead')
    throw new ConstraintError(
      'the parked login for this account no longer opens it',
      {
        email: input.email,
        hint: asBrainAuthSetHint({ email: input.email }),
      },
    );
  if (minted.status !== 'ok')
    throw new MalfunctionError('the token endpoint did not answer', {
      email: input.email,
      status: minted.status,
      hint:
        minted.status === 'rate-limited'
          ? 'the grove is untouched and the parked login unspent; wait a few minutes, then retry'
          : `the grove is untouched; wait a few minutes, then retry. the endpoint may have spent the parked login before its reply was lost or unreadable: if the retry reads it dead, log in again via \`${asBrainAuthSetHint({ email: input.email })}\``,
    });

  // 4. name the target and install it; an abort refiles the rotated token (case=8 [t1])
  const refreshTokenBefore = groveBefore?.refreshToken ?? null;
  const { target } = await withBrainAuthSlotTokenRefiledOnAbort(
    {
      slot: {
        owner: input.owner,
        email: input.email,
        token: minted.refreshToken,
      },
      // the grove file holds the rotated token once the install landed
      isHeldByNewHolder: () =>
        getOneClaudeGroveOauth({ path: brainAuthPath })?.refreshToken ===
        minted.refreshToken,
      logic: async () => {
        const target = await context.getProfile({
          accessToken: minted.accessToken,
        });
        if (target.status !== 'ok')
          throw new MalfunctionError(
            'the minted target could not name its account',
            {
              status: target.status,
              hint: 'the grove is untouched and the target stays parked; wait a few minutes, then retry',
            },
          );

        // compare-and-swap the grove file; a live session that rotated it since `before` wins
        const isSwapped = await setClaudeGroveOauthSwapped({
          brainAuthPath,
          refreshTokenBefore,
          oauth: {
            accessToken: minted.accessToken,
            refreshToken: minted.refreshToken,
            expiresAt: minted.expiresAt,
            scopes: minted.scopes,
            subscriptionType: null, // the prior plan never describes the target (fulcrum F9)
          },
        });
        if (!isSwapped)
          throw new MalfunctionError('grove login changed mid-swap', {
            email: input.email,
            hint: 'a live claude session rewrote the login; the target stays parked and usable. retry the use',
          });
        return { target };
      },
    },
    { setSlotToken: context.setSlotToken },
  );

  // 5. stow the prior account's token as is; from the install on, memory is its only holder
  const stowed = accountBefore && groveBefore ? accountBefore.email : null;
  if (accountBefore && groveBefore)
    await context
      .setSlotToken({
        owner: input.owner,
        email: accountBefore.email,
        token: groveBefore.refreshToken,
      })
      .catch((stowFault: unknown) => {
        // the grove holds the target now, so the prior login is lost; say so, with its cure
        throw new MalfunctionError(
          `the use landed, but ${accountBefore.email}'s login could not be stowed, so it is lost`,
          {
            landed: true,
            stowed: 'none',
            grove: input.email,
            hint: asBrainAuthSetHint({ email: accountBefore.email }),
            cause: stowFault instanceof Error ? stowFault : undefined,
          },
        );
      });

  // the cli's own record names the account the grove now holds; 6. the target's keyrack copy is
  //   spent, so the grove is its one holder now. a fault here follows a landed install: say so
  await withUseLandedOnFault({ grove: input.email, stowed }, async () => {
    setClaudeJsonAccountSynced({ home: input.home, account: target.account });
    await context.delSlotToken({ owner: input.owner, email: input.email });
  });

  // 7. read back from the grove file; the compare is the proof
  const groveAfter = getOneClaudeGroveOauth({ path: brainAuthPath });
  const after = groveAfter
    ? await context.getProfile({ accessToken: groveAfter.accessToken })
    : null;
  if (after?.status !== 'ok')
    throw new MalfunctionError(
      'use landed, but its read-back could not be verified',
      {
        target: asAccountNamed({ account: target.account }),
        after: after?.status ?? 'no login in the grove file',
        stowed: stowed ?? 'none',
        hint: 'rhx brains auth get   # see which account the grove holds now; a retry of the use reports unchanged once it is verified',
      },
    );
  if (!isBrainAuthAccountSame({ a: after.account, b: target.account }))
    throw new MalfunctionError('use did not land', {
      target: asAccountNamed({ account: target.account }),
      after: asAccountNamed({ account: after.account }),
      hint: 'rhx brains auth get   # see which account the grove holds now; then retry the use',
    });

  // a full window is allowed, but named: the target is spent until its reset. read after the
  //   install, so the swap's window stays short. null = unread
  const windowsCapped = await getAllBrainAuthWindowsCapped(
    { accessToken: minted.accessToken, account: target.account },
    context,
  );
  return {
    outcome: 'swapped',
    before: accountBefore,
    after: after.account,
    stowed,
    windowsCapped,
  };
};

/**
 * .what = run a step that follows a landed install; a fault in it says the use landed
 * .why = from the install on, the grove holds the target. a raw fault there would read as "did not
 *   land", and send a human to a retry that is not needed
 */
const withUseLandedOnFault = async (
  input: { grove: string; stowed: string | null },
  logic: () => Promise<void>,
): Promise<void> => {
  try {
    await logic();
  } catch (fault) {
    throw new MalfunctionError('the use landed, but a step after it faulted', {
      landed: true,
      grove: input.grove,
      stowed: input.stowed ?? 'none',
      hint: 'rhx brains auth get   # the grove holds the target; a retry of the use reports unchanged and repairs the rest',
      cause: fault instanceof Error ? fault : undefined,
    });
  }
};

/**
 * .what = an account as the compare reads it, e.g. `b@example.com in org-b`
 * .why = the proof is (email, orgId); a mismatch of org alone must be visible in the error
 */
const asAccountNamed = (input: { account: BrainAuthAccount }): string =>
  `${input.account.email} in ${input.account.orgId ?? 'org unknown'}`;

/**
 * .what = refuse when an env credential outranks the grove login: the grove file names the target,
 *   but a clone that inherits this env reads the env credential instead
 * .why = case=8 [t0]: success is only claimed where the read back is what clones will use. the fix
 *   is the caller's env, so it is a constraint (exit 2), never a retry
 * .note = it reads only the env, so it runs first: the refusal leaves the grove and keyrack as found
 */
const assertNoEnvOutrankers = (input: {
  env: NodeJS.ProcessEnv;
  email: string;
}): void => {
  const outrankers = getAllBrainAuthEnvOutrankers({ env: input.env });
  if (outrankers.length === 0) return;
  throw new ConstraintError('an env credential outranks the grove login', {
    target: input.email,
    outrankers,
    hint: `unset ${outrankers.join(' ')}   # in the env where clones spawn`,
  });
};
