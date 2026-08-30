import { ConstraintError } from 'helpful-errors';

import {
  KeyrackHostManifest,
  KeyrackKeyHost,
  KeyrackKeyRecipient,
} from '@src/domain.objects/keyrack';

/**
 * .what = generates a mock KeyrackHostManifest for tests
 * .why = provides reusable fixture with sensible defaults
 */
export const genMockKeyrackHostManifest = (input?: {
  uri?: string;
  owner?: string | null;
  recipients?: KeyrackKeyRecipient[];
  hosts?: Record<string, Partial<KeyrackKeyHost>>;
}): KeyrackHostManifest => {
  const hosts: Record<string, KeyrackKeyHost> = {};

  // populate hosts from input
  //
  // .note = the map key is an ADDRESS (`slug`, or `slug@reachExid` for a key cut at a reach), so
  //         it DEFAULTS the `slug` field and never overrides it. a caller that passes an explicit
  //         `slug` declares the two DIFFER — that gap is the whole subject of a reach fixture, and
  //         a generator that flattened it would make the case impossible to express
  for (const [address, partialHost] of Object.entries(input?.hosts ?? {})) {
    // ⚠️ an address that carries a reach must be given its `slug` explicitly — the default would
    //    file the ADDRESS as the slug, which is the exact write-only defect this asset exists to
    //    clamp. prod cannot reach that state (the dao's schema + `assertKeyrackHostAddressed`
    //    refuse it at load), but a fixture bypasses both gates, so it fails loud here instead
    //
    // .note = the probe is `indexOf('@', 1)`, never `includes('@')` — a machine-wide slug legally
    //         OPENS with `@all`, so only an `@` past index 0 marks a reach suffix
    //
    // .note = ConstraintError, never its `UnexpectedCodePathError` parent. the two parents name
    //         no owner and so decide neither exit code nor remedy, which
    //         `rule.forbid.helpful-error-parents` forbids outright. the rule's own test — "who
    //         fixes this?" — answers CALLER here: a fixture author declares the `slug`
    if (address.indexOf('@', 1) !== -1 && !partialHost.slug)
      throw new ConstraintError(
        'a reach-cut address needs its `slug` declared — the default would file the address as the slug',
        {
          address,
          hint: `pass slug: '${address.slice(0, address.indexOf('@', 1))}'`,
        },
      );

    hosts[address] = new KeyrackKeyHost({
      slug: partialHost.slug ?? address,
      mech: partialHost.mech ?? 'PERMANENT_VIA_REPLICA',
      vault: partialHost.vault ?? 'os.direct',
      exid: partialHost.exid ?? null,
      env: partialHost.env ?? 'all',
      org: partialHost.org ?? 'testorg',
      // .note = OPTIONAL, never nullable — an absent reach must stay ABSENT rather than land as
      //         `undefined` on the object, so a spread carries it only when the caller supplied one
      ...(partialHost.reach ? { reach: partialHost.reach } : {}),
      meta: partialHost.meta ?? null,
      maxDuration: partialHost.maxDuration ?? null,
      createdAt: partialHost.createdAt ?? new Date().toISOString(),
      updatedAt: partialHost.updatedAt ?? new Date().toISOString(),
    });
  }

  return new KeyrackHostManifest({
    uri: input?.uri ?? 'file://~/.rhachet/keyrack/keyrack.host.age',
    owner: input?.owner ?? null,
    recipients: input?.recipients ?? [],
    hosts,
  });
};
