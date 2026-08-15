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
import { asCloneDirName } from './asCloneDirName';
import {
  type CloneSlugClaimState,
  computeCloneSlugDecision,
} from './computeCloneSlugDecision';
import { computeCloneSocketFallback } from './computeCloneSocketFallback';
import { delCloneSpawn } from './delCloneSpawn';
import { genCloneHistoryLink } from './genCloneHistoryLink';
import { genCloneSerial } from './genCloneSerial';
import { getCloneDir } from './getCloneDir';
import { getCloneReachState } from './getCloneReachState';
import { getCloneSocketPath } from './getCloneSocketPath';
import { getOneCloneByRef } from './getOneCloneByRef';
import { getOneCloneHydrated } from './getOneCloneHydrated';
import { genBrainCliPlainClone } from './pty/genBrainCliPlainClone';
import {
  genBrainCliPtyClone,
  type PtyCloneHost,
} from './pty/genBrainCliPtyClone';
import { genPtyCloneHostFromProcess } from './pty/genPtyCloneHostFromProcess';
import { getPtyModuleOrNull, type PtyModule } from './pty/getPtyModuleOrNull';
import { isCloneSocketAvailable } from './pty/isCloneSocketAvailable';
import { isCloneSocketEligible } from './pty/isCloneSocketEligible';
import { setCloneIdentity } from './setCloneIdentity';
import { setCloneSerialIndex } from './setCloneSerialIndex';
import { setCloneSlugIndex } from './setCloneSlugIndex';

/**
 * .what = a handle to a live spawn — the caller forwards its exit and can dispose
 */
export interface CloneSpawnHandle {
  socketPath: string | null;
  pid: number;
  waitForExit: Promise<number>;
  dispose: () => Promise<void>;
}

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
    interactive: boolean;
    noSocket: boolean;
  },
  context?: {
    pty?: PtyModule | null;
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

  // does a socket make sense here, and can the pty carry one on this host?
  const wantsSocket = isCloneSocketEligible({
    brain: input.brain,
    interactive: input.interactive,
    noSocket: input.noSocket,
  });
  const ptyModule =
    context?.pty !== undefined ? context.pty : getPtyModuleOrNull();
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
  const socketFallback = computeCloneSocketFallback({
    wantsSocket,
    socketEligible,
    ptyModule,
  });
  if (socketFallback !== null)
    return ConstraintError.throw(
      socketFallback === 'pty-absent'
        ? 'the reach socket is unavailable — node-pty failed to load'
        : 'the reach socket is unavailable — this host cannot open a unix socket',
      {
        socketFallback,
        hint:
          socketFallback === 'pty-absent'
            ? 'run `pnpm rebuild node-pty` to enable it, or pass --no-socket to enroll without one'
            : 'run on a POSIX host with a runtime dir, or pass --no-socket to enroll without one',
      },
    );

  // stage the clone dir under a temp name, so a loser reaps before it is enumerable.
  // compose asCloneDirName so the `serial=` token has ONE owner (never a hand-rebuilt
  // literal) — the dot-prefix + uuid + `.tmp` mark it non-enumerable + collision-free
  const tempDir = join(
    actorDir,
    'clones',
    `.${asCloneDirName({ serial })}.${getUuid()}.tmp`,
  );
  mkdirSync(tempDir, { recursive: true });

  // capture the spawn instant ONCE, BEFORE the spawn, and reuse it for BOTH the
  // persisted identity and the history-link window below. a second now() taken
  // AFTER the pty spawn's real wall-clock cost could fall outside
  // CLONE_SPAWN_WINDOW_TOLERANCE_MS and miss a genuinely in-window transcript — and
  // a say-only clone (never `get`) would then keep an empty history forever, since
  // only `get` re-links off the persisted stamp
  const spawnedAt = now();

  // spawn the brain — through the pty (socket) or plain (fallback)
  const spawn: CloneSpawnHandle =
    socketEligible && ptyModule !== null && socketPath !== null
      ? await genBrainCliPtyClone(
          {
            command: input.command,
            args: input.args,
            cwd: input.cwd,
            serial,
            socketPath,
          },
          {
            pty: ptyModule,
            host: context?.host ?? genPtyCloneHostFromProcess(),
          },
        )
      : genBrainCliPlainClone({
          command: input.command,
          args: input.args,
          cwd: input.cwd,
          serial,
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
  // spawnedAt the identity persisted, so the window here matches the one `get` reuses
  genCloneHistoryLink({
    cloneDir,
    actorsRoot,
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
