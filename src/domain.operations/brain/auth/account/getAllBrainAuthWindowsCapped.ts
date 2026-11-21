import type { BrainAuthAccount } from '@src/domain.objects/BrainAuthAccount';
import type { BrainAuthUsageWindow } from '@src/domain.objects/BrainAuthUsageWindow';
import { asBrainAuthUsageFromClaudeReply } from '@src/domain.operations/brain/auth/account/claude/asBrainAuthUsageFromClaudeReply';
import type { ContextBrainAuthAccount } from '@src/domain.operations/brain/auth/account/genContextBrainAuthAccount';

/**
 * .what = an account's usage windows that sit at 100%, or null when its usage could not be read
 * .why = `use` of a capped account is allowed, with a warn (the capped cell of `use`). an unread
 *   usage must not block the swap it only annotates, and must not pass for "no caps" either: null
 *   lets the caller name it
 */
export const getAllBrainAuthWindowsCapped = async (
  input: {
    accessToken: string;
    account: BrainAuthAccount;
  },
  context: Pick<ContextBrainAuthAccount, 'getUsageReply'>,
): Promise<BrainAuthUsageWindow[] | null> => {
  const usage = await context.getUsageReply({
    accessToken: input.accessToken,
  });
  if (usage.status !== 'ok') return null; // a drifted reply reads as unreadable at the wire, so it lands here too

  // cast the reply, then keep the full windows
  const { windows } = asBrainAuthUsageFromClaudeReply({
    reply: usage.reply,
    account: input.account,
    signedIn: false,
    renewed: false, // only the windows are read here; the row is never rendered
  });
  return asWindowsCappedOnly({ windows });
};

/**
 * .what = the windows that sit at 100%
 * .why = a full window is the one `use` must name; the rest are not news
 */
const asWindowsCappedOnly = (input: {
  windows: BrainAuthUsageWindow[];
}): BrainAuthUsageWindow[] => input.windows.filter((window) => window.capped);
