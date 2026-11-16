import type { BrainAuthUsage } from '@src/domain.objects/BrainAuthUsage';
import { asBrainAuthSlotAbsentError } from '@src/domain.operations/brain/auth/account/asBrainAuthSlotAbsentError';
import { asBrainAuthUsageUnread } from '@src/domain.operations/brain/auth/account/asBrainAuthUsageUnread';
import { getOneClaudeGroveOauth } from '@src/domain.operations/brain/auth/account/claude/getOneClaudeGroveOauth';
import {
  type ContextBrainAuthAccount,
  genContextBrainAuthAccount,
} from '@src/domain.operations/brain/auth/account/genContextBrainAuthAccount';
import { getBrainAuthPath } from '@src/domain.operations/brain/auth/getBrainAuthPath';

import { getOneBrainAuthUsageOfGrove } from './getOneBrainAuthUsageOfGrove';
import { getOneBrainAuthUsageOfSlot } from './getOneBrainAuthUsageOfSlot';

/**
 * .what = the usage of every account this box can reach, or of one: the grove's signed-in one,
 *   then each one parked in the keyrack
 * .why = `brains auth get` (case=2): the same windows dev-env-setup `brains.auth.usage` shows;
 *   `--account <email>` reads one, so a pool loop rotates only the token it asks about
 * .note = the signed-in account is read once, through the grove; its keyrack copy is skipped
 * .note = slots are read one at a time: each read rotates a token under the host mutex, and a
 *   burst of mints invites a rate limit
 */
export const getAllBrainAuthUsage = async (
  input: {
    owner: string | null;
    home: string;
    account: '@all' | string;
  },
  context: ContextBrainAuthAccount = genContextBrainAuthAccount(),
): Promise<BrainAuthUsage[]> => {
  // note the grove's login as the read begins, so a peer `use` mid-read is told from a dead login
  const groveTokenBefore = getOneGroveRefreshToken({ home: input.home });

  // read the signed-in account first
  const grove = await getOneBrainAuthUsageOfGrove(
    { home: input.home },
    context,
  );

  // one account asked for, and it is the signed-in one: the grove read answers it
  if (input.account !== '@all' && grove?.email === input.account)
    return [grove];

  // the parked accounts, bar the one the grove already showed
  const emailsParked = asEmailsParkedOnly({
    emails: await context.getSlotEmails({ owner: input.owner }),
    emailSignedIn: grove?.email ?? null,
  });

  // one account asked for, and not held: refuse with the accounts held
  if (input.account !== '@all' && !emailsParked.includes(input.account))
    throw asBrainAuthSlotAbsentError({
      email: input.account,
      held: emailsParked,
      signedIn: grove?.email ?? null,
    });

  // one account asked for: read only its slot
  if (input.account !== '@all')
    return asUsagesInMotionRead({
      usages: [
        await getOneBrainAuthUsageOfSlot(
          { owner: input.owner, email: input.account },
          context,
        ),
      ],
      groveTokenBefore,
      home: input.home,
    });

  // every account: the grove, then each parked one in turn
  const parked = await getAllBrainAuthUsageOfSlotsInTurn(
    { owner: input.owner, emails: emailsParked },
    context,
  );
  return asUsagesInMotionRead({
    usages: grove ? [grove, ...parked] : parked,
    groveTokenBefore,
    home: input.home,
  });
};

/**
 * .what = each `dead` parked row re-read as `unreadable` when the grove's login moved mid-read
 * .why = a peer `use` mints its target from the keyrack and installs it in the grove before it
 *   clears the spent keyrack copy; a read in that window finds a spent token and would call a live
 *   account dead. a grove that moved since the read began names that motion, and a retry reads true
 */
const asUsagesInMotionRead = (input: {
  usages: BrainAuthUsage[];
  groveTokenBefore: string | null;
  home: string;
}): BrainAuthUsage[] => {
  const isAnyParkedDead = input.usages.some(
    (usage) => usage.status === 'dead' && !usage.signedIn,
  );
  if (!isAnyParkedDead) return input.usages;
  const groveTokenAfter = getOneGroveRefreshToken({ home: input.home });
  if (groveTokenAfter === input.groveTokenBefore) return input.usages;
  return input.usages.map((usage) =>
    usage.status === 'dead' && !usage.signedIn
      ? asBrainAuthUsageUnread({ ...usage, status: 'unreadable' })
      : usage,
  );
};

/**
 * .what = the grove's refresh token, or null when it holds none
 * .why = only a compare of the token tells a grove in motion from one at rest; it never leaves
 *   this module
 */
const getOneGroveRefreshToken = (input: { home: string }): string | null =>
  getOneClaudeGroveOauth({ path: getBrainAuthPath({ home: input.home }) })
    ?.refreshToken ?? null;

/**
 * .what = the stored emails, without the one the grove is signed in on
 * .why = the signed-in account is read through the grove's live token; a slot read of it would
 *   mint a second copy beside the live one
 */
const asEmailsParkedOnly = (input: {
  emails: string[];
  emailSignedIn: string | null;
}): string[] => input.emails.filter((email) => email !== input.emailSignedIn);

/**
 * .what = the usage of each parked account, read strictly one after another
 * .why = each read is a mint that rotates a token; reads in parallel would contend for the host
 *   mutex and invite a provider rate limit
 */
const getAllBrainAuthUsageOfSlotsInTurn = async (
  input: {
    owner: string | null;
    emails: string[];
  },
  context: ContextBrainAuthAccount,
): Promise<BrainAuthUsage[]> => {
  const [email, ...emailsRest] = input.emails;
  if (!email) return [];
  const usage = await getOneBrainAuthUsageOfSlot(
    { owner: input.owner, email },
    context,
  );
  const usagesRest = await getAllBrainAuthUsageOfSlotsInTurn(
    { owner: input.owner, emails: emailsRest },
    context,
  );
  return [usage, ...usagesRest];
};
