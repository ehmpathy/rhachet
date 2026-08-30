import type { KeyrackHostManifest } from '@src/domain.objects/keyrack/KeyrackHostManifest';
import type { KeyrackKeyAsk } from '@src/domain.objects/keyrack/KeyrackKeyAsk';

import { getAllKeyrackSlugsHeld } from './getAllKeyrackSlugsHeld';
import { isKeyrackAskFullShaped } from './isKeyrackAskFullShaped';

/**
 * .what = expand a key ask to the matched sudo slugs the host manifest holds
 * .why = sudo keys use org-scoped lookup: the repo's org first, then the `@all` fallback
 *
 * .note = if a full ask (slug or address) is provided and the manifest holds it, yields THAT
 *   entry's own `slug` field
 * .note = if a key name only, expands to `{repoOrg}.sudo.{keyAsk}` + `@all.sudo.{keyAsk}`
 * .note = asks come from cli callers, handed through untouched
 * .note = it returns SLUGS, never addresses — `hosts` is address-keyed, and the caller re-applies
 *   the asked reach per slug itself (`unlockKeyrackKeys` → `getOneKeyrackHostForSlugAtReach`)
 *
 * .note = ⚠️ `hosts` is keyed by ADDRESS (`slug@reachExid`) and every entry ALSO carries its own
 *   `slug` field, so a reader that indexes the map with a SLUG can never match an entry cut at a
 *   reach — the entry's key carries the reach too. that left a reach-cut sudo key WRITE-ONLY via
 *   `unlock --env sudo`, the exact defect `getAllMachineWideSlugsForEnv` was repaired for.
 *   `@all.sudo.FOO@github://org=ehmpathy` is a LEGAL address
 *   (`asKeyrackKeySlugAtReach.test.ts:84-97`), so it was reachable, not theoretical
 * .note = an address is CONSTRUCT-ONLY and is never split back on `@` — a reach exid is an email
 *   and legally holds one (`term=address`). the repair reads the `slug` FIELD off the map's
 *   VALUES; it never parses a key
 * .note = the shape test is `isKeyrackAskFullShaped`, the ONE named answer, rather than the
 *   dot-and-membership test this carried. that test coupled SHAPE to EXISTENCE — an ask that was
 *   slug-shaped but absent from the map read as a bare NAME, and then had `{org}.sudo.` built onto
 *   a string that already carried its own org and env
 *
 * .the structural cure, recorded for the next traveler = this defect class surfaced at FOUR
 *   independent call sites before all four were repaired, because `Record<string, KeyrackKeyHost>`
 *   accepts ANY string as a key — so the compiler cannot tell an address from a slug and every new
 *   reader must re-derive "this map is address-keyed" or reintroduce the bug. a BRANDED
 *   `KeyrackHostAddress` type, distinct from the slug type, would make each such site a compile
 *   error instead. that is a repo-wide type change, out of this behavior's scope, and it is the
 *   durable fix for the class — the four repairs close today's instances, not the door
 */
export const getAllSudoSlugsForKeyAsk = (input: {
  keyAsk: KeyrackKeyAsk;
  repoOrg: string | null;
  hostManifest: KeyrackHostManifest;
}): string[] => {
  // the ask's SHAPE is decided once, by the one named answer, and never by whether the map
  // happens to hold it — shape and existence are separate questions
  const askIsFullShaped = isKeyrackAskFullShaped({ ask: input.keyAsk });

  // a full ask (slug or address) the manifest holds yields THAT entry's own slug
  //
  // ⚠️ it returns the entry's `slug` FIELD, never the ask itself. this probe indexes an
  //    ADDRESS-keyed map, so an ask that names a full ADDRESS hits here and would otherwise hand
  //    the address back as a slug. a reachless entry has `slug === address`, so every extant ask
  //    is byte-identical
  const hostForFullAsk = askIsFullShaped
    ? input.hostManifest.hosts[input.keyAsk]
    : undefined;
  if (hostForFullAsk) return [hostForFullAsk.slug];

  // a full-shaped ask the manifest does NOT hold is still a full ask — it must never have a
  // `{org}.sudo.` prefix built onto a string that already carries its own org and env
  const candidateSlugs: string[] = askIsFullShaped
    ? [input.keyAsk]
    : [
        // the org-specific slug, when the repo declares an org
        ...(input.repoOrg ? [`${input.repoOrg}.sudo.${input.keyAsk}`] : []),
        // the cross-org wildcard
        `@all.sudo.${input.keyAsk}`,
      ];

  // narrow to the slugs the manifest actually holds
  //
  // .note = `getAllKeyrackSlugsHeld` carries the address-vs-slug invariant: the slug is read off
  //         each entry's own field, never off the address-shaped map key, so a slug held ONLY at
  //         reaches is found rather than missed
  const slugsHeld = new Set(
    getAllKeyrackSlugsHeld({ hosts: input.hostManifest.hosts }),
  );
  return candidateSlugs.filter((slug) => slugsHeld.has(slug));
};
