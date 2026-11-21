import { CLAUDE_AUTH_SLOT } from '@src/domain.operations/brain/auth/account/claude/claudeAuthSlot';
import { assertBrainAuthSlotWritable } from '@src/domain.operations/brain/auth/account/slot/assertBrainAuthSlotWritable';
import { genContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';
import { asKeyrackKeyReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReach';
import { setKeyrackKeyHost } from '@src/domain.operations/keyrack/setKeyrackKeyHost';

/**
 * .what = write one account's refresh token into the keyrack, at reach = its email
 * .why = `set` files a new account (case=1); `get` and `use` write back each rotated token (case=9)
 * .note = the token reaches the vault through the mech's `question` seam, never stdin, argv or a log
 * .note = the keyrack files the manifest entry under its own host mutex, over a fresh read, so a
 *   peer write in any repo on the box is never lost
 */
export const setBrainAuthSlotToken = async (input: {
  owner: string | null;
  email: string;
  token: string;
}): Promise<void> => {
  // load the manifest the set requires; an owner with no keyrack refuses, with its fix
  const context = genContextKeyrack({
    owner: input.owner,
    mech: { question: async () => input.token },
  });
  await assertBrainAuthSlotWritable({ owner: input.owner }, context);

  // file the token at its account's reach
  await setKeyrackKeyHost(
    {
      slug: CLAUDE_AUTH_SLOT.slug,
      mech: CLAUDE_AUTH_SLOT.mech,
      vault: CLAUDE_AUTH_SLOT.vault,
      env: CLAUDE_AUTH_SLOT.env,
      org: CLAUDE_AUTH_SLOT.org,
      reach: asKeyrackKeyReach({ exid: input.email }),
    },
    context,
  );
};
