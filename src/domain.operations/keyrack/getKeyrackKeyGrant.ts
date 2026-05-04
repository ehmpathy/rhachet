import { UnexpectedCodePathError } from 'helpful-errors';

import {
  type KeyrackGrantAttempt,
  KeyrackKeyGrant,
} from '@src/domain.objects/keyrack';

import { asKeyrackKeyEnv } from './asKeyrackKeyEnv';
import { asKeyrackKeyName } from './asKeyrackKeyName';
import { asKeyrackKeyOrg } from './asKeyrackKeyOrg';
import { daemonAccessGet } from './daemon/sdk';
import { decideIsKeySlugEqual } from './decideIsKeySlugEqual';
import type { ContextKeyrackGrantGet } from './genContextKeyrackGrantGet';
import { inferKeyrackKeyStatusWhenNotGranted } from './inferKeyrackKeyStatusWhenNotGranted';

/**
 * .what = attempt to grant a single key from unlocked sources
 * .why = core logic for credential resolution via envvar and daemon only
 *
 * .note = resolution order: os.envvar (ci passthrough) -> os.daemon (session cache) -> locked
 * .note = never reads from vault — vault access is exclusively via unlock
 * .note = firewall validation applies uniformly to all granted keys, regardless of source
 * .note = allow.dangerous bypasses firewall validation (for known-dangerous credentials)
 */
const attemptGrantKey = async (
  input: { slug: string; allow?: { dangerous?: boolean } },
  context: ContextKeyrackGrantGet,
): Promise<KeyrackGrantAttempt> => {
  const { slug } = input;

  // extract env and org from slug (format: $org.$env.$key)
  const orgFromSlug = asKeyrackKeyOrg({ slug }) || 'unknown';
  const envFromSlug = asKeyrackKeyEnv({ slug }) || 'all';

  // attempt to locate the key from available sources (envvar, daemon)
  const grantFound = await (async (): Promise<KeyrackKeyGrant | null> => {
    // check os.envvar first — passthrough for ci and local env
    // .note = vault now handles mech inference + translation + grant construction
    if (!context.envvarAdapter.get) {
      throw new UnexpectedCodePathError('envvarAdapter.get is not defined', {
        hint: 'os.envvar adapter must implement get method',
      });
    }
    const envGrant = await context.envvarAdapter.get({ slug });
    if (envGrant !== null) {
      return envGrant;
    }

    // check os.daemon — session cache (in-memory daemon)
    // .note = daemon implements env=all fallback internally:
    //         if org.test.KEY not found, tries org.all.KEY
    const daemonResult = await daemonAccessGet({
      slugs: [slug],
      owner: context.owner,
    });
    if (daemonResult) {
      // find exact match or env=all fallback
      // .note = daemon returns key with its actual slug (e.g., org.all.KEY)
      //         when it falls back from org.test.KEY → org.all.KEY
      const keyEntry = daemonResult.keys.find((k) =>
        decideIsKeySlugEqual({ desired: slug, proposed: k.slug }),
      );
      if (keyEntry) {
        // preserve original vault from when key was unlocked
        // (e.g., os.direct, os.secure — not 'os.daemon')
        // .note = keyEntry.slug shows where key actually came from
        //         e.g., if fallback found env=all key, slug shows .all. for transparency
        return new KeyrackKeyGrant({
          slug: keyEntry.slug,
          key: keyEntry.key,
          source: keyEntry.source,
          env: keyEntry.env,
          org: keyEntry.org,
        });
      }
    }

    // not found in any source
    return null;
  })();

  // if no grant found — infer whether key is locked or absent
  if (!grantFound) {
    const status = await inferKeyrackKeyStatusWhenNotGranted({
      slug,
      owner: context.owner,
    });
    const ownerFlag = context.owner ? `--owner ${context.owner} ` : '';
    if (status === 'locked') {
      return {
        status: 'locked',
        slug,
        message: `credential '${slug}' is locked. unlock it first.`,
        fix: `rhx keyrack unlock ${ownerFlag}--env ${envFromSlug} --key ${asKeyrackKeyName({ slug })}`,
      };
    }
    return {
      status: 'absent',
      slug,
      message: `credential '${slug}' does not exist. set it first.`,
      fix: `rhx keyrack set ${ownerFlag}--key ${asKeyrackKeyName({ slug })} --env ${envFromSlug}`,
    };
  }

  // apply firewall validation uniformly to all granted keys (unless allow.dangerous)
  // .note = validates cached value, not source (daemon stores transformed secrets)
  if (!input.allow?.dangerous) {
    const mech = grantFound.source.mech;
    const mechAdapter = context.mechAdapters[mech];
    if (!mechAdapter)
      throw new UnexpectedCodePathError('mechanism adapter not found', {
        mech,
      });
    const validation = mechAdapter.validate({ cached: grantFound.key.secret });
    if (!validation.valid) {
      return {
        status: 'blocked',
        slug,
        reasons: validation.reasons ?? [
          'credential blocked by mechanism firewall',
        ],
        fix: `update the stored value to use a short-lived or properly-formatted credential`,
      };
    }
  }

  return { status: 'granted', grant: grantFound };
};

/**
 * .what = grant credentials from unlocked sources (envvar and daemon only)
 * .why = main entry point for credential resolution — never touches vault or manifest
 *
 * .note = uses all-or-none semantics for repo grants
 * .note = env filter scopes which keys are resolved
 * .note = allow.dangerous bypasses firewall validation (for known-dangerous credentials)
 */
export async function getKeyrackKeyGrant(
  input: {
    for: { repo: true };
    env?: string;
    slugs: string[];
    allow?: { dangerous?: boolean };
  },
  context: ContextKeyrackGrantGet,
): Promise<KeyrackGrantAttempt[]>;
export async function getKeyrackKeyGrant(
  input: { for: { key: string }; allow?: { dangerous?: boolean } },
  context: ContextKeyrackGrantGet,
): Promise<KeyrackGrantAttempt>;
export async function getKeyrackKeyGrant(
  input:
    | {
        for: { repo: true };
        env?: string;
        slugs: string[];
        allow?: { dangerous?: boolean };
      }
    | { for: { key: string }; allow?: { dangerous?: boolean } },
  context: ContextKeyrackGrantGet,
): Promise<KeyrackGrantAttempt | KeyrackGrantAttempt[]> {
  // handle single key grant
  if ('key' in input.for) {
    return attemptGrantKey(
      { slug: input.for.key, allow: input.allow },
      context,
    );
  }

  // handle repo grant — all slugs
  const { slugs, allow } = input as {
    slugs: string[];
    allow?: { dangerous?: boolean };
  };
  const attempts: KeyrackGrantAttempt[] = [];
  for (const slug of slugs) {
    const attempt = await attemptGrantKey({ slug, allow }, context);
    attempts.push(attempt);
  }

  return attempts;
}
