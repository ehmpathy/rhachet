import {
  BadRequestError,
  ConstraintError,
  MalfunctionError,
  UnexpectedCodePathError,
} from 'helpful-errors';

import { daoKeyrackInventory } from '@src/access/daos/daoKeyrackInventory';
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
import { filterSlugsByKeyAsk } from '@src/domain.operations/keyrack/filterSlugsByKeyAsk';
import type { ContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';
import { getAllKeyrackSlugsForEnv } from '@src/domain.operations/keyrack/getAllKeyrackSlugsForEnv';
import { getAllMachineWideSlugsForEnv } from '@src/domain.operations/keyrack/getAllMachineWideSlugsForEnv';
import { getAllSudoSlugsForKeyAsk } from '@src/domain.operations/keyrack/getAllSudoSlugsForKeyAsk';

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
  omitted: {
    slug: string;
    reason: 'absent' | 'lost' | 'remote' | 'errored';
    cause?: unknown;
  }[];
}> => {
  // derive socket path from owner
  const socketPath = getKeyrackDaemonSocketPath({ owner: input.owner ?? null });

  // fail fast if hostManifest not loaded
  // .note = caller-fixable (run: rhx keyrack init) → BadRequestError, not a server
  // fault; keeps the cli error render clean (no stack dump) and consistent with the
  // twin throw site in invokeKeyrack.ts that uses BadRequestError for this message
  if (!context.hostManifest)
    throw new BadRequestError(
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

    // get matched sudo slugs for key ask
    slugsForEnv = getAllSudoSlugsForKeyAsk({
      keyAsk: input.key,
      repoOrg: repoManifest?.org ?? null,
      hostManifest,
    });

    if (slugsForEnv.length === 0) {
      throw new BadRequestError(`sudo key not found: ${input.key}`, {
        note: 'run: rhx keyrack set --key X --env sudo --vault ... to configure',
      });
    }
  } else if (!repoManifest) {
    // no repo manifest → the MACHINE-WIDE bootstrap path. an `@all` key belongs to the box
    // itself (its own namespace), so it must unlock with NO repo manifest at all — the
    // bootstrap-to-clone credential path: the github-app install token is vaulted under `@all`
    // precisely so it can be fetched from anywhere, even outside any repo, before any repo is
    // cloned. env comes from --env directly, since there is no manifest to default it from.
    if (!env)
      throw new BadRequestError(
        'unlock without a repo manifest requires --env',
        {
          note: 'no keyrack.yml found; only machine-wide @all keys are unlockable, and --env names their scope',
          fix: 'run: rhx keyrack unlock --env <env> [--key <key>]  (or add a repo .agent/keyrack.yml)',
        },
      );

    // expand to the machine-wide `@all.{env}.*` slugs straight from the host manifest
    slugsForEnv = getAllMachineWideSlugsForEnv({
      env,
      keyAsk: input.key ?? null,
      hostManifest,
    });

    // fail-fast if a specific machine-wide key was asked but is absent from the host manifest
    if (input.key && slugsForEnv.length === 0)
      throw new BadRequestError(`machine-wide key not found: ${input.key}`, {
        env,
        note: `no @all.${env}.${input.key} key in the host manifest (and no repo keyrack.yml to declare a repo-scoped one)`,
        fix: `rhx keyrack set --key ${input.key} --env ${env} --org @all --vault ...`,
      });
  } else {
    // derive env via assertion
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
    const repoSlugsForEnv = filterSlugsByKeyAsk({
      slugs: allSlugsForEnv,
      keyAsk: input.key ?? null,
    });

    // ALSO include machine-wide `@all` keys held in the host manifest — an `@all` key is the
    // box's own namespace, always unlockable for its env regardless of the repo manifest. this
    // is what makes `--org @all` keys unlock WITH a repo manifest present too, IGNORING the
    // manifest org (a machine-wide key is never scoped to the tree). dedup by slug.
    const machineWideSlugsForEnv = getAllMachineWideSlugsForEnv({
      env: resolvedEnv,
      keyAsk: input.key ?? null,
      hostManifest,
    });
    slugsForEnv = [...new Set([...repoSlugsForEnv, ...machineWideSlugsForEnv])];

    // fail-fast if a specific key was requested but found in neither the repo manifest nor as
    // a machine-wide @all key
    if (input.key && slugsForEnv.length === 0) {
      throw new BadRequestError(`key not found in manifest: ${input.key}`, {
        env,
        note: `key '${input.key}' is not declared in keyrack.yml for env=${env} (nor as a machine-wide @all.${resolvedEnv}.${input.key})`,
        fix: `rhx keyrack set --key ${input.key} --env ${env}`,
      });
    }
  }

  // collect keys to unlock and track omitted
  // .note = omitted includes both "absent" (not in host manifest) and "lost" (in manifest but vault doesn't have it)
  // .note = DELIBERATE MUTATION (rule.require.immutable-vars scoped-zone carve-out): these two are
  //         loop accumulators for the per-slug pass below. the pass is async and has several
  //         early-`continue` classification branches (absent / remote / lost / errored / unlock), so
  //         a single functional reduce cannot express it without a regression of the narrative flow
  //         on a critical unlock path. the mutation stays confined to this one function's local
  //         scope — the arrays never escape as shared state — which is exactly the isolated-mutation
  //         zone the rule sanctions with this note
  const keysToUnlock: KeyrackKeyGrant[] = [];
  const keysOmitted: {
    slug: string;
    reason: 'absent' | 'lost' | 'remote' | 'errored';
    cause?: unknown;
  }[] = [];
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

    // for non-sudo keys, verify key exists in repoManifest — EXCEPT machine-wide `@all` keys,
    // which belong to the box's own namespace and are never declared in a repo manifest (they
    // unlock manifest-or-not, IGNORING the repo org). a machine-wide slug is prefixed `@all.`.
    const spec = repoManifest?.keys[slug];
    const isMachineWideSlug = slug.startsWith('@all.');
    if (env !== 'sudo' && !isMachineWideSlug && !spec) continue;

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

    // per-key fault isolation: a vault whose unlock/get throws on a LIVE, transient condition
    // (an SSM throttle, a decrypt-denied, an absent param) must NOT hard-abort the whole batch
    // and take down every co-batched healthy credential. route the caught fault to an 'errored'
    // omission (with its cause) and CONTINUE the loop — one flaky key never crashes the rest
    try {
      // get identity from context for vault operations
      const identity = await context.identity.getOne({ for: 'manifest' });

      // unlock vault if needed
      // .note = silent because CLI unlock output happens after all keys are processed
      const isUnlocked = await adapter.isUnlocked({
        exid: hostConfig.exid,
        identity,
        meta: hostConfig.meta,
      });
      if (!isUnlocked) {
        await adapter.unlock({
          identity,
          exid: hostConfig.exid,
          silent: true,
          meta: hostConfig.meta,
          slug: effectiveSlug,
          owner: input.owner ?? null,
        });
      }

      // get grant from vault
      // .note = vault may return null if key is absent (e.g., os.daemon after restart, deleted 1password item)
      // .note = vault now returns full KeyrackKeyGrant with grade, env, org, expiresAt
      // .note = thread the host manifest so aws.params decides its --org identity at its own
      //         boundary (the grove's IMDS role for @all, the org's declared AWS_PROFILE for a
      //         specific org — the tree-wide hardcut, a manifest fact, never an ambient env-grab)
      const grant = await adapter.get({
        slug: effectiveSlug,
        mech: hostConfig.mech,
        exid: hostConfig.exid,
        meta: hostConfig.meta,
        owner: input.owner ?? null,
        identity,
        hostManifest,
      });
      if (!grant) {
        // key exists in host manifest but vault no longer has it — track as lost
        // .note = this is expected for ephemeral vaults (os.daemon) after session restart
        // .note = this is expected for refed vaults (1password) if item was deleted
        keysOmitted.push({ slug: effectiveSlug, reason: 'lost' });

        // clean up inventory marker so subsequent get reports "absent" not "locked"
        await daoKeyrackInventory.del({
          slug: effectiveSlug,
          owner: input.owner ?? null,
        });
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
        hostConfig.org ??
        grant.org ??
        slugOrg ??
        repoManifest?.org ??
        'unknown';

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
    } catch (cause) {
      // allowlist boundary (rule.forbid.failhide): the per-key fault isolation exists ONLY for the
      // LIVE, OPERATIONAL faults a vault adapter raises as a classed domain error — a ConstraintError
      // (caller-fixable: no identity, denied, absent, malformed) or a MalfunctionError (server/
      // transient: throttle, 5xx, unknown SSM, roundtrip defect). those are isolated to an 'errored'
      // omission so one flaky key never aborts a co-batched healthy credential.
      // a NATIVE code bug (a TypeError/ReferenceError in our own overlay/slug code) is NOT an
      // operational fault — to absorb it as an omission would hide a real defect. so it rethrows
      // UNCHANGED, with its own type + stack, exactly as a bare rethrow would surface it.
      const isOperationalFault =
        cause instanceof ConstraintError || cause instanceof MalfunctionError;
      if (!isOperationalFault) throw cause;

      // a live operational fault on this one key — isolate it, carry the cause for the CLI render, continue
      keysOmitted.push({ slug: effectiveSlug, reason: 'errored', cause });
    }
  }

  // send keys to daemon
  if (keysToUnlock.length > 0) {
    // ensure daemon is alive
    // .why = the findsert sits here, immediately before the send, rather than at the
    // top of this operation. two reasons, both about the daemon's lifetime:
    // 1. the vault flow above is interactive and human-paced (yubikey, sso, browser),
    //    so a findsert at the top opens a spawn->first-command window minutes wide,
    //    across which a fresh daemon must survive on startup grace alone.
    // 2. when every key is omitted (absent / lost / remote), a findsert at the top
    //    spawns a daemon that no command will ever reach — a leak at the source.
    // .note = this matches vaultAdapterOsDaemon, which already findserts after its
    // interactive prompt and immediately before its own daemonAccessUnlock
    await findsertKeyrackDaemon({ socketPath });

    await daemonAccessUnlock({
      socketPath,
      keys: keysToUnlock,
    });
  }

  return { unlocked: keysToUnlock, omitted: keysOmitted };
};
