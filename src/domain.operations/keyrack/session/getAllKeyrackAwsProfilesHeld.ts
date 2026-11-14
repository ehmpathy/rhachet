import {
  daemonAccessGet,
  daemonAccessStatus,
} from '@src/domain.operations/keyrack/daemon/sdk';

/**
 * .what = the aws profile each held aws.config key points at, for the keys a relock will name
 * .why = keyrack caches each profile's aws export on disk; a relock must drop the exports of the
 *   keys it purges, and only the held grant knows which profile a key points at (an aws.config
 *   grant's secret is the profile name)
 * .note = read before the purge, since the purge forgets the grant
 * .note = the keys a relock names: the asked slugs, else every held key of the env, else all
 * .note = a daemon that is not reachable holds no grant, so it yields none
 */
export const getAllKeyrackAwsProfilesHeld = async (input: {
  socketPath: string;
  slugs: string[] | null;
  env: string | null;
}): Promise<{ slug: string; profile: string }[]> => {
  // the slugs the relock will name
  const slugsNamed =
    input.slugs ??
    ((await daemonAccessStatus({ socketPath: input.socketPath }))?.keys ?? [])
      .filter((row) => !input.env || row.env === input.env)
      .map((row) => row.slug);
  if (!slugsNamed.length) return [];

  // the held grants of those slugs; only aws.config grants point at a profile
  const got = await daemonAccessGet({
    socketPath: input.socketPath,
    slugs: [...new Set(slugsNamed)],
  });
  return (got?.keys ?? [])
    .filter((row) => row.source.vault === 'aws.config')
    .map((row) => ({ slug: row.slug, profile: String(row.key.secret) }));
};
