import { UnexpectedCodePathError } from 'helpful-errors';

import type { KeyrackKey } from '../../../domain.objects/keyrack/KeyrackKey';
import { assertKeyrackEnvIsSpecified } from '../assertKeyrackEnvIsSpecified';
import { daemonAccessUnlock, findsertKeyrackDaemon } from '../daemon/sdk';
import type { KeyrackGrantContext } from '../genKeyrackGrantContext';
import { getAllKeyrackSlugsForEnv } from '../getAllKeyrackSlugsForEnv';
import { inferKeyGrade } from '../grades/inferKeyGrade';

/**
 * .what = unlock keyrack keys and send them to daemon memory
 * .why = caches credentials in daemon after interactive auth; tools can then access them
 *
 * .note = interactive auth prompts occur per source vault
 * .note = keys are stored by slug, reusable across worksites
 */
export const unlockKeyrack = async (
  input: {
    env?: string;
    duration?: string;
    passphrase?: string;
  },
  context: KeyrackGrantContext,
): Promise<{
  unlocked: Array<{
    slug: string;
    vault: string;
    expiresAt: number;
  }>;
}> => {
  // ensure daemon is alive
  await findsertKeyrackDaemon({});

  // parse duration (default 9 hours)
  const durationMs = parseDuration(input.duration ?? '9h');
  const expiresAt = Date.now() + durationMs;

  // determine which keys to unlock
  const repoManifest = context.repoManifest;
  if (!repoManifest) {
    throw new UnexpectedCodePathError('no keyrack.yml found in repo', {
      note: 'keyrack.yml declares which keys are required',
    });
  }

  // resolve env and filter slugs
  const env = assertKeyrackEnvIsSpecified({
    manifest: repoManifest,
    env: input.env ?? null,
  });
  const slugsForEnv = getAllKeyrackSlugsForEnv({
    manifest: repoManifest,
    env,
  });

  // collect keys to unlock
  const keysToUnlock: Array<{
    slug: string;
    key: KeyrackKey;
    expiresAt: number;
    vault: string;
  }> = [];

  for (const slug of slugsForEnv) {
    const spec = repoManifest.keys[slug];
    if (!spec) continue;
    // find host config for this key
    const hostConfig = context.hostManifest.hosts[slug];
    if (!hostConfig) {
      // key not configured on this host — skip
      continue;
    }

    // get vault adapter
    const vault = hostConfig.vault;
    const adapter = context.vaultAdapters[vault];
    if (!adapter) {
      throw new UnexpectedCodePathError('vault adapter not found', { vault });
    }

    // unlock vault if needed
    const isUnlocked = await adapter.isUnlocked();
    if (!isUnlocked) {
      await adapter.unlock({ passphrase: input.passphrase });
    }

    // get secret from vault
    const secret = await adapter.get({ slug, exid: hostConfig.exid });
    if (!secret) {
      // key not found in vault — skip
      continue;
    }

    // infer grade from vault and mechanism
    const mech = hostConfig.mech;
    const grade = inferKeyGrade({ vault, mech });

    // collect key for daemon
    keysToUnlock.push({
      slug,
      key: { secret, grade },
      expiresAt,
      vault,
    });
  }

  // send keys to daemon
  if (keysToUnlock.length > 0) {
    await daemonAccessUnlock({
      keys: keysToUnlock.map((k) => ({
        slug: k.slug,
        key: k.key,
        expiresAt: k.expiresAt,
      })),
    });
  }

  return {
    unlocked: keysToUnlock.map((k) => ({
      slug: k.slug,
      vault: k.vault,
      expiresAt: k.expiresAt,
    })),
  };
};

/**
 * .what = parse duration string to milliseconds
 * .why = supports human-readable duration formats
 */
const parseDuration = (duration: string): number => {
  const match = duration.match(/^(\d+)(h|m|s)$/);
  if (!match) {
    throw new UnexpectedCodePathError('invalid duration format', {
      duration,
      note: 'expected format: 1h, 30m, 60s',
    });
  }

  const value = parseInt(match[1]!, 10);
  const unit = match[2]!;

  switch (unit) {
    case 'h':
      return value * 60 * 60 * 1000;
    case 'm':
      return value * 60 * 1000;
    case 's':
      return value * 1000;
    default:
      throw new UnexpectedCodePathError('invalid duration unit', { unit });
  }
};
