import type { KeyrackGrantMechanism } from '../../../../../../domain.objects/keyrack/KeyrackGrantMechanism';
import type { KeyrackHostVault } from '../../../../../../domain.objects/keyrack/KeyrackHostVault';
import type { KeyrackKey } from '../../../../../../domain.objects/keyrack/KeyrackKey';
import type { DaemonKeyStore } from '../domain.objects/daemonKeyStore';

/**
 * .what = handle GET command to retrieve grants by slug
 * .why = returns credentials from daemon memory if TTL is valid
 *
 * .note = org filter: only returns grants where grant.org matches requested org OR grant.org is '@all'
 * .note = env filter: only returns grants where grant.env matches requested env
 */
export const handleGetCommand = (
  input: {
    slugs: string[];
    org?: string;
    env?: string;
  },
  context: {
    keyStore: DaemonKeyStore;
  },
): {
  keys: Array<{
    slug: string;
    key: KeyrackKey;
    source: {
      vault: KeyrackHostVault;
      mech: KeyrackGrantMechanism;
    };
    env: string;
    org: string;
    expiresAt: number;
  }>;
} => {
  const keys: Array<{
    slug: string;
    key: KeyrackKey;
    source: {
      vault: KeyrackHostVault;
      mech: KeyrackGrantMechanism;
    };
    env: string;
    org: string;
    expiresAt: number;
  }> = [];

  for (const slug of input.slugs) {
    const cachedGrant = context.keyStore.get({ slug });
    if (!cachedGrant) continue;

    // filter by org: only return if grant.org matches request OR grant.org is '@all'
    if (
      input.org &&
      cachedGrant.org !== input.org &&
      cachedGrant.org !== '@all'
    )
      continue;

    // filter by env: only return if grant.env matches request
    if (input.env && cachedGrant.env !== input.env) continue;

    keys.push({
      slug: cachedGrant.slug,
      key: cachedGrant.key,
      source: cachedGrant.source,
      env: cachedGrant.env,
      org: cachedGrant.org,
      expiresAt: cachedGrant.expiresAt,
    });
  }

  return { keys };
};
