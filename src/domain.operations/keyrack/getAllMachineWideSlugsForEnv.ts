import type { KeyrackHostManifest } from '@src/domain.objects/keyrack/KeyrackHostManifest';
import type { KeyrackKeyAsk } from '@src/domain.objects/keyrack/KeyrackKeyAsk';

import { getAllKeyrackSlugsHeld } from './getAllKeyrackSlugsHeld';
import { isKeyrackAskFullShaped } from './isKeyrackAskFullShaped';

/**
 * .what = expand an env (and optional key ask) to the matched machine-wide `@all` slugs held in
 *   the host manifest
 * .why = an `@all` key is MACHINE-WIDE (the box's own namespace), so it must be unlockable with NO
 *   repo manifest at all — the bootstrap-to-clone credential path: the github-app install token is
 *   vaulted under `@all` precisely so it can be fetched from anywhere, even outside any repo,
 *   before any repo is cloned. this mirrors `getAllSudoSlugsForKeyAsk` (the sudo no-manifest path)
 *   but spans the normal envs (test/prep/prod), matched on the reserved `@all` org segment
 *
 * .note = if a full slug (or address) is provided and the manifest holds it, yields THAT entry's
 *   own `slug` field
 * .note = if a key name only, matches `@all.{env}.{keyAsk}`
 * .note = if no key ask, matches EVERY `@all.{env}.*` key in the host manifest for that env
 * .note = it returns SLUGS, never addresses — `hosts` is address-keyed, and the caller re-applies
 *   the asked reach per slug itself (`unlockKeyrackKeys` → `getOneKeyrackHostForSlugAtReach`)
 */
export const getAllMachineWideSlugsForEnv = (input: {
  env: string;
  keyAsk: KeyrackKeyAsk | null;
  hostManifest: KeyrackHostManifest;
}): string[] => {
  // the ask is reduced to its ONE candidate slug HERE, at the top, and BOTH paths below read
  // that single reduction rather than re-derive it
  //
  // ⚠️ `KeyrackKeyAsk` sanctions three shapes — a bare key name, a full slug, and a full address
  //    — and the cli hands `--key` through untouched (`invokeKeyrack.ts`), so every path must
  //    agree on what an ask IS. only a DOT-FREE ask is a bare name that needs the `@all.{env}.`
  //    prefix; an ask that already holds a dot is slug- or address-shaped, so it IS the candidate.
  //
  //    ⛔ TWO branches that each decided this for themselves is precisely what produced the i007
  //    defect: the tail rebuilt `@all.{env}.` onto an ask that ALREADY carried it —
  //    `@all.{env}.@all.{env}.KEY`, a doubled prefix that can never match — so a key held ONLY at
  //    reaches came back absent, the very silent-wrong-answer this function exists to end. that
  //    branch was dead while the map was slug-keyed (the shortcut always hit first); the REACH
  //    feature made the map ADDRESS-keyed, so the shortcut could miss on a key that IS held, and
  //    the dead branch went live and wrong. one reduction, read twice, cannot drift apart again
  const askIsFullShaped = isKeyrackAskFullShaped({ ask: input.keyAsk });
  const candidateSlug = !input.keyAsk
    ? null
    : askIsFullShaped
      ? input.keyAsk
      : `@all.${input.env}.${input.keyAsk}`;

  // a full ask (slug or address) that the manifest holds yields THAT entry's own slug
  //
  // ⚠️ it returns the entry's `slug` FIELD, never the ask itself. this shortcut indexes an
  //    ADDRESS-keyed map, so an ask that names a full ADDRESS (`slug@reachExid`) hits here and
  //    would otherwise hand the ADDRESS back as a slug — the very address-as-slug defect the
  //    prefix path below repairs, left alive in its own function. a reachless entry has
  //    `slug === address`, so every extant ask is byte-identical
  //
  // .note = gated on `askIsFullShaped`, so a BARE-NAME ask still falls to the prefix filter. the
  //         shortcut is an address-keyed probe, and a bare name's candidate is a reachless SLUG —
  //         to probe it here would answer a differently-shaped ask through the address door
  const hostForFullAsk =
    askIsFullShaped && candidateSlug
      ? input.hostManifest.hosts[candidateSlug]
      : undefined;
  if (hostForFullAsk) return [hostForFullAsk.slug];

  // otherwise match the machine-wide `@all.{env}.` prefix in the host manifest
  //
  // .note = `getAllKeyrackSlugsHeld` is the ONE shared answer to "which keys does this rack
  //         hold", and it carries the address-vs-slug invariant this behavior repaired: `hosts`
  //         is keyed by ADDRESS, so the slug is read off each entry's own field and never off
  //         the map key. deduped there too — N reaches of one slug are ONE slug, and the caller
  //         re-applies the asked reach per slug via `getOneKeyrackHostForSlugAtReach`, so a
  //         reach must NEVER ride this return
  const prefix = `@all.${input.env}.`;
  const machineWideSlugs = getAllKeyrackSlugsHeld({
    hosts: input.hostManifest.hosts,
  }).filter((slug) => slug.startsWith(prefix));

  // a key ask narrows to the ONE candidate reduced at the top; absent, every machine-wide slug
  if (candidateSlug)
    return machineWideSlugs.filter((slug) => slug === candidateSlug);
  return machineWideSlugs;
};
