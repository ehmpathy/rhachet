import {
  BadRequestError,
  ConstraintError,
  UnexpectedCodePathError,
} from 'helpful-errors';

import { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';
import { asDurationMs } from '@src/domain.operations/keyrack/asDurationMs';
import { asKeyrackKeyEnv } from '@src/domain.operations/keyrack/asKeyrackKeyEnv';
import { asKeyrackKeyOrg } from '@src/domain.operations/keyrack/asKeyrackKeyOrg';
import { assertKeyrackEnvIsSpecified } from '@src/domain.operations/keyrack/assertKeyrackEnvIsSpecified';
import { computeExpiresAt } from '@src/domain.operations/keyrack/computeExpiresAt';
import { getKeyrackDaemonSocketPath } from '@src/domain.operations/keyrack/daemon/infra/getKeyrackDaemonSocketPath';
import {
  daemonAccessUnlock,
  findsertKeyrackDaemon,
} from '@src/domain.operations/keyrack/daemon/sdk';
import { getEnvAllFallbackSlug } from '@src/domain.operations/keyrack/decideIsKeySlugEqual';
import { filterSlugsByKeyInput } from '@src/domain.operations/keyrack/filterSlugsByKeyInput';
import type { ContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';
import { getAllKeyrackSlugsForEnv } from '@src/domain.operations/keyrack/getAllKeyrackSlugsForEnv';
import { getAllSudoSlugsForKey } from '@src/domain.operations/keyrack/getAllSudoSlugsForKey';

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
  omitted: { slug: string; reason: 'absent' | 'lost' | 'remote' }[];
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
  const requestedDurationMs = asDurationMs({
    duration: input.duration ?? defaultDuration,
  });

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
    slugsForEnv = getAllSudoSlugsForKey({
      hostManifest,
      keyInput: input.key,
    });

    if (slugsForEnv.length === 0) {
      throw new BadRequestError(`sudo key not found: ${input.key}`, {
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
    slugsForEnv = filterSlugsByKeyInput({
      slugs: allSlugsForEnv,
      keyInput: input.key ?? null,
    });

    // fail-fast if specific key requested but not found in repo manifest
    if (input.key && slugsForEnv.length === 0) {
      throw new BadRequestError(`key not found in manifest: ${input.key}`, {
        env,
        note: `key '${input.key}' is not declared in keyrack.yml for env=${env}`,
        fix: `rhx keyrack set --key ${input.key} --env ${env}`,
      });
    }
  }

  // collect keys to unlock and track omitted
  // .note = omitted includes both "absent" (not in host manifest) and "lost" (in manifest but vault doesn't have it)
  const keysToUnlock: KeyrackKeyGrant[] = [];
  const keysOmitted: { slug: string; reason: 'absent' | 'lost' | 'remote' }[] =
    [];
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

    // handle write-only vaults (e.g., github.secrets)
    // .note = write-only vaults have adapter.get === null
    if (adapter.get === null) {
      if (input.key) {
        // specific key requested on write-only vault → failfast
        throw new ConstraintError(`${vault} cannot be unlocked`, {
          slug: effectiveSlug,
          vault,
          hint: 'write-only vault; secrets cannot be retrieved via api',
        });
      }
      // bulk unlock → skip silently, add to omitted
      keysOmitted.push({ slug: effectiveSlug, reason: 'remote' });
      continue;
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

    // get grant from vault
    // .note = vault may return null if key is absent (e.g., os.daemon after restart, deleted 1password item)
    // .note = vault now returns full KeyrackKeyGrant with grade, env, org, expiresAt
    const grant = await adapter.get({
      slug: effectiveSlug,
      mech: hostConfig.mech,
      exid: hostConfig.exid,
      owner: input.owner ?? null,
      identity,
    });
    if (!grant) {
      // key exists in host manifest but vault no longer has it — track as lost
      // .note = this is expected for ephemeral vaults (os.daemon) after session restart
      // .note = this is expected for refed vaults (1password) if item was deleted
      keysOmitted.push({ slug: effectiveSlug, reason: 'lost' });
      continue;
    }

    // calculate expiresAt with maxDuration cap (may override vault's expiresAt)
    const { expiresAt } = computeExpiresAt({
      requestedDurationMs,
      maxDurationMs: hostConfig.maxDuration
        ? asDurationMs({ duration: hostConfig.maxDuration })
        : null,
      effectiveSlug,
      maxDurationLabel: hostConfig.maxDuration ?? null,
    });

    // derive env and org for daemon storage
    // for sudo keys: use hostConfig (has env/org set)
    // for regular keys: use grant's env/org or derive from effectiveSlug
    const slugOrg = asKeyrackKeyOrg({ slug: effectiveSlug });
    const slugEnv = asKeyrackKeyEnv({ slug: effectiveSlug });
    const keyEnv = hostConfig.env ?? grant.env ?? slugEnv ?? env;
    const keyOrg =
      hostConfig.org ?? grant.org ?? slugOrg ?? repoManifest?.org ?? 'unknown';

    // collect key for daemon (with duration-capped expiresAt)
    // .note = env=all fallback handled at daemon lookup time, not storage time
    keysToUnlock.push(
      new KeyrackKeyGrant({
        slug: effectiveSlug,
        key: grant.key,
        source: grant.source,
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
