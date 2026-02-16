import { UnexpectedCodePathError } from 'helpful-errors';

import {
  type KeyrackGrantAttempt,
  type KeyrackGrantMechanism,
  type KeyrackHostVault,
  type KeyrackKey,
  KeyrackKeyGrant,
} from '../../domain.objects/keyrack';
import { asKeyrackKeyEnv } from './asKeyrackKeyEnv';
import { asKeyrackKeyName } from './asKeyrackKeyName';
import { assertKeyrackEnvIsSpecified } from './assertKeyrackEnvIsSpecified';
import { daemonAccessGet } from './daemon/sdk';
import type { KeyrackGrantContext } from './genKeyrackGrantContext';
import { getAllKeyrackSlugsForEnv } from './getAllKeyrackSlugsForEnv';

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
 * .what = attempt to grant a single key
 * .why = core logic for credential resolution
 *
 * .note = os.envvar is always checked first (ci passthrough)
 * .note = os.direct is checked second (ephemeral cache)
 * .note = --unlock triggers vault unlock and caches result to os.direct if ephemeral
 */
const attemptGrantKey = async (
  input: { slug: string; unlock?: boolean },
  context: KeyrackGrantContext,
): Promise<KeyrackGrantAttempt> => {
  const { slug } = input;

  // find key spec in repo manifest
  const keySpec = context.repoManifest?.keys[slug];
  if (!keySpec) {
    const keyName = asKeyrackKeyName({ slug });
    const env = asKeyrackKeyEnv({ slug });
    return {
      status: 'absent',
      slug,
      message: `key '${slug}' not found in repo manifest`,
      fix: `add '${keyName}' to env.${env} in .agent/keyrack.yml`,
    };
  }

  // get mechanism adapter (needed for both os.envvar and host manifest paths)
  const mechAdapter = context.mechAdapters[keySpec.mech];
  if (!mechAdapter) {
    throw new UnexpectedCodePathError('mechanism adapter not found', {
      mech: keySpec.mech,
    });
  }

  // check os.envvar first — passthrough for ci and local env
  const envValue = await context.vaultAdapters['os.envvar'].get({ slug });
  if (envValue !== null) {
    // value found in env — skip host manifest, skip vault unlock
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

    // construct grant from os.envvar
    const grant = new KeyrackKeyGrant({
      slug,
      key: toKeyrackKey({
        secret: translated.value,
        vault: 'os.envvar',
        mech: keySpec.mech,
      }),
      source: {
        vault: 'os.envvar',
        mech: keySpec.mech,
      },
    });

    return { status: 'granted', grant };
  }

  // check os.daemon second — session cache (in-memory daemon)
  const daemonResult = await daemonAccessGet({ slugs: [slug] });
  if (daemonResult) {
    const keyEntry = daemonResult.keys.find((k) => k.slug === slug);
    if (keyEntry) {
      // key found in daemon with valid TTL — use directly
      // note: already translated when stored, grade already attached
      // look up original vault from host manifest to report accurate source
      const keyHost = context.hostManifest.hosts[slug];
      const sourceVault = keyHost?.vault ?? 'os.daemon';

      const grant = new KeyrackKeyGrant({
        slug,
        key: keyEntry.key,
        source: {
          vault: sourceVault,
          mech: keySpec.mech,
        },
      });

      return { status: 'granted', grant };
    }
  }

  // check os.direct third — backwards compat for cached ephemeral values
  // deprecated: will be removed once os.daemon is fully adopted
  const directValue = await context.vaultAdapters['os.direct'].get({ slug });
  if (directValue !== null) {
    // validate cached value against mechanism (defense in depth)
    const validation = mechAdapter.validate({ cached: directValue });
    if (!validation.valid) {
      return {
        status: 'blocked',
        slug,
        message:
          validation.reason ??
          'cached credential blocked by mechanism firewall',
        fix: `update cached credential or run: rhx keyrack unlock`,
      };
    }

    // construct grant from cached ephemeral (already translated, use directly)
    const grant = new KeyrackKeyGrant({
      slug,
      key: toKeyrackKey({
        secret: directValue,
        vault: 'os.direct',
        mech: keySpec.mech,
      }),
      source: {
        vault: 'os.direct',
        mech: keySpec.mech,
      },
    });

    return { status: 'granted', grant };
  }

  // fall through to host manifest vault (requires unlock)

  // find key host in host manifest
  const keyHost = context.hostManifest.hosts[slug];
  if (!keyHost) {
    const keyName = asKeyrackKeyName({ slug });
    const env = asKeyrackKeyEnv({ slug });
    return {
      status: 'absent',
      slug,
      message: `key '${slug}' not configured on this host`,
      fix: `run: rhx keyrack set --key ${keyName} --env ${env} --mech ${keySpec.mech} --vault <vault>`,
    };
  }

  // get vault adapter
  const vaultAdapter = context.vaultAdapters[keyHost.vault];
  if (!vaultAdapter) {
    throw new UnexpectedCodePathError('vault adapter not found', {
      vault: keyHost.vault,
    });
  }

  // check if vault is unlocked
  const isUnlocked = await vaultAdapter.isUnlocked();
  if (!isUnlocked) {
    // if --unlock was not specified, return locked status
    if (!input.unlock) {
      const keyName = asKeyrackKeyName({ slug });
      const env = asKeyrackKeyEnv({ slug });
      return {
        status: 'locked',
        slug,
        message: `vault '${keyHost.vault}' is locked`,
        fix: `run: rhx keyrack get --key ${keyName} --env ${env} --unlock`,
      };
    }

    // --unlock specified: trigger vault unlock
    await vaultAdapter.unlock({});
  }

  // retrieve raw value from vault
  const rawValue = await vaultAdapter.get({ exid: keyHost.exid, slug });
  if (rawValue === null) {
    const keyName = asKeyrackKeyName({ slug });
    const env = asKeyrackKeyEnv({ slug });
    return {
      status: 'absent',
      slug,
      message: `credential not found in vault '${keyHost.vault}'`,
      fix: `store credential via: rhx keyrack set --key ${keyName} --env ${env} --mech ${keySpec.mech} --vault ${keyHost.vault}`,
    };
  }

  // validate source value against mechanism
  const validation = mechAdapter.validate({ source: rawValue });
  if (!validation.valid) {
    return {
      status: 'blocked',
      slug,
      message: validation.reason ?? 'credential blocked by mechanism firewall',
      fix: `update stored credential to use a short-lived or properly-formatted value`,
    };
  }

  // translate value via mechanism
  const translated = await mechAdapter.translate({ value: rawValue });

  // construct grant
  const grant = new KeyrackKeyGrant({
    slug,
    key: toKeyrackKey({
      secret: translated.value,
      vault: keyHost.vault,
      mech: keySpec.mech,
    }),
    source: {
      vault: keyHost.vault,
      mech: keySpec.mech,
    },
  });

  return { status: 'granted', grant };
};

