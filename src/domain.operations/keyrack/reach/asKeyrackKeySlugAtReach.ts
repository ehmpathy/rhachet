import type { KeyrackKeyReach } from '@src/domain.objects/keyrack/KeyrackKeyReach';
import { asKeyrackKeyReachExid } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachExid';

/**
 * .what = address a key by its full identity — its slug AND the reach it opens
 * .why = reach is an identity axis, so every collection that holds keys must key by
 *        (slug, reach). two keys that share a slug but differ in reach were never one key,
 *        and a slug-only collection silently evicts one with the other
 *
 * .note = a key with NO reach addresses as its bare slug, byte for byte. that is what
 *         keeps every extant host manifest, daemon entry, and snapshot unchanged (e1)
 * .note = the result is OPAQUE — it is only ever constructed, never decomposed. a caller
 *         that needs the parts reads them off the grant or host, which carry both
 *
 * .example = { slug: 'ahbode.prep.FOO' }                         → 'ahbode.prep.FOO'
 * .example = { slug: 'ahbode.prep.FOO', reach: <github ehmpathy> } → 'ahbode.prep.FOO@github://org=ehmpathy'
 */
export const asKeyrackKeySlugAtReach = (input: {
  slug: string;
  reach?: KeyrackKeyReach;
}): string => {
  if (!input.reach) return input.slug;
  return `${input.slug}@${asKeyrackKeyReachExid({ reach: input.reach })}`;
};
