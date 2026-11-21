import { daoKeyrackHostManifest } from '@src/access/daos/daoKeyrackHostManifest';
import { CLAUDE_AUTH_SLOT } from '@src/domain.operations/brain/auth/account/claude/claudeAuthSlot';
import { delKeyrackKeyHost } from '@src/domain.operations/keyrack/delKeyrackKeyHost';
import { genContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';
import { asKeyrackKeyReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReach';

/**
 * .what = remove one account's parked token from the keyrack
 * .why = case=3 [t1] — once `use` installs an account in the grove, its keyrack copy is spent; the
 *   slot is cleared so each refresh token has exactly one holder
 * .note = idempotent: a slot already absent is a no-op
 * .note = the keyrack drops the manifest entry under its own host mutex, over a fresh read
 */
export const delBrainAuthSlotToken = async (input: {
  owner: string | null;
  email: string;
}): Promise<void> => {
  const context = genContextKeyrack({ owner: input.owner });
  const loaded = await daoKeyrackHostManifest.get(
    { owner: input.owner },
    context,
  );
  if (!loaded) return;
  await delKeyrackKeyHost(
    {
      slug: CLAUDE_AUTH_SLOT.slug,
      reach: asKeyrackKeyReach({ exid: input.email }),
    },
    context,
  );
};
