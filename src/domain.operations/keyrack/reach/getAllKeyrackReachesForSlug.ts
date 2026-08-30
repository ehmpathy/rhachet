import type { KeyrackHostManifest } from '@src/domain.objects/keyrack/KeyrackHostManifest';
import type { KeyrackKeyReach } from '@src/domain.objects/keyrack/KeyrackKeyReach';

import { getAllKeyrackProbeSlugs } from './getAllKeyrackProbeSlugs';
import { isKeyrackVaultReachUnaddressable } from './isKeyrackVaultReachUnaddressable';

/**
 * .what = list every reach the host manifest holds for one slug
 * .why = a bulk unlock names no reach, yet a key cut only at reaches has no reachless twin
 *        to answer with. so the reachless ask ENUMERATES: one target per reach the rack
 *        actually holds, each unlocked at its own address. without it a bulk unlock reports
 *        `absent` for a credential the rack plainly holds
 *
 * .note = ⚠️ enumeration is NOT derivation, and that distinction is the whole safety case.
 *         every reach returned was READ OFF an entry the rack holds, so a caller can only
 *         ever unlock a credential that was genuinely cut. an ask AT a named reach still
 *         never falls back to a peer — that guard lives at the caller and is untouched
 * .note = reads the `slug` FIELD each entry records, never the map key. the keys are
 *         ADDRESSES (`slug@exid`), and an address is construct-only: a reach exid may
 *         legally hold `@`, so a split back is not well-defined (term=address)
 * .note = probes the same TWO shots the lookup itself does — the slug as asked, then its
 *         `env=all` twin — so an enumeration can never find fewer reaches than the probe
 *         would go on to answer at (`getAllKeyrackProbeAddresses`). ⚠️ that agreement is
 *         STRUCTURAL, not a promise: both read the one shared list, `getAllKeyrackProbeSlugs`,
 *         so a third shot added there reaches both at once and neither can drift
 * .note = deduped by exid (one reach may be held under both the slug and its twin) and
 *         sorted, so a bulk unlock renders the same order run to run
 *
 * .note = ⚠️ `only: 'vault-addressable'` narrows to the reaches an `unlock --reach` could
 *         ACTUALLY serve, and it is opt-in for a reason the caller alone can see. a vault whose
 *         policy is `UNADDRESSABLE` stores one value per bare name, so a reach-ask against it is
 *         refused loudly by `assertKeyrackReachAddressable`. a caller that RECOMMENDS a reach to
 *         a human must drop those, or it names a command guaranteed to fail. the unlock loop must
 *         NOT: its own skip is gated on `!input.reach`, so a reach the CALLER named still owes
 *         the loud refusal — a fact this query cannot see, so it must never decide it
 * .note = the narrow drops `UNADDRESSABLE` alone, never `VIA_MECH`. an `aws.config` entry IS
 *         held at a composite address like any other, so a reach-cut key there is genuinely
 *         stored per-reach and its unlock may well serve — the refusal, if any, belongs to the
 *         mech. to drop it here would suppress a CORRECT tip and send the human to `set`, which
 *         on an addressed vault cuts the reachless twin this whole transformer exists to prevent
 */
export const getAllKeyrackReachesForSlug = (
  input: {
    hosts: KeyrackHostManifest['hosts'];
    slug: string;
  },
  options?: { only?: 'vault-addressable' },
): KeyrackKeyReach[] => {
  const slugsHeld = getAllKeyrackProbeSlugs({ slug: input.slug });

  const reachesHeld = Object.values(input.hosts).flatMap((host) => {
    if (!slugsHeld.includes(host.slug) || !host.reach) return [];
    if (
      options?.only === 'vault-addressable' &&
      isKeyrackVaultReachUnaddressable({ vault: host.vault })
    )
      return [];
    return [host.reach];
  });

  // ⚠️ compared by CODE UNIT, never `localeCompare`. this order is a published contract twice
  //    over — a snapshot asserts it, and `asKeyrackOmittedKeyTip` picks from the head of it to
  //    name a reach to a human. `localeCompare` reads the runtime's locale, which is external
  //    state, so the same rack could tip a different account on another machine or node build
  //    (`rule.forbid.behavior-hazards`). every locale agrees on today's ascii exids, which is
  //    why this never bit — but an order a human acts on must not rest on ambient config
  return [...new Map(reachesHeld.map((r) => [r.exid, r])).values()].sort(
    (a, b) => (a.exid < b.exid ? -1 : a.exid > b.exid ? 1 : 0),
  );
};
