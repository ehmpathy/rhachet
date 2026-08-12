import { MalfunctionError } from 'helpful-errors';

import type { KeyrackKeyHost } from '@src/domain.objects/keyrack';
import { asKeyrackKeySlugAtReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeySlugAtReach';

/**
 * .what = halts a host-manifest load when an entry's map key disagrees with the entry's own
 *         `slug` and `reach`
 * .why = the manifest records a key's reach TWICE — once in the map key (the address,
 *        built by `asKeyrackKeySlugAtReach`) and once in the entry's `reach` field. every
 *        writer derives both from one input, so they cannot drift today. yet no reader
 *        checked that they still agree, and the two are consumed by DIFFERENT halves of the
 *        system
 *
 * .note = which half reads which is what makes a drift dangerous rather than untidy:
 *         `unlockKeyrackKeys` deliberately builds its grant from the FIELD
 *         (`hostConfig.reach`), and `daemonKeyStore.set` re-keys purely off `grant.reach` —
 *         while lookup addresses the manifest by the KEY. so an entry filed under one
 *         reach whose field names another would hand back a credential for the wrong
 *         reach, with no error at any point. that is e18's failure class, and this
 *         feature exists to make it structurally impossible
 * .note = the manifest is hand-editable by design — it is a human's own encrypted file, and
 *         `keyrack recipient` invites them into it. so "no writer can desync them" is a
 *         claim about OUR writers only, which is exactly the kind of claim that decays
 * .note = the address is CONSTRUCT-only: this rebuilds it from `(slug, reach)` and compares,
 *         rather than a parse of the key back into parts. a parse would need a split rule,
 *         and an exid may legally hold `@` (an email is the obvious name for an account)
 * .note = a MalfunctionError, not a ConstraintError — a desynced manifest is not a setup gap
 *         a human can fix by a flag; it means a writer, or a hand edit, corrupted the file
 */
export const assertKeyrackHostAddressed = (input: {
  address: string;
  host: KeyrackKeyHost;
}): void => {
  const addressExpected = asKeyrackKeySlugAtReach({
    slug: input.host.slug,
    reach: input.host.reach,
  });

  // the common case: the key it is filed under is the key its own fields describe
  if (input.address === addressExpected) return;

  throw new MalfunctionError(
    `keyrack host manifest entry is misaddressed: filed under '${input.address}' but its own slug and reach describe '${addressExpected}'`,
    {
      address: input.address,
      addressExpected,
      slug: input.host.slug,
      reach: input.host.reach?.exid,
      hint: `the entry's map key and its \`reach\` field disagree, so a lookup and an unlock would yield different reaches. restore the entry so its key matches its fields, or remove and re-cut the key with \`rhx keyrack set\``,
    },
  );
};
