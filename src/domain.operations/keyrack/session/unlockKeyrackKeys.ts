import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { now } from 'iso-time';

import { daoKeyrackInventory } from '@src/access/daos/daoKeyrackInventory';
import { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';
import type { KeyrackKeyOmission } from '@src/domain.objects/keyrack/KeyrackKeyOmission';
import type { KeyrackKeyReach } from '@src/domain.objects/keyrack/KeyrackKeyReach';
import { asDurationMs } from '@src/domain.operations/keyrack/asDurationMs';
import { asKeyrackKeyEnv } from '@src/domain.operations/keyrack/asKeyrackKeyEnv';
import { asKeyrackKeyName } from '@src/domain.operations/keyrack/asKeyrackKeyName';
import { asKeyrackKeyOrg } from '@src/domain.operations/keyrack/asKeyrackKeyOrg';
import { assertKeyrackEnvIsSpecified } from '@src/domain.operations/keyrack/assertKeyrackEnvIsSpecified';
import { emitKeyrackDurationCapWarn } from '@src/domain.operations/keyrack/cli/emitKeyrackDurationCapWarn';
import { computeExpiresAt } from '@src/domain.operations/keyrack/computeExpiresAt';
import { getKeyrackDaemonSocketPath } from '@src/domain.operations/keyrack/daemon/infra/getKeyrackDaemonSocketPath';
import {
  daemonAccessUnlock,
  findsertKeyrackDaemon,
} from '@src/domain.operations/keyrack/daemon/sdk';
import { filterSlugsByKeyAsk } from '@src/domain.operations/keyrack/filterSlugsByKeyAsk';
import type { ContextKeyrack } from '@src/domain.operations/keyrack/genContextKeyrack';
import { getAllKeyrackSlugsForEnv } from '@src/domain.operations/keyrack/getAllKeyrackSlugsForEnv';
import { getAllMachineWideSlugsForEnv } from '@src/domain.operations/keyrack/getAllMachineWideSlugsForEnv';
import { getAllSudoSlugsForKeyAsk } from '@src/domain.operations/keyrack/getAllSudoSlugsForKeyAsk';
import { asKeyrackKeyReachExid } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachExid';
import { asKeyrackKeyReachField } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachField';
import { asKeyrackKeySlugAtReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeySlugAtReach';
import { assertKeyrackReachAddressable } from '@src/domain.operations/keyrack/reach/assertKeyrackReachAddressable';
import { assertKeyrackReachRequiresKey } from '@src/domain.operations/keyrack/reach/assertKeyrackReachRequiresKey';
import { getOneKeyrackHostForSlugAtReach } from '@src/domain.operations/keyrack/reach/getOneKeyrackHostForSlugAtReach';
import { isKeyrackVaultReachUnaddressable } from '@src/domain.operations/keyrack/reach/isKeyrackVaultReachUnaddressable';

import { asKeyrackOmittedRow } from './asKeyrackOmittedRow';
import { getAllKeyrackOmissionsExceptHeldAtReach } from './getAllKeyrackOmissionsExceptHeldAtReach';
import { getAllKeyrackUnlockTargets } from './getAllKeyrackUnlockTargets';
import { getOneKeyrackUnlockTargetDisposition } from './getOneKeyrackUnlockTargetDisposition';

/**
 * .what = unlock keyrack keys and send them to daemon memory
 * .why = caches credentials in daemon after interactive auth; tools can then access them
 *
 * .note = interactive auth prompts occur per source vault
 * .note = keys are stored by (slug, reach), reusable across worksites
 * .note = a reach SELECTS which of the stored keys to hand back. it requires --key, and an
 *         unlock at a reach no key was cut for is a ConstraintError, never a fallback
 */
export const unlockKeyrackKeys = async (
  input: {
    owner?: string | null;
    env?: string;
    key?: string;

    /**
     * .what = the reach to unlock; absent means the reachless key
     * .why = OPTIONAL, not nullable — a deliberate exception to
     *        `rule.forbid.undefined-inputs`. `reach` rides into `KeyrackKeyGrant` and onto
     *        the daemon wire, where e16 requires `JSON.stringify` DROP it when absent.
     *        `null` survives serialization; `undefined` does not
     * .note = the drop hazard that rule guards is covered structurally instead: an unlock
     *         at a reach no key was cut for THROWS (e6), never falls back to the reachless
     */
    reach?: KeyrackKeyReach;

    duration?: string;
  },
  context: ContextKeyrack,
): Promise<{
  unlocked: KeyrackKeyGrant[];
  omitted: KeyrackKeyOmission[];
}> => {
  // a reach is meaningful for exactly one key, so it cannot ride a bulk unlock (q2)
  assertKeyrackReachRequiresKey({
    reach: input.reach,
    keyed: !!input.key,
    hint: input.reach
      ? `name the key — rhx keyrack unlock --env ${input.env ?? '$env'} --key $KEY --reach ${asKeyrackKeyReachExid({ reach: input.reach })}`
      : '',
  });

  // derive socket path from owner
  const socketPath = getKeyrackDaemonSocketPath({ owner: input.owner ?? null });

  // fail fast if hostManifest not loaded
  // .note = caller-fixable (run: rhx keyrack init) → ConstraintError, not a server
  // fault; keeps the cli error render clean (no stack dump) and consistent with the
  // twin throw site in invokeKeyrack.ts that uses ConstraintError for this message
  if (!context.hostManifest)
    throw new ConstraintError(
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
      throw new ConstraintError('sudo credentials require --key flag', {
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
      throw new ConstraintError(`sudo key not found: ${input.key}`, {
        note: 'run: rhx keyrack set --key X --env sudo --vault ... to configure',
      });
    }
  } else if (!repoManifest) {
    // no repo manifest → the MACHINE-WIDE bootstrap path. an `@all` key belongs to the box
    // itself (its own namespace), so it must unlock with NO repo manifest at all — the
    // bootstrap-to-clone credential path: the github-app install token is vaulted under `@all`
    // precisely so it can be fetched from anywhere, even outside any repo, before any repo is
    // cloned. env comes from --env directly, since there is no manifest to default it from.
    // .note = a ConstraintError, never a parent word — an absent --env is the caller's to fix,
    //         so it owes a blocked render + exit 2 rather than a stack trace (term=blocked)
    if (!env)
      throw new ConstraintError(
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
      throw new ConstraintError(`machine-wide key not found: ${input.key}`, {
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
      throw new ConstraintError(`key not found in manifest: ${input.key}`, {
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
  const keysOmitted: KeyrackKeyOmission[] = [];
  const addressesUnlocked = new Set<string>(); // dedupe by ADDRESS — see the .note below
  const slugsHeldAtReach = new Set<string>(); // slugs the rack holds at SOME reach

  // what an unlock operates on is one target per (slug, reach) — a reachless ask enumerates
  // every reach the rack holds, so a key cut only at reaches is reachable from a bulk unlock
  const unlockTargets = getAllKeyrackUnlockTargets({
    slugs: slugsForEnv,
    reach: input.reach,
    hosts: hostManifest.hosts,
  });

  for (const { slug, reach: reachTarget } of unlockTargets) {
    // find host config for this key — addressed by (slug, reach), with fallback to env=all
    // .note = the env=all fallback CARRIES THE REACH ACROSS. a slug-only fallback would let
    //         a reach-unlock at org.test.KEY land on the REACHLESS org.all.KEY and hand
    //         back a credential for the wrong reach
    const hostFound = getOneKeyrackHostForSlugAtReach({
      hosts: hostManifest.hosts,
      slug,
      reach: reachTarget,
    });

    // a reach-unlock that finds no key is an ABSENT KEY, and an absent key must be
    // loud. under the mint-time design this could have quietly fallen through to the
    // reachless key — a live credential for the wrong org. here there is no peer to
    // fall through to, and the human is told to cut the key they actually want (e6)
    //
    // .note = the message names WHAT missed and WHY, and stops there — the FIX rides in the
    //         `hint:` leaf below it. the WHY earns its place because the tree renders the found
    //         slug one line down, so a bare "not found" invites "you just printed it, why not
    //         use it?" — the refusal reads as a lookup defect rather than a deliberate one. the
    //         answer is stated in the human's own words (`each reach needs its own key`), never
    //         in the mechanism's (an earlier draft said "a reach is never derived", which
    //         describes the ABSENT FALLBACK LOOKUP — true of the code, opaque to the human it
    //         is handed to). a prose restatement of the fix is NOT carried here: it would
    //         render the hint twice in one tree (`rule.require.errors-name-the-fix` wants the
    //         fix named once, not echoed; `rule.forbid.ambiguous-labels` on the double render)
    // .note = `credential … does not exist` is the SHARED stem, matched verbatim against the
    //         absent report `getKeyrackKeyGrant` returns. one `absent` outcome must read one
    //         way across the cli and the sdk, or a human who meets both in a session reads
    //         two failures where the tool had one (`rule.require.ubiqlang`). the slug is left
    //         OUT of the stem here, and only here — this surface renders it as its own tree
    //         leaf one line below, so to name it twice would be the same echo defect
    // .note = a ConstraintError, never a Malfunction — the caller cuts the key and proceeds,
    //         so it exits 2 (`rule.require.exit-code-semantics`)
    if (!hostFound && input.reach)
      throw new ConstraintError(
        `credential at reach '${asKeyrackKeyReachExid({ reach: input.reach })}' does not exist — each reach needs its own key`,
        {
          slug,
          reach: asKeyrackKeyReachExid({ reach: input.reach }),
          // .note = flag order is `--key` before `--env`, which is the repo-wide shape for a
          //         suggested `keyrack set` — `getKeyrackKeyGrant`, `asResolvedAttempt`,
          //         `asKeyrackOmittedKeyTip`, and `getKeyrackBlockedReport` all render it that
          //         way. this line was the lone outlier, so a human who met a refusal hint and
          //         an omission tip in one session read the same command two ways and could
          //         pattern-match neither (`rule.forbid.ambiguous-labels`)
          //
          // ⛔ `--org @all` rides along for a MACHINE-WIDE slug, and it carries real weight
          //    rather than decoration. `keyrack set --org` defaults to `@this`, which resolves
          //    to the REPO manifest's org — so a human who pastes this hint from inside any
          //    orged repo silently cuts a TREE-grain `testorg.$env.$KEY@$reach` twin while the
          //    GROVE-grain `@all.$env.$KEY@$reach` key they actually asked for stays uncut. the
          //    unlock then fails exactly as before, with no signal a duplicate now exists
          //    (`rule.require.org-scope-grain-hardcut`, `rule.require.errors-name-the-fix`)
          // .note = this mirrors `asKeyrackOmittedKeyTip.ts:132`, which carries the same flag
          //         for the same cause. the hazard belongs to the word `set`, not to either
          //         render — `set` is the command that infers grain from the repo manifest, so
          //         EVERY tip that names it owes the flag. an `unlock` tip owes none
          hint: `cut the key — rhx keyrack set${input.owner ? ` --owner ${input.owner}` : ''} --key ${asKeyrackKeyName({ slug })} --env ${input.env ?? '$env'}${asKeyrackKeyOrg({ slug }) === '@all' ? ' --org @all' : ''} --reach ${asKeyrackKeyReachExid({ reach: input.reach })}`,
        },
      );

    // key not configured on this host — track as absent
    if (!hostFound) {
      keysOmitted.push(asKeyrackOmittedRow({ slug, reason: 'absent' }));
      continue;
    }

    const { hostConfig, effectiveSlug } = hostFound;

    // dedupe: skip if we've already unlocked this exact ADDRESS
    // .note = env.all expansion creates multiple slugs that map to same host key
    // .note = ⚠️ keyed by ADDRESS, not by slug. a slug key was correct while one slug could
    //         yield only one target; now a reachless ask enumerates N reaches of ONE slug,
    //         and a slug key would unlock the first and silently evict every peer — the
    //         exact eviction the reach identity axis exists to remove (term=address)
    const addressUnlocked = asKeyrackKeySlugAtReach({
      slug: effectiveSlug,
      reach: hostConfig.reach,
    });
    if (addressesUnlocked.has(addressUnlocked)) {
      continue;
    }
    addressesUnlocked.add(addressUnlocked);

    // for non-sudo keys, verify key exists in repoManifest — EXCEPT machine-wide `@all` keys,
    // which belong to the box's own namespace and are never declared in a repo manifest (they
    // unlock manifest-or-not, IGNORING the repo org). a machine-wide slug is prefixed `@all.`.
    const spec = repoManifest?.keys[slug];
    const isMachineWideSlug = slug.startsWith('@all.');
    if (env !== 'sudo' && !isMachineWideSlug && !spec) continue;

    // get vault adapter
    const vault = hostConfig.vault;

    // ⚠️ ONE read decides both halves of one invariant: whether this target is dropped, and
    //    whether it may vouch that its slug was reported on at a reach. they were two adjacent
    //    statements whose ORDER carried the guarantee — a skip that fired after the vouch would
    //    prune the reachless `absent` row on behalf of a target that then vanished, and the key
    //    would appear in neither `unlocked` nor `omitted` (rule.forbid.failhide). the leaf makes
    //    that pair unsplittable and clamps it at unit grain
    const disposition = getOneKeyrackUnlockTargetDisposition({
      reachTarget,
      reachAsked: input.reach,
      vault,
    });
    if (disposition.skipped) continue;
    if (disposition.marksSlugHeldAtReach) slugsHeldAtReach.add(slug);

    const adapter = context.vaultAdapters[vault];
    if (!adapter) {
      throw new MalfunctionError('vault adapter not found', { vault });
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
      keysOmitted.push(
        asKeyrackOmittedRow({
          slug: effectiveSlug,
          reason: 'remote',
          host: hostConfig,
        }),
      );
      continue;
    }

    // ⛔ a reach the VAULT cannot address is refused HERE, above the try — never inside it.
    //    this is a STATIC refusal, decided by the (vault, reach) pair alone with no i/o, so it is
    //    not one of the LIVE operational faults the isolation below exists for. left inside the
    //    try it is caught and rendered as a per-key `errored 💥` row on stdout — and `💥` is the
    //    MalfunctionError glyph (`rule.require.keyrack-emoji-palette`), so a refusal that is
    //    squarely the caller's to fix would read as "we broke", buried in a batch row rather
    //    than the `✋ blocked` tree a ConstraintError owes (term=blocked)
    // .note = there is never a batch to isolate on this path anyway: `--reach` requires `--key`
    //         (q2), so a reach-ask is always ONE key. isolation of a single-key ask protects no
    //         co-batched peer — it only degrades the render
    // .note = it also fires before `identity.getOne()`, so a caller who names an impossible reach
    //         is refused up front rather than after an ssh-key unlock they did not need
    //         (rule.prefer.prevent-over-correct)
    // .note = the adapter-level guards stay, as defense in depth: the sdk reaches an adapter
    //         directly, with no unlock loop above it to hoist a check into
    // .note = the ASK's reach, deliberately — NOT the target's. this refusal says "you named a
    //         reach this vault cannot address", which is a caller error and owes a loud
    //         ConstraintError. an ENUMERATED reach was never named by the caller, so to refuse
    //         the whole ask over it would abort a bulk unlock on a key the human never
    //         mentioned. an enumerated target on such a vault is left to the adapter's own
    //         guard below, which isolates it as one `errored` row (defense in depth)
    if (isKeyrackVaultReachUnaddressable({ vault }))
      assertKeyrackReachAddressable({
        reach: input.reach,
        vault,
        direction: 'read',
      });

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
      // .note = thread the reach so a vault that files per-reach reads the key cut for THIS
      //         reach. a vault that cannot tell one reach from another throws rather than
      //         answer with the reachless value (e20/q9)
      // .note = the TARGET's reach, never the ask's. under a reachless bulk ask the two
      //         differ: the ask names none while the target names the one this pass is for,
      //         and a vault handed the ask's `undefined` would read the REACHLESS value and
      //         report a reach-cut key `lost` — the very state the enumeration exists to end
      const grant = await adapter.get({
        slug: effectiveSlug,
        mech: hostConfig.mech,
        exid: hostConfig.exid,
        meta: hostConfig.meta,
        owner: input.owner ?? null,
        identity,
        reach: reachTarget,
        hostManifest,
      });
      if (!grant) {
        // key exists in host manifest but vault no longer has it — track as lost
        // .note = this is expected for ephemeral vaults (os.daemon) after session restart
        // .note = this is expected for refed vaults (1password) if item was deleted
        keysOmitted.push(
          asKeyrackOmittedRow({
            slug: effectiveSlug,
            reason: 'lost',
            host: hostConfig,
          }),
        );

        // clean up inventory marker so subsequent get reports "absent" not "locked"
        // .note = pulled by the full ADDRESS, since setKeyrackKeyHost stocks it by address —
        //         keyed by the bare slug, a reach unlock would clear a PEER reach's marker
        await daoKeyrackInventory.del({
          slug: asKeyrackKeySlugAtReach({
            slug: effectiveSlug,
            reach: reachTarget,
          }),
          owner: input.owner ?? null,
        });
        continue;
      }

      // calculate expiresAt, clamped to the shortest of: requested duration, the per-key
      // maxDuration cap, and the credential's OWN life as the mech reports it (e17)
      // .note = the clock read happens HERE, in the orchestrator, and is handed in. a
      //         `compute*` may take no i/o, and a clock is i/o — see the purity note there
      const { expiresAt, cappedByMaxDuration } = computeExpiresAt({
        now: now(),
        requestedDurationMs,
        maxDurationMs: hostConfig.maxDuration
          ? asDurationMs({ duration: hostConfig.maxDuration })
          : null,
        grantExpiresAt: grant.expiresAt,
      });

      // the cap is a policy the human did not ask for, so it is said out loud
      if (cappedByMaxDuration && hostConfig.maxDuration)
        emitKeyrackDurationCapWarn({
          slug: effectiveSlug,
          maxDuration: hostConfig.maxDuration,
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
          // carry the reach from the HOST entry, which is what was cut for a reach —
          // not from the grant, which some vaults build without one
          ...asKeyrackKeyReachField({ reach: hostConfig.reach }),
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
      keysOmitted.push(
        asKeyrackOmittedRow({
          slug: effectiveSlug,
          reason: 'errored',
          host: hostConfig,
          cause,
        }),
      );
    }
  }

  // a key a reach target reported on was never `absent` — drop the reachless miss that says so
  const keysOmittedTruly = getAllKeyrackOmissionsExceptHeldAtReach({
    omissions: keysOmitted,
    slugsHeldAtReach,
  });

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

  return { unlocked: keysToUnlock, omitted: keysOmittedTruly };
};
