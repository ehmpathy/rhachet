import type { IsoTimeStamp } from 'iso-time';

import { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';

/**
 * .what = generates a mock KeyrackKeyGrant for tests
 * .why = the grant literal is the core domain shape every render suite needs, and it was
 *        hand-written at eight sites across two files — so a field added to
 *        `KeyrackKeyGrant` had to be remembered eight times, and eight copies could drift
 *        apart with no compiler tie between them (`rule.require.shared-test-fixtures`)
 *
 * .note = ⚠️ `reach` is OMITTED, never set to `undefined`, when a caller supplies none. that
 *         is e16, and it is not decoration: `JSON.stringify` DROPS an absent field but EMITS
 *         a null one, and only an `in` probe tells absent from present-and-undefined. a
 *         generator that always wrote the key would make a reachless case impossible to
 *         express — the same trap `genMockKeyrackHostManifest` documents for its own `reach`
 * .note = `expiresAt` is likewise omitted unless supplied, so a grant that does not expire
 *         renders exactly as it always has
 * .note = the defaults are the majority shape across the extant suites — an `os.secure`
 *         permanent replica for `ehmpathy`/`test`. every field is overridable, because the
 *         cases that matter are precisely the ones that differ from the common shape
 */
export const genMockKeyrackKeyGrant = (
  input: Partial<KeyrackKeyGrant> & { slug: string },
): KeyrackKeyGrant =>
  new KeyrackKeyGrant({
    slug: input.slug,
    key: input.key ?? {
      secret: 'secret',
      grade: { protection: 'encrypted', duration: 'permanent' },
    },
    source: input.source ?? {
      vault: 'os.secure',
      mech: 'PERMANENT_VIA_REPLICA',
    },
    env: input.env ?? 'test',
    org: input.org ?? 'ehmpathy',
    // .note = OPTIONAL, never nullable, and never `undefined` — see e16 above
    ...(input.reach ? { reach: input.reach } : {}),
    ...(input.expiresAt ? { expiresAt: input.expiresAt as IsoTimeStamp } : {}),
  });