/**
 * .what = grant credentials for repo or specific key
 * .why = main entry point for credential resolution
 *
 * .note = uses all-or-none semantics for repo grants
 * .note = env filter scopes which keys are resolved
 */
export async function getKeyrackKeyGrant(
  input: { for: { repo: true }; env?: string },
  context: KeyrackGrantContext,
): Promise<KeyrackGrantAttempt[]>;
export async function getKeyrackKeyGrant(
  input: { for: { key: string } },
  context: KeyrackGrantContext,
): Promise<KeyrackGrantAttempt>;
export async function getKeyrackKeyGrant(
  input: { for: { repo: true }; env?: string } | { for: { key: string } },
  context: KeyrackGrantContext,
): Promise<KeyrackGrantAttempt | KeyrackGrantAttempt[]> {
  // handle single key grant
  if ('key' in input.for) {
    return attemptGrantKey({ slug: input.for.key }, context);
  }

  // handle repo grant — all-or-none semantics
  if (!context.repoManifest) {
    throw new UnexpectedCodePathError(
      'repo grant requires repo manifest; none found',
      { gitroot: 'unknown' },
    );
  }

  // resolve env and filter slugs
  const env = assertKeyrackEnvIsSpecified({
    manifest: context.repoManifest,
    env: ('env' in input ? input.env : null) ?? null,
  });
  const slugs = getAllKeyrackSlugsForEnv({
    manifest: context.repoManifest,
    env,
  });
  const attempts: KeyrackGrantAttempt[] = [];

  for (const slug of slugs) {
    const attempt = await attemptGrantKey({ slug }, context);
    attempts.push(attempt);
  }

  return attempts;
}
