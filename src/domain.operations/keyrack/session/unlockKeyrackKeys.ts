import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import { asIsoTimeStamp } from 'iso-time';

import { KeyrackKeyGrant } from '../../../domain.objects/keyrack/KeyrackKeyGrant';
import { assertKeyrackEnvIsSpecified } from '../assertKeyrackEnvIsSpecified';
import { getKeyrackDaemonSocketPath } from '../daemon/infra/getKeyrackDaemonSocketPath';
import { daemonAccessUnlock, findsertKeyrackDaemon } from '../daemon/sdk';
import type { ContextKeyrackGrantUnlock } from '../genContextKeyrackGrantUnlock';
import { getAllKeyrackSlugsForEnv } from '../getAllKeyrackSlugsForEnv';
import { inferKeyGrade } from '../grades/inferKeyGrade';

/**
 * .what = unlock keyrack keys and send them to daemon memory
 * .why = caches credentials in daemon after interactive auth; tools can then access them
 *
 * .note = interactive auth prompts occur per source vault
 * .note = keys are stored by slug, reusable across worksites
 */
export const unlockKeyrackKeys = async (
  input: {
    owner?: string | null;
    env?: string;
    key?: string;
    duration?: string;
    passphrase?: string;
  },
  context: ContextKeyrackGrantUnlock,
): Promise<{
  unlocked: KeyrackKeyGrant[];
}> => {
  // resolve socket path based on owner
  const socketPath = getKeyrackDaemonSocketPath({ owner: input.owner ?? null });

  // ensure daemon is alive
  await findsertKeyrackDaemon({ socketPath });

  // parse duration (default: 30min for sudo, 9h for others)
  const defaultDuration = input.env === 'sudo' ? '30m' : '9h';
  const requestedDurationMs = parseDuration(input.duration ?? defaultDuration);

  // determine which keys to unlock
  const repoManifest = context.repoManifest;

  // resolve env (null if not provided; assertKeyrackEnvIsSpecified will validate)
  const env = input.env ?? null;

  // for sudo keys, find matched keys in hostManifest by key name suffix
  // for regular keys, use repoManifest + hostManifest intersection
  let slugsForEnv: string[];

  if (env === 'sudo') {
    // sudo keys: search hostManifest for keys that match the key name and env=sudo
    if (!input.key) {
      throw new BadRequestError('sudo credentials require --key flag', {
        note: 'run: rhx keyrack unlock --env sudo --key X',
      });
    }

    // find all slugs in hostManifest that match the key and have env=sudo
    const keyInput = input.key;

    // detect if keyInput is a full slug (org.env.key format) or just key name
    const isFullSlug =
      keyInput.includes('.') && context.hostManifest.hosts[keyInput];

    slugsForEnv = Object.entries(context.hostManifest.hosts)
      .filter(([slug, hostConfig]) => {
        // slug format: $org.$env.$key (key may contain dots)
        const parts = slug.split('.');
        const slugEnv = parts[1];
        const slugKey = parts.slice(2).join('.');

        // if full slug provided, match exactly
        if (isFullSlug) {
          return slug === keyInput && slugEnv === 'sudo';
        }

        // otherwise match by key name suffix
        return slugEnv === 'sudo' && slugKey === keyInput;
      })
      .map(([slug]) => slug);

    if (slugsForEnv.length === 0) {
      throw new BadRequestError(`sudo key not found: ${keyInput}`, {
        note: 'run: rhx keyrack set --key X --env sudo --vault ... to configure',
      });
    }
  } else {
    // regular keys: require repoManifest
    if (!repoManifest) {
      throw new UnexpectedCodePathError('no keyrack.yml found in repo', {
        note: 'keyrack.yml declares which keys are required',
      });
    }

    // resolve env via assertion
    const resolvedEnv = assertKeyrackEnvIsSpecified({
      manifest: repoManifest,
      env: env,
    });

    // get slugs from repoManifest
    const allSlugsForEnv = getAllKeyrackSlugsForEnv({
      manifest: repoManifest,
      env: resolvedEnv,
    });

    // filter by key: match full slug or key name suffix
    const keyInput = input.key;
    slugsForEnv = keyInput
      ? allSlugsForEnv.filter(
          (slug) => slug === keyInput || slug.endsWith(`.${keyInput}`),
        )
      : allSlugsForEnv;
  }

  // collect keys to unlock
  const keysToUnlock: KeyrackKeyGrant[] = [];

  for (const slug of slugsForEnv) {
    // find host config for this key
    const hostConfig = context.hostManifest.hosts[slug];
    if (!hostConfig) {
      // key not configured on this host — skip
      continue;
    }

    // for non-sudo keys, verify key exists in repoManifest
    const spec = repoManifest?.keys[slug];
    if (env !== 'sudo' && !spec) continue;

    // get vault adapter
    const vault = hostConfig.vault;
    const adapter = context.vaultAdapters[vault];
    if (!adapter) {
      throw new UnexpectedCodePathError('vault adapter not found', { vault });
    }

    // unlock vault if needed
    const isUnlocked = await adapter.isUnlocked({ exid: hostConfig.exid });
    if (!isUnlocked) {
      await adapter.unlock({
        passphrase: input.passphrase,
        exid: hostConfig.exid,
      });
    }

    // get secret from vault
    const secret = await adapter.get({ slug, exid: hostConfig.exid });
    if (!secret) {
      throw new UnexpectedCodePathError(
        'vault file absent for key that exists in manifest',
        {
          slug,
          vault,
          env: hostConfig.env,
          fix: `re-run: keyrack set --key ... --env ${hostConfig.env} --vault ${vault}`,
        },
      );
    }

    // infer grade from vault and mechanism
    const mech = hostConfig.mech;
    const grade = inferKeyGrade({ vault, mech });

    // calculate expiresAt with maxDuration cap
    let effectiveDurationMs = requestedDurationMs;
    if (hostConfig.maxDuration) {
      const maxDurationMs = parseDuration(hostConfig.maxDuration);
      if (requestedDurationMs > maxDurationMs) {
        // cap to maxDuration and warn
        effectiveDurationMs = maxDurationMs;
        console.warn(
          `⚠️ duration capped to ${hostConfig.maxDuration} for key ${slug} (maxDuration limit)`,
        );
      }
    }
    const expiresAt = asIsoTimeStamp(
      new Date(Date.now() + effectiveDurationMs),
    );

    // derive env and org for daemon storage
    // for sudo keys: use hostConfig (has env/org set)
    // for regular keys: derive from slug or input.env (hostConfig may not have them)
    const slugParts = slug.split('.');
    const slugOrg = slugParts[0]!;
    const slugEnv = slugParts[1]!;
    const keyEnv = hostConfig.env ?? slugEnv ?? env;
    const keyOrg = hostConfig.org ?? slugOrg ?? repoManifest?.org ?? 'unknown';

    // collect key for daemon
    keysToUnlock.push(
      new KeyrackKeyGrant({
        slug,
        key: { secret, grade },
        source: { vault, mech },
        env: keyEnv,
        org: keyOrg,
        expiresAt,
      }),
    );
  }

  // send keys to daemon
  if (keysToUnlock.length > 0) {
    await daemonAccessUnlock({
      socketPath,
      keys: keysToUnlock,
    });
  }

  return { unlocked: keysToUnlock };
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
