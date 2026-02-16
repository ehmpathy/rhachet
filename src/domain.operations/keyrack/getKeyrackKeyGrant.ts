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
 * .note = resolution order: os.envvar (ci passthrough) → os.daemon (session cache) → host manifest vault
 * .note = --unlock triggers vault unlock and stores result in daemon with TTL
 */
const attemptGrantKey = async (
  input: { slug: string; unlock?: boolean },
  context: KeyrackGrantContext,
): Promise<KeyrackGrantAttempt> => {
  const { slug } = input;

  // extract env from slug (format: $org.$env.$key)
  const envFromSlug = slug.split('.')[1] ?? 'all';
  const isSudoKey = envFromSlug === 'sudo';

  // check os.envvar first — passthrough for ci and local env
  // note: envvar check needs mech for validation, but we can infer from slug or use default
  const envValue = await context.vaultAdapters['os.envvar'].get({ slug });
  if (envValue !== null) {
    // value found in env — resolve mech for validation
    const keySpec = isSudoKey ? null : context.repoManifest?.keys[slug];
    const keyHost = context.hostManifest.hosts[slug];
    const mech = keySpec?.mech ?? keyHost?.mech ?? 'PERMANENT_VIA_REPLICA';
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

  // check os.daemon second — session cache (in-memory daemon)
  // note: daemon check happens BEFORE host manifest check
  // this allows cached keys to work even when manifest decryption fails
  const daemonResult = await daemonAccessGet({ slugs: [slug] });
  if (daemonResult) {
    const keyEntry = daemonResult.keys.find((k) => k.slug === slug);
    if (keyEntry) {
      // key found in daemon with valid TTL — use directly
      // note: already translated when stored, grade already attached
      // note: daemon stores env, org, and original source with the key (from unlockKeyrack)
      // note: source.vault is set to 'os.daemon' to indicate where the grant came FROM for this request
      //       (the original vault is preserved in daemon storage for audit, but not exposed here)
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

  // daemon miss — now check repo manifest and host manifest
  // note: manifest checks happen AFTER daemon check so cached keys work without decryption

  // find key spec in repo manifest (not for sudo keys — they're host-only)
  const keySpec = isSudoKey ? null : context.repoManifest?.keys[slug];
  if (!isSudoKey && !keySpec) {
    return {
      status: 'absent',
      slug,
      message: `key '${slug}' not found in repo manifest`,
      fix: `add '${slug}' to .agent/keyrack.yml`,
    };
  }

  // for sudo keys: lookup host manifest to get mech
  const keyHostForMech = isSudoKey ? context.hostManifest.hosts[slug] : null;
  if (isSudoKey && !keyHostForMech) {
    return {
      status: 'locked',
      slug,
      message: `sudo key '${slug}' not in daemon cache and host manifest is locked`,
      fix: `run: rhx keyrack unlock --env sudo --key ${slug}`,
    };
  }

  // get mechanism from keySpec (regular) or keyHost (sudo)
  const mech = keySpec?.mech ?? keyHostForMech?.mech;
  if (!mech) {
    throw new UnexpectedCodePathError('no mechanism found for key', { slug });
  }

  // get mechanism adapter (needed for host manifest vault path)
  const mechAdapter = context.mechAdapters[mech];
  if (!mechAdapter) {
    throw new UnexpectedCodePathError('mechanism adapter not found', {
      mech,
    });
  }

  // fall through to host manifest vault (requires unlock)

  // find key host in host manifest (note: for sudo keys, already checked above via keyHostForMech)
  const keyHost = isSudoKey ? keyHostForMech : context.hostManifest.hosts[slug];
  if (!keyHost) {
    const keyName = asKeyrackKeyName({ slug });
    const env = asKeyrackKeyEnv({ slug });
    return {
      status: 'absent',
      slug,
      message: `key '${slug}' not configured on this host`,
      fix: `run: rhx keyrack set --key ${slug} --mech ${mech} --vault <vault>`,
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
      fix: `store credential via: rhx keyrack set --key ${slug} --mech ${mech} --vault ${keyHost.vault}`,
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
      mech,
    }),
    source: {
      vault: keyHost.vault,
      mech,
    },
    env: keyHost.env,
    org: keyHost.org,
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
