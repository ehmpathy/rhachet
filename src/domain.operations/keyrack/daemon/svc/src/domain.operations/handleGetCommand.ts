import type { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';
import type { KeyrackKeyReach } from '@src/domain.objects/keyrack/KeyrackKeyReach';
import type { DaemonKeyStore } from '@src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonKeyStore';

/**
 * .what = handle GET command to retrieve grants by slug
 * .why = returns credentials from daemon memory if TTL is valid
 *
 * .note = org filter: only returns grants where grant.org matches requested org OR grant.org is '@all'
 * .note = env filter: only returns grants where grant.env matches requested env OR grant.env is 'all'
 * .note = keyStore.get() implements env=all fallback: org.test.KEY → org.all.KEY
 * .note = reach is NOT a filter — it is part of the address the store is asked for. org and
 *         env filter grants the store already found; reach decides WHICH grant it finds.
 *         that difference is the design: org is provenance (authorized FROM), which a
 *         wildcard may widen; reach is destination (authorized INTO), which none may widen
 */
export const handleGetCommand = (
  input: {
    slugs: string[];
    org?: string;
    env?: string;
    reach?: KeyrackKeyReach;
  },
  context: {
    keyStore: DaemonKeyStore;
  },
): {
  keys: KeyrackKeyGrant[];
} => {
  const keys: KeyrackKeyGrant[] = [];

  for (const slug of input.slugs) {
    const cachedGrant = context.keyStore.get({ slug, reach: input.reach });
    if (!cachedGrant) continue;

    // filter by org: only return if grant.org matches request OR grant.org is '@all'
    if (
      input.org &&
      cachedGrant.org !== input.org &&
      cachedGrant.org !== '@all'
    )
      continue;

    // filter by env: only return if grant.env matches request OR grant.env is 'all'
    // .note = env=all grants satisfy any specific env request
    if (input.env && cachedGrant.env !== input.env && cachedGrant.env !== 'all')
      continue;

    keys.push(cachedGrant);
  }

  return { keys };
};
