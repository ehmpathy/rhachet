import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import { asIsoTimeStamp } from 'iso-time';

import { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';
import { assertKeyrackEnvIsSpecified } from '@src/domain.operations/keyrack/assertKeyrackEnvIsSpecified';
import { getKeyrackDaemonSocketPath } from '@src/domain.operations/keyrack/daemon/infra/getKeyrackDaemonSocketPath';
import {
  daemonAccessUnlock,
  findsertKeyrackDaemon,
} from '@src/domain.operations/keyrack/daemon/sdk';
import { getEnvAllFallbackSlug } from '@src/domain.operations/keyrack/decideIsKeySlugEqual';
import type { ContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';
import { getAllKeyrackSlugsForEnv } from '@src/domain.operations/keyrack/getAllKeyrackSlugsForEnv';
import { inferKeyGrade } from '@src/domain.operations/keyrack/grades/inferKeyGrade';

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
  },
  context: ContextKeyrack,
): Promise<{
  unlocked: KeyrackKeyGrant[];
  omitted: { slug: string; reason: 'absent' | 'lost' }[];
}> => {
  // derive socket path from owner
  const socketPath = getKeyrackDaemonSocketPath({ owner: input.owner ?? null });

  // ensure daemon is alive
  await findsertKeyrackDaemon({ socketPath });

  // fail fast if hostManifest not loaded
  if (!context.hostManifest)
    throw new UnexpectedCodePathError(
      'host manifest not found. run: rhx keyrack init',
      { owner: input.owner },
    );
  const hostManifest = context.hostManifest;

  // parse duration (default: 30min for sudo, 9h for others)
  const defaultDuration = input.env === 'sudo' ? '30m' : '9h';
  const requestedDurationMs = parseDuration(input.duration ?? defaultDuration);

  // determine which keys to unlock
  const repoManifest = context.repoManifest;

  // env from input (null if not provided; assertKeyrackEnvIsSpecified will validate)
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
    const isFullSlug = keyInput.includes('.') && hostManifest.hosts[keyInput];

    slugsForEnv = Object.entries(hostManifest.hosts)
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

    // fail-fast if specific key requested but not found in repo manifest
    if (keyInput && slugsForEnv.length === 0) {
      throw new BadRequestError(`key not found in manifest: ${keyInput}`, {
        env,
        note: `key '${keyInput}' is not declared in keyrack.yml for env=${env}`,
        fix: `rhx keyrack set --key ${keyInput} --env ${env}`,
      });
    }
  }

  // collect keys to unlock and track omitted
  // .note = omitted includes both "absent" (not in host manifest) and "lost" (in manifest but vault doesn't have it)
  const keysToUnlock: KeyrackKeyGrant[] = [];
  const keysOmitted: { slug: string; reason: 'absent' | 'lost' }[] = [];
  const effectiveSlugsUnlocked = new Set<string>(); // dedupe by effective slug

  for (const slug of slugsForEnv) {
    // find host config for this key — with fallback to env=all
    let hostConfig = hostManifest.hosts[slug];
    let effectiveSlug = slug;

    if (!hostConfig) {
      // try fallback to env=all version of the key
      const allSlug = getEnvAllFallbackSlug({ for: { slug } });

      if (allSlug) {
        hostConfig = hostManifest.hosts[allSlug];
        if (hostConfig) {
          // found env=all fallback
          effectiveSlug = allSlug;
        }
      }

      if (!hostConfig) {
        // key not configured on this host — track as absent
        keysOmitted.push({ slug, reason: 'absent' });
        continue;
      }
    }

    // dedupe: skip if we've already unlocked this effective slug
    // .note = env.all expansion creates multiple slugs that map to same host key
    if (effectiveSlugsUnlocked.has(effectiveSlug)) {
      continue;
    }
    effectiveSlugsUnlocked.add(effectiveSlug);

    // for non-sudo keys, verify key exists in repoManifest
    const spec = repoManifest?.keys[slug];
    if (env !== 'sudo' && !spec) continue;

    // get vault adapter
    const vault = hostConfig.vault;
    const adapter = context.vaultAdapters[vault];
    if (!adapter) {
      throw new UnexpectedCodePathError('vault adapter not found', { vault });
    }

    // get identity from context for vault operations
    const identity = await context.identity.getOne({ for: 'manifest' });

    // unlock vault if needed
    const isUnlocked = await adapter.isUnlocked({
      exid: hostConfig.exid,
      identity,
    });
    if (!isUnlocked) {
      await adapter.unlock({
        identity,
        exid: hostConfig.exid,
      });
    }

    // get secret from vault
    // .note = vault may return null if key is absent (e.g., os.daemon after restart, deleted 1password item)
    const secret = await adapter.get({
      slug: effectiveSlug,
      exid: hostConfig.exid,
      owner: input.owner ?? null,
      identity,
    });
    if (!secret) {
      // key exists in host manifest but vault no longer has it — track as lost
      // .note = this is expected for ephemeral vaults (os.daemon) after session restart
      // .note = this is expected for refed vaults (1password) if item was deleted
      keysOmitted.push({ slug: effectiveSlug, reason: 'lost' });
      continue;
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
          `⚠️ duration capped to ${hostConfig.maxDuration} for key ${effectiveSlug} (maxDuration limit)`,
        );
      }
    }
    const expiresAt = asIsoTimeStamp(
      new Date(Date.now() + effectiveDurationMs),
    );

    // derive env and org for daemon storage
    // for sudo keys: use hostConfig (has env/org set)
    // for regular keys: derive from effectiveSlug or input.env (hostConfig may not have them)
    const effectiveSlugParts = effectiveSlug.split('.');
    const slugOrg = effectiveSlugParts[0]!;
    const slugEnv = effectiveSlugParts[1]!;
    const keyEnv = hostConfig.env ?? slugEnv ?? env;
    const keyOrg = hostConfig.org ?? slugOrg ?? repoManifest?.org ?? 'unknown';

    // collect key for daemon
    // .note = env=all fallback handled at daemon lookup time, not storage time
    keysToUnlock.push(
      new KeyrackKeyGrant({
        slug: effectiveSlug,
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

  return { unlocked: keysToUnlock, omitted: keysOmitted };
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
