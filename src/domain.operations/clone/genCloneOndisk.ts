import { ConstraintError } from 'helpful-errors';
import { now } from 'iso-time';
import { getUuid } from 'uuid-fns';

import type { BrainSlug } from '@src/domain.objects/BrainSlug';
import type { CloneOndisk } from '@src/domain.objects/CloneOndisk';
import type { RoleSlug } from '@src/domain.objects/RoleSlug';
import { getHomeHash } from '@src/infra/host/getHomeHash';
import { getOneRepoPath } from '@src/infra/host/getOneRepoPath';

import { mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { findsertActorOndisk } from '../actor/enrolled/findsertActorOndisk';
import { genEnrollmentHash } from '../actor/enrolled/genEnrollmentHash';
import { getActorOndiskDir } from '../actor/enrolled/getActorOndiskDir';
import { getActorsRootDir } from '../actor/enrolled/getActorsRootDir';
import { getBrainOndiskDir } from '../actor/enrolled/getBrainOndiskDir';
import { asCloneDirName } from './asCloneDirName';
import { asCloneSocketOmissionReasonError } from './asCloneSocketOmissionReasonError';
import {
  type CloneSlugClaimState,
  computeCloneSlugDecision,
} from './computeCloneSlugDecision';
import { computeCloneSocketOmissionReason } from './computeCloneSocketOmissionReason';
import { delCloneSpawn } from './delCloneSpawn';
import { delCloneStagedDir } from './delCloneStagedDir';
import { genCloneHistoryLink } from './genCloneHistoryLink';
import { genCloneSerial } from './genCloneSerial';
import { type CloneSpawnHandle, genCloneSpawn } from './genCloneSpawn';
import { getCloneBrainDir } from './getCloneBrainDir';
import { getCloneDir } from './getCloneDir';
import { getCloneReachState } from './getCloneReachState';
import { getCloneSocketPath } from './getCloneSocketPath';
import { getOneCloneByRef } from './getOneCloneByRef';
import { getOneCloneHydrated } from './getOneCloneHydrated';
import { getRhachetRealpathFromProcess } from './getRhachetRealpathFromProcess';
import type { PtyCloneHost } from './pty/genBrainCliPtyClone';
import { genPtyCloneHostDetached } from './pty/genPtyCloneHostDetached';
import { genPtyCloneHostFromProcess } from './pty/genPtyCloneHostFromProcess';
import { getPtyHostTupleFromProcess } from './pty/getPtyHostTupleFromProcess';
import { getPtyModuleOrNull, type PtyModule } from './pty/getPtyModuleOrNull';
import { getPtyPlatformSupportFromProcess } from './pty/getPtyPlatformSupportFromProcess';
import { isCloneSocketAvailable } from './pty/isCloneSocketAvailable';
import { isCloneSocketEligible } from './pty/isCloneSocketEligible';
import {
  type EmulatorModule,
  getEmulatorModuleOrNull,
} from './screen/getEmulatorModuleOrNull';
import { setCloneIdentity } from './setCloneIdentity';
import { setCloneSerialIndex } from './setCloneSerialIndex';
import { setCloneSlugIndex } from './setCloneSlugIndex';

/**
 * .what = findsert one clone of an enrolled actor — the enroll-time orchestrator
 *   that turns { brain, roles } + an optional `--as @:<slug>` into a spawned,
 *   addressable clone (or reuses a live one)
 * .why =
 *   - this IS what `rhx enroll` drives: it ensures the anonymous actor dir, then
 *     bakes a fresh clone through a managed pty (socket + history) — or, when the
 *     slug already names a LIVE clone of this actor, REUSES it so a cron re-enroll
 *     does not pile up billed brains (rule.require.fewer-paths-via-idempotency)
 *   - the slug is idempotent-by-decision: reuse a live one, rebind a dead one,
 *     collide on a different actor's, bake fresh otherwise — one decision word, no
 *     hidden branches
 *
 * .note = RETURNS { outcome, clone, spawn } — it never prints and never exits. the
 *   caller (invokeEnroll) renders the outcome and awaits `spawn.waitForExit` to
 *   forward the child's code. `spawn` is null on a reuse (no new child)
 * .note = the slug is claimed (an atomic exclusive symlink) AFTER the spawn but
 *   BEFORE the temp dir is renamed into place, so a concurrent-bake loser reaps its
 *   still-temp-named dir and `clone list` never shows a ghost row
 */
export const genCloneOndisk = async (
  input: {
    repoPath: string;
    brain: BrainSlug;
    roles: RoleSlug[];
    delta: string | null;
    reason: string | null;
    command: string;
    args: string[];
    cwd: string;
    slug: string | null;
    /**
     * what the ENROLLER does with the child — never whether it can be REACHED
     * (`computeCloneEnrollMode`, `define.invariant.clone-attendance-is-a-mode-never-a-reach`)
     *
     * 🔴 .note = only `async` changes what this operation does, and that is on purpose.
     *   `watch` and `await` both mirror into the caller's streams — one so a human
     *   reads the session, one so a caller reads the answer a print-mode child owes —
     *   and the wire they need is identical. so the branch below tests `async` alone,
     *   and a fourth mode that mirrors needs no edit here
     */
    mode: 'watch' | 'async' | 'await';
    noSocket: boolean;
    /** how deep in the enroll chain this clone is born (`asCloneEnrollDepth`) */
    depth: number;
  },
  context?: {
    pty?: PtyModule | null;
    emulator?: EmulatorModule | null;
    host?: PtyCloneHost;
  },
): Promise<{
  outcome: 'reused' | 'baked' | 'rebound';
  clone: CloneOndisk;
  spawn: CloneSpawnHandle | null;
}> => {
  const repoPath = getOneRepoPath({ from: input.repoPath });
  const hash = genEnrollmentHash({ brain: input.brain, roles: input.roles });
  const actorsRoot = getActorsRootDir({ repoPath });

  // decide the slug outcome from what already holds the name (if any)
  const priorClone =
    input.slug === null
      ? null
      : getOneCloneByRef({ repoPath, ref: { by: 'slug', slug: input.slug } });
  const claim: CloneSlugClaimState | null = await (async () => {
    if (input.slug === null) return null;
    if (priorClone === null) return { kind: 'unclaimed' as const };
    // actor identity is the COMPOSITE {repoPath, hash} (ActorOndisk
    // unique=['repoPath','hash']) — compare both halves, so this decides
    // identity by the whole declared key, not a convention that priorClone
    // always shares repoPath (it does today, but the check must not rely on it)
    const sameActor =
      priorClone.actor.hash === hash && priorClone.actor.repoPath === repoPath;
    const reach = await getCloneReachState({ clone: priorClone });
    return reach === 'LIVE'
      ? { kind: 'live' as const, sameActor }
      : { kind: 'dead' as const, sameActor };
  })();
  const decision = computeCloneSlugDecision({
    requestedSlug: input.slug,
    claim,
  });

  // a slug held by a DIFFERENT actor is a hard collision — fail loud, no spawn
  if (decision === 'collision')
    return ConstraintError.throw(
      `slug "${input.slug}" is already claimed by a different actor`,
      {
        slug: input.slug,
        hint: 'pick a different --as @:<slug>, or reach the extant clone by that slug',
      },
    );

  // ensure the actor dir + manifest; a pure live-slug reuse does NOT append a log
  findsertActorOndisk({
    repoPath,
    brain: input.brain,
    roles: input.roles,
    delta: input.delta,
    reason: input.reason,
    logEnrollment: decision !== 'reuse',
  });

  // reuse: the slug already names a LIVE clone of this actor — hand it back. a
  // reuse spawns no child, so no socket check applies
  if (decision === 'reuse')
    return {
      outcome: 'reused',
      clone: priorClone!,
      spawn: null,
    };

  // bake / rebind: mint a fresh serial + derive its socket
  const serial = genCloneSerial();
  const socketPath = getCloneSocketPath({ serial });
  const actorDir = getActorOndiskDir({ repoPath, hash });
  const cloneDir = getCloneDir({ actorDir, serial });
  const brainDir = getBrainOndiskDir({ actorDir });

  // does a socket make sense here, and can the pty carry one on this host?
  // 🔴 the mode is NOT a term here. a clone is reachable in either mode — that is
  //   `define.invariant.clone-attendance-is-a-mode-never-a-reach`, and an attendance
  //   read in this gate is the defect it was written from
  const wantsSocket = isCloneSocketEligible({
    brain: input.brain,
    noSocket: input.noSocket,
  });
  const ptyModule =
    context?.pty !== undefined ? context.pty : getPtyModuleOrNull();
  // the emulator is lazy-loaded like the pty addon (V19) — a null degrades the read channel
  // to feed-not-live, never the whole enroll. a socket-less spawn ignores it
  const emulatorModule =
    context?.emulator !== undefined
      ? context.emulator
      : getEmulatorModuleOrNull();
  const socketEligible = isCloneSocketAvailable({
    wantsSocket,
    ptyModule,
    socketPath,
  });

  // a wanted socket is a CRITICAL BASELINE REQUIREMENT — fail hard and fast the
  // instant it cannot be honored, BEFORE any dir/spawn exists, rather than degrade
  // to a talk-less plain spawn. fires for EITHER cause — an absent pty addon OR a
  // host that cannot open a socket (no getuid → socketPath null, e.g. Windows) —
  // each with the concrete fix named (rule.require.errors-name-the-fix). a caller
  // who explicitly does not want a socket (`--no-socket`, or a non-interactive,
  // non-json run) never reaches here: wantsSocket is false, so this check is skipped
  const socketOmissionReason = computeCloneSocketOmissionReason({
    wantsSocket,
    socketEligible,
    ptyModule,
  });
  // ⚠️ all three diagnostics are read EAGERLY even though only two of the four rows render
  //   `rhachetRealpath` — do NOT gate the read on the row, which would put a second owner
  //   on a predicate `asCloneSocketOmissionReasonError` already holds
  if (socketOmissionReason !== null)
    throw asCloneSocketOmissionReasonError({
      socketOmissionReason,
      ptyPlatformSupport: getPtyPlatformSupportFromProcess(),
      hostTuple: getPtyHostTupleFromProcess(),
      rhachetRealpath: getRhachetRealpathFromProcess(),
    });

  // stage the clone dir under a temp name, so a loser reaps before it is enumerable.
  // compose asCloneDirName so the `serial=` token has ONE owner (never a hand-rebuilt
  // literal) — the dot-prefix + uuid + `.tmp` mark it non-enumerable + collision-free
  const tempDir = join(
    actorDir,
    'clones',
    `.${asCloneDirName({ serial })}.${getUuid()}.tmp`,
  );
  mkdirSync(tempDir, { recursive: true });

  // the brain dir exists before the spawn, so its birth precedes every clone of it
  // and the history link routes this clone to it (D8)
  mkdirSync(brainDir, { recursive: true });

  // capture the spawn instant ONCE, BEFORE the spawn, and reuse it for BOTH the
  // persisted identity and the history-link window below. a second now() taken
  // AFTER the pty spawn's real wall-clock cost could fall outside
  // CLONE_SPAWN_WINDOW_TOLERANCE_MS and miss a genuinely in-window transcript — and
  // a say-only clone (never `get`) would then keep an empty history forever, since
  // only `get` re-links off the persisted stamp
  const spawnedAt = now();

  // spawn the brain — through the pty (socket) or plain (fallback)
  //
  // ⚠️ the reap is the CALLER's, and it is unconditional. the staged dir was created
  //   before the spawn, so it must not survive a failure of any party — the same reap
  //   the slug-race loser below performs, minus the spawn it never got. `genCloneSpawn`
  //   deliberately reaps naught, so this dir's lifecycle has ONE owner
  const spawn: CloneSpawnHandle = await genCloneSpawn(
    {
      command: input.command,
      args: input.args,
      cwd: input.cwd,
      serial,
      brainDir,
      socketPath,
      socketEligible,
      pty: ptyModule,
      emulator: emulatorModule,
      depth: input.depth,
    },
    {
      // the mode's ONE consequence — which host wires the child to the world. a
      // `watch` or `await` host mirrors into the enroller's streams and pumps its
      // stdin; an `async` host has no reader for those streams, so every such wire is
      // dropped and the trace sink takes the output. all three take the same pty and
      // the same socket (`define.invariant.clone-attendance-is-a-mode-never-a-reach`)
      //
      // 🔴 .why `await` MUST land on the mirrored side = its child prints one answer
      //   and exits, and that answer is owed to the caller's stdout. a detached host
      //   discards the mirror, so the answer would reach the trace sink and nobody else
      //   (`isBrainCliPrintMode`)
      host:
        context?.host ??
        (input.mode === 'async'
          ? genPtyCloneHostDetached({
              // 🔴 the mirror is DISCARDED, never sent to stderr. a detached host has
              //   no live reader for the clone's screen — `get` reads it off the screen
              //   feed, which taps the same pty data independently. to write it to
              //   stderr instead floods whatever inherited that fd: measured
              //   2026-09-16, the clone's whole TUI redraw poured into the caller that
              //   had merely asked for an address
              writeOut: () => undefined,
            })
          : genPtyCloneHostFromProcess()),
    },
  ).catch((error: unknown) => {
    delCloneStagedDir({ cloneDir: tempDir });
    throw error;
  });

  // persist the identity AFTER the spawn, so hostPid names the SPAWNED CHILD
  // (spawn.pid) — never the enroll wrapper (process.pid). the orphan-verdict
  // safety check asks "is the RECORDED pid still the same live brain?"; a wrapper
  // pid would make that check read a killed-wrapper as "not alive" and report
  // orphan=false in the exact SIGKILL scenario the feature exists to catch.
  // spawnedAt stays the PRE-spawn stamp above (the history-link window depends on it)
  setCloneIdentity({
    cloneDir: tempDir,
    serial,
    slug: input.slug,
    socketEligible,
    spawnedAt,
    hostHash: getHomeHash(),
    hostPid: spawn.pid,
    hostPidStartedAt: now(),
  });

  // claim the global slug index AFTER the spawn, BEFORE the rename
  if (input.slug !== null) {
    try {
      setCloneSlugIndex({
        actorsRoot,
        slug: input.slug,
        actorHash: hash,
        serial,
      });
    } catch (error) {
      // a concurrent racer won the slug — reap this loser's whole spawn + dir
      await delCloneSpawn({
        spawn,
        socketPath,
        dir: tempDir,
      });
      throw error;
    }
  }

  // promote the temp dir into place — now the serial dir is enumerable
  renameSync(tempDir, cloneDir);

  // write the global serial index (AFTER the rename, so the target dir is real) —
  // turns a reach-by-serial into one readlink instead of a full-actor scan. a serial
  // is unique + fresh, so this is a plain findsert (no collision, no reap)
  setCloneSerialIndex({ actorsRoot, actorHash: hash, serial });

  // link the brain's own transcript (best-effort; a later `get` re-links). the SAME
  // spawnedAt the identity persisted, so the window here matches the one `get` reuses.
  // the brain dir comes through the same call `get` makes, so the two never disagree
  genCloneHistoryLink({
    cloneDir,
    actorsRoot,
    brainDir: getCloneBrainDir({ actorDir, spawnedAt }),
    cwd: input.cwd,
    brain: input.brain,
    spawnedAt,
  });

  // hydrate the on-disk clone into its full domain shape
  const clone = getOneCloneHydrated({
    cloneDir,
    actorsRoot,
    repoPath,
    actorHash: hash,
  })!;

  return {
    outcome: decision === 'rebind' ? 'rebound' : 'baked',
    clone,
    spawn,
  };
};
