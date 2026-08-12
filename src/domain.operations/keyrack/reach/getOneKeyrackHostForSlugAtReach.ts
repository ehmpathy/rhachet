import type { KeyrackHostManifest } from '@src/domain.objects/keyrack/KeyrackHostManifest';
import type { KeyrackKeyHost } from '@src/domain.objects/keyrack/KeyrackKeyHost';
import type { KeyrackKeyReach } from '@src/domain.objects/keyrack/KeyrackKeyReach';
import { getAllKeyrackProbeAddresses } from '@src/domain.operations/keyrack/reach/getAllKeyrackProbeAddresses';

/**
 * .what = find the host entry that serves one slug at one reach, and say under which
 *         slug it was found
 * .why = the lookup has two shots — the slug as asked, then its `env=all` twin — so the
 *        answer is a PAIR: the entry, plus the slug it actually answered under. that pair
 *        is what the caller needs, and it is why the inline form needed two mutable
 *        variables to carry it
 *
 * .note = the probe ORDER — and the invariant that its env=all shot carries the reach across —
 *         belongs to `getAllKeyrackProbeAddresses`, shared with the daemon store and the
 *         not-granted status probe. this operation supplies only what is its own: the probe
 *         itself, a manifest read
 * .note = returns `null` rather than a partial pair, so an absent host cannot be read as a
 *         found one with an empty slug. the caller decides what an absence means: with a
 *         reach it is a loud `ConstraintError` (e6), without one it is a plain omission
 */
export const getOneKeyrackHostForSlugAtReach = (input: {
  hosts: KeyrackHostManifest['hosts'];
  slug: string;
  reach?: KeyrackKeyReach;
}): { hostConfig: KeyrackKeyHost; effectiveSlug: string } | null => {
  for (const probe of getAllKeyrackProbeAddresses({
    slug: input.slug,
    reach: input.reach,
  })) {
    const hostConfig = input.hosts[probe.address];
    if (hostConfig) return { hostConfig, effectiveSlug: probe.slug };
  }

  return null;
};
