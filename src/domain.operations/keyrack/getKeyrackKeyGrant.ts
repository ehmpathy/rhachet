import { UnexpectedCodePathError } from 'helpful-errors';

import {
  type KeyrackGrantAttempt,
  type KeyrackGrantMechanism,
  type KeyrackHostVault,
  type KeyrackKey,
  KeyrackKeyGrant,
} from '../../domain.objects/keyrack';
import { daemonAccessGet } from './daemon/sdk';
import type { ContextKeyrackGrantGet } from './genContextKeyrackGrantGet';

/**
 * .what = construct KeyrackKey from secret and source info
 * .why = bundles secret with grade inferred from vault and mechanism
 *
 * .note = placeholder grade logic — real inference in Phase B (grades/)
 * .note = vault determines protection, mechanism determines duration
 */
const toKeyrackKey = (input: {
  secret: string;
  vault: KeyrackHostVault;
  mech: KeyrackGrantMechanism;
}): KeyrackKey => {
  // infer protection from vault
  const protection = (() => {
    if (input.vault === 'os.envvar') return 'plaintext' as const;
    if (input.vault === 'os.direct') return 'plaintext' as const;
    if (input.vault === 'os.secure') return 'encrypted' as const;
    if (input.vault === 'os.daemon') return 'encrypted' as const;
    if (input.vault === '1password') return 'encrypted' as const;
    return 'plaintext' as const; // fallback
  })();

  // infer duration from mechanism
  const duration = (() => {
    if (input.mech === 'PERMANENT_VIA_REPLICA') return 'permanent' as const;
    if (input.mech === 'EPHEMERAL_VIA_GITHUB_APP') return 'ephemeral' as const;
    if (input.mech === 'EPHEMERAL_VIA_AWS_SSO') return 'ephemeral' as const;
    if (input.mech === 'EPHEMERAL_VIA_GITHUB_OIDC') return 'ephemeral' as const;
    // deprecated aliases
    if (input.mech === 'REPLICA') return 'permanent' as const;
    if (input.mech === 'GITHUB_APP') return 'ephemeral' as const;
    if (input.mech === 'AWS_SSO') return 'ephemeral' as const;
    return 'permanent' as const; // fallback
  })();

  return {
    secret: input.secret,
    grade: { protection, duration },
  };
};

/**
 * .what = attempt to grant a single key from unlocked sources
 * .why = core logic for credential resolution via envvar and daemon only
 *
 * .note = resolution order: os.envvar (ci passthrough) -> os.daemon (session cache) -> locked
 * .note = never reads from vault — vault access is exclusively via unlock
 */
const attemptGrantKey = async (
  input: { slug: string },
  context: ContextKeyrackGrantGet,
): Promise<KeyrackGrantAttempt> => {
  const { slug } = input;

  // extract env from slug (format: $org.$env.$key)
  const envFromSlug = slug.split('.')[1] ?? 'all';

  // check os.envvar first — passthrough for ci and local env
  const envValue = await context.envvarAdapter.get({ slug });
  if (envValue !== null) {
    // value found in env — resolve mech for validation
    const mech: KeyrackGrantMechanism = 'PERMANENT_VIA_REPLICA';
    const mechAdapter = context.mechAdapters[mech];
    if (!mechAdapter) {
      throw new UnexpectedCodePathError('mechanism adapter not found', {
        mech,
      });
    }

    // apply mechanism validation (this is the firewall)
    const validation = mechAdapter.validate({ source: envValue });
    if (!validation.valid) {
      return {
        status: 'blocked',
        slug,
        message:
          validation.reason ?? 'credential blocked by mechanism firewall',
        fix: `update env var to use a short-lived or properly-formatted value`,
      };
    }

    // translate value via mechanism
    const translated = await mechAdapter.translate({ value: envValue });

    // extract org from slug (format: $org.$env.$key)
    const orgFromSlug = slug.split('.')[0] ?? 'unknown';

    // construct grant from os.envvar
    const grant = new KeyrackKeyGrant({
      slug,
      key: toKeyrackKey({
        secret: translated.value,
        vault: 'os.envvar',
        mech,
      }),
      source: {
        vault: 'os.envvar',
        mech,
      },
      env: envFromSlug,
      org: orgFromSlug,
    });

    return { status: 'granted', grant };
  }

  // check os.daemon — session cache (in-memory daemon)
  const daemonResult = await daemonAccessGet({ slugs: [slug] });
  if (daemonResult) {
    const keyEntry = daemonResult.keys.find((k) => k.slug === slug);
    if (keyEntry) {
      // key found in daemon with valid TTL — use directly
      const grant = new KeyrackKeyGrant({
        slug,
        key: keyEntry.key,
        source: {
          vault: 'os.daemon',
          mech: keyEntry.source.mech,
        },
        env: keyEntry.env,
        org: keyEntry.org,
      });

      return { status: 'granted', grant };
    }
  }

  // not in envvar, not in daemon — return locked
  return {
    status: 'locked',
    slug,
    message: `credential '${slug}' is locked. unlock it first.`,
    fix: `run: rhx keyrack unlock --env ${envFromSlug} --key ${slug}`,
  };
};

/**
 * .what = grant credentials from unlocked sources (envvar and daemon only)
 * .why = main entry point for credential resolution — never touches vault or manifest
 *
 * .note = uses all-or-none semantics for repo grants
 * .note = env filter scopes which keys are resolved
 */
export async function getKeyrackKeyGrant(
  input: { for: { repo: true }; env?: string; slugs: string[] },
  context: ContextKeyrackGrantGet,
): Promise<KeyrackGrantAttempt[]>;
export async function getKeyrackKeyGrant(
  input: { for: { key: string } },
  context: ContextKeyrackGrantGet,
): Promise<KeyrackGrantAttempt>;
export async function getKeyrackKeyGrant(
  input:
    | { for: { repo: true }; env?: string; slugs: string[] }
    | { for: { key: string } },
  context: ContextKeyrackGrantGet,
): Promise<KeyrackGrantAttempt | KeyrackGrantAttempt[]> {
  // handle single key grant
  if ('key' in input.for) {
    return attemptGrantKey({ slug: input.for.key }, context);
  }

  // handle repo grant — resolve all slugs
  const { slugs } = input as { slugs: string[] };
  const attempts: KeyrackGrantAttempt[] = [];
  for (const slug of slugs) {
    const attempt = await attemptGrantKey({ slug }, context);
    attempts.push(attempt);
  }

  return attempts;
}
