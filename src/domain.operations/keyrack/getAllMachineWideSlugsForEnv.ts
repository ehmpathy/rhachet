import type { KeyrackHostManifest } from '@src/domain.objects/keyrack/KeyrackHostManifest';
import type { KeyrackKeyAsk } from '@src/domain.objects/keyrack/KeyrackKeyAsk';

/**
 * .what = expand an env (and optional key ask) to the matched machine-wide `@all` slugs held in
 *   the host manifest
 * .why = an `@all` key is MACHINE-WIDE (the box's own namespace), so it must be unlockable with NO
 *   repo manifest at all — the bootstrap-to-clone credential path: the github-app install token is
 *   vaulted under `@all` precisely so it can be fetched from anywhere, even outside any repo,
 *   before any repo is cloned. this mirrors `getAllSudoSlugsForKeyAsk` (the sudo no-manifest path)
 *   but spans the normal envs (test/prep/prod), matched on the reserved `@all` org segment
 *
 * .note = if a full slug is provided (org.env.key format) and it exists, uses it directly
 * .note = if a key name only, matches `@all.{env}.{keyAsk}`
 * .note = if no key ask, matches EVERY `@all.{env}.*` key in the host manifest for that env
 */
export const getAllMachineWideSlugsForEnv = (input: {
  env: string;
  keyAsk: KeyrackKeyAsk | null;
  hostManifest: KeyrackHostManifest;
}): string[] => {
  // a full slug passed directly (and present) is used as-is
  if (
    input.keyAsk &&
    input.keyAsk.includes('.') &&
    input.hostManifest.hosts[input.keyAsk]
  )
    return [input.keyAsk];

  // otherwise match the machine-wide `@all.{env}.` prefix in the host manifest
  const prefix = `@all.${input.env}.`;
  const machineWideSlugs = Object.keys(input.hostManifest.hosts).filter(
    (slug) => slug.startsWith(prefix),
  );

  // a key name filters to the single `@all.{env}.{keyAsk}` slug; absent, all machine-wide slugs
  if (input.keyAsk)
    return machineWideSlugs.filter(
      (slug) => slug === `@all.${input.env}.${input.keyAsk}`,
    );
  return machineWideSlugs;
};
