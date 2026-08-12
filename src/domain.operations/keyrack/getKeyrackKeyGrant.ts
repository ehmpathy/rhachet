import { MalfunctionError } from 'helpful-errors';

import {
  type KeyrackGrantAttempt,
  KeyrackKeyGrant,
  type KeyrackKeyReach,
} from '@src/domain.objects/keyrack';
import { asKeyrackKeyReachExid } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachExid';
import { asKeyrackKeyReachField } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachField';

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
 * .note = resolution order: os.daemon (explicit unlock) -> os.envvar (ci fallback) -> locked
 * .note = never reads from vault — vault access is exclusively via unlock
 * .note = firewall validation applies uniformly to all granted keys, regardless of source
 * .note = allow.dangerous bypasses firewall validation (for known-dangerous credentials)
 * .note = a reach names the reach asked for. it is carried, never dropped, at every
 *         source — an ask for one reach that were answered by another's credential is
 *         the wrong-reach failure this design forbids
 */
const attemptGrantKey = async (
  input: {
    slug: string;
    reach?: KeyrackKeyReach;
    allow?: { dangerous?: boolean };
  },
  context: ContextKeyrackGrantGet,
): Promise<KeyrackGrantAttempt> => {
  const { slug, reach } = input;

  // extract env and org from slug (format: $org.$env.$key)
  const orgFromSlug = asKeyrackKeyOrg({ slug }) || 'unknown';
  const envFromSlug = asKeyrackKeyEnv({ slug }) || 'all';

  // attempt to locate the key from available sources (daemon, envvar)
  const grantFound = await (async (): Promise<KeyrackKeyGrant | null> => {
    // check os.daemon first — explicit unlock takes precedence
    // .note = daemon implements env=all fallback internally:
    //         if org.test.KEY not found, tries org.all.KEY
    const daemonResult = await daemonAccessGet({
      slugs: [slug],
      reach,
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
          ...asKeyrackKeyReachField({ reach: keyEntry.reach }),
          source: keyEntry.source,
          env: keyEntry.env,
          org: keyEntry.org,
        });
      }
    }

    // check os.envvar second — fallback for ci and ambient env
    // .note = vault now handles mech inference + translation + grant construction
    // .note = a reach-ask has NO source to consult here. an env var name is flat — it drops
    //         the org, the env, and the reach alike — so this vault structurally cannot hold
    //         a key cut for one reach. that makes it an ABSENT SOURCE for a reach-ask,
    //         which this chain reports by fall-through, exactly as it reports an unset
    //         variable. q9/e20's guarantee is kept, and kept more strictly than by a throw:
    //         the reachless variable is never even READ, so no wrong-reach credential
    //         can be handed back. the fall-through lands on the reach-aware absent/locked
    //         report below, which names the fix a human can actually act on (e6)
    // .note = the vault keeps its OWN refusal for a direct ask, so a caller who reaches for
    //         `vaultAdapterOsEnvvar.get({ reach })` still meets the named ConstraintError.
    //         that guard is the vault honest about its boundary; this operation is a
    //         multi-source probe, and it owes its caller a `status`, never a throw, when a
    //         key is simply not here. different question, different answer
    if (!context.envvarAdapter.get) {
      throw new MalfunctionError('envvarAdapter.get is not defined', {
        hint: 'os.envvar adapter must implement get method',
      });
    }
    const envGrant = reach ? null : await context.envvarAdapter.get({ slug });
    if (envGrant !== null) {
      return envGrant;
    }

    // not found in any source
    return null;
  })();

  // if no grant found — infer whether key is locked or absent
  // .note = a reach-ask that finds no key is an ABSENT KEY, never a cue to try the
  //         reachless one. so the fix the human is handed must carry the reach through,
  //         or it would walk them into a key at the wrong reach (e6)
  if (!grantFound) {
    const status = await inferKeyrackKeyStatusWhenNotGranted({
      slug,
      reach,
      owner: context.owner,
    });
    const ownerFlag = context.owner ? `--owner ${context.owner} ` : '';
    const reachFlag = reach
      ? ` --reach ${asKeyrackKeyReachExid({ reach })}`
      : '';
    const atReach = reach
      ? ` at reach '${asKeyrackKeyReachExid({ reach })}'`
      : '';
    // .note = the reach rides onto the attempt itself, not the message alone. a prose mention
    //         tells a HUMAN which reach failed; the field tells a COLLECTION, and a repo
    //         sweep that enumerates reaches keys its merge by (slug, reach). without it
    //         two locked reaches of one slug are one map entry, and the survivor's status
    //         is reported for both — a wrong answer produced by an address, not by a lookup
    if (status === 'locked') {
      return {
        status: 'locked',
        slug,
        ...asKeyrackKeyReachField({ reach }),
        message: `credential '${slug}'${atReach} is locked. unlock it first.`,
        fix: `rhx keyrack unlock ${ownerFlag}--env ${envFromSlug} --key ${asKeyrackKeyName({ slug })}${reachFlag}`,
      };
    }
    return {
      status: 'absent',
      slug,
      ...asKeyrackKeyReachField({ reach }),
      message: reach
        ? `no key is set for '${slug}'${atReach}. a reach is never derived — a key must be cut at the reach you ask for.`
        : `credential '${slug}' does not exist. set it first.`,
      fix: `rhx keyrack set ${ownerFlag}--key ${asKeyrackKeyName({ slug })} --env ${envFromSlug}${reachFlag}`,
    };
  }

  // apply firewall validation uniformly to all granted keys (unless allow.dangerous)
  // .note = validates cached value, not source (daemon stores transformed secrets)
  if (!input.allow?.dangerous) {
    const mech = grantFound.source.mech;
    const mechAdapter = context.mechAdapters[mech];
    if (!mechAdapter)
      throw new MalfunctionError('mechanism adapter not found', {
        mech,
      });
    const validation = mechAdapter.validate({ cached: grantFound.key.secret });
    if (!validation.valid) {
      return {
        status: 'blocked',
        slug,
        ...asKeyrackKeyReachField({ reach }),
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
  input: {
    for: { key: string };

    /**
     * .what = the reach asked for; absent means the reachless key
     * .why = OPTIONAL, not nullable — a deliberate exception to
     *        `rule.forbid.undefined-inputs`. `reach` rides into `KeyrackKeyGrant` and onto
     *        the daemon wire, where e16 requires `JSON.stringify` DROP it when absent.
     *        `null` survives serialization; `undefined` does not
     * .note = the drop hazard that rule guards is covered structurally instead: a reach-ask
     *         that finds no key THROWS (e6), never falls back to the reachless one
     */
    reach?: KeyrackKeyReach;

    allow?: { dangerous?: boolean };
  },
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
    | {
        for: { key: string };
        reach?: KeyrackKeyReach;
        allow?: { dangerous?: boolean };
      },
  context: ContextKeyrackGrantGet,
): Promise<KeyrackGrantAttempt | KeyrackGrantAttempt[]> {
  // handle single key grant
  // .note = only the single-key form takes a reach. a repo grant sweeps whatever the repo
  //         declares, so it has no one reach to name — the same asymmetry that makes
  //         `unlock --reach` require `--key` (q2)
  if ('key' in input.for) {
    const { reach } = input as { reach?: KeyrackKeyReach };
    return attemptGrantKey(
      { slug: input.for.key, reach, allow: input.allow },
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
