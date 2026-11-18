import type { Command } from 'commander';
import { ConstraintError, MalfunctionError } from 'helpful-errors';

import type { CloneOndisk } from '@src/domain.objects/CloneOndisk';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { asCloneAddressHuman } from '@src/domain.operations/clone/asCloneAddressHuman';
import { asCloneBootDriftLines } from '@src/domain.operations/clone/asCloneBootDriftLines';
import { asCloneRef } from '@src/domain.operations/clone/asCloneRef';
import { getCloneBootDrift } from '@src/domain.operations/clone/getCloneBootDrift';
import { getCloneDir } from '@src/domain.operations/clone/getCloneDir';
import { getOneCloneBootDriftNudge } from '@src/domain.operations/clone/getOneCloneBootDriftNudge';
import { getOneCloneByRef } from '@src/domain.operations/clone/getOneCloneByRef';
import { setCloneBootDriftTold } from '@src/domain.operations/clone/setCloneBootDriftTold';
import { getOneRepoPath } from '@src/infra/host/getOneRepoPath';
import { CLONE_ENV_KEYS } from '@src/utils/cloneEnvKeys';

import { getCliInvocationArgs } from './getCliInvocationArgs';
import { withCliOutputErrors } from './withCliOutputErrors';

/** the one hook moment this verb answers */
const WHEN_HOOK_ON_STOP = 'hook.onStop';

/**
 * .what = register `rhx clone boot drift` on the clone group
 * .why = a live clone takes its boot drift at its next compaction; this verb says how much drift
 *        a clone carries, to an editor or an enroller (`--of @:<x>`), and nudges the clone itself
 *        once its drift outgrows the threshold (`--when hook.onStop`)
 *
 * .note = the hook arm is declared by a role, never by rhachet (`rule.forbid.framework-owned-hooks`)
 * .note = the hook arm never blocks a stop by fault: a process that is no clone, or a clone from
 *         before boot drift, exits 0 silent; a fault exits 1 (a Stop hook's exit 1 never blocks);
 *         only a nudge exits 2, once per drift
 */
export const invokeCloneBoot = ({ clone }: { clone: Command }): void => {
  const boot = clone
    .command('boot')
    .description("inspect a clone's boot: drift");

  boot
    .command('drift')
    .description(
      'show the boot drift a clone carries since it spawned; with --when hook.onStop, nudge it once past the threshold',
    )
    .option('--of <address>', 'the clone to inspect, as @:<slug|serial>')
    .option(
      '--when <moment>',
      `the hook moment this runs at: ${WHEN_HOOK_ON_STOP}`,
    )
    .action(async (opts: { of?: string; when?: string }) => {
      await withCliOutputErrors({
        args: getCliInvocationArgs({ command: boot }),
        outputRaw: undefined,
        run: async () => {
          // refuse an unknown moment before any read
          if (opts.when !== undefined && opts.when !== WHEN_HOOK_ON_STOP)
            throw new ConstraintError(`unknown --when '${opts.when}'`, {
              hint: `the one moment is --when ${WHEN_HOOK_ON_STOP}`,
            });

          // the hook names no clone: it reads its own serial, so --of beside it is refused, never dropped
          if (opts.when === WHEN_HOOK_ON_STOP && opts.of !== undefined)
            throw new ConstraintError(
              `--of cannot ride --when ${WHEN_HOOK_ON_STOP}`,
              {
                hint: `the hook reads the clone it runs in; to inspect another clone, drop --when: rhx clone boot drift --of ${opts.of}`,
              },
            );

          // the hook arm: the clone itself, at its stop
          if (opts.when === WHEN_HOOK_ON_STOP) return runHookOnStop();

          // the inspector arm: the named clone, or this one
          return runInspect({ of: opts.of ?? null });
        },
      });
    });
};

/**
 * .what = the inspector arm: print one clone's drift tree on stdout
 * .why = an editor or enroller who meets a stale reply checks the clone in one command (case=6, case=7)
 */
const runInspect = (input: { of: string | null }): void => {
  // name the clone: --of, else this clone by its serial
  const serial = process.env[CLONE_ENV_KEYS.serial];
  const ref = (() => {
    if (input.of !== null) return asCloneRef({ raw: input.of });
    if (serial) return { by: 'serial' as const, serial };
    return null;
  })();
  if (ref === null)
    throw new ConstraintError('no clone named', {
      hint: 'name one with `--of @:<slug|serial>`; list clones with `rhx clone list`',
    });
  const repoPath = getOneRepoPath({ from: process.cwd() });
  const cloneFound = getOneCloneByRef({ repoPath, ref });
  if (cloneFound === null)
    throw new ConstraintError('no clone answers to that address', {
      address: input.of ?? `@:${serial}`,
      hint: 'list clones with `rhx clone list`',
    });

  // its drift, as a tree
  const drift = getCloneBootDrift(asCloneDirs({ clone: cloneFound }));
  console.log(
    asCloneBootDriftLines({
      for: 'inspect',
      address: asCloneAddressHuman(cloneFound),
      drift,
    }).join('\n'),
  );
};

/**
 * .what = the hook arm: nudge this clone once its drift outgrows the threshold
 * .why = a long-lived clone carries a large drift in memory; told once, it can compact or respawn (case=2)
 * .note = a constraint here would exit 2 and block the stop, so every fault is a malfunction
 */
const runHookOnStop = (): void => {
  // a process that is no clone has no spawn to drift from
  const serial = process.env[CLONE_ENV_KEYS.serial];
  if (!serial) return;

  try {
    // this clone, by its serial
    const repoPath = getOneRepoPath({ from: process.cwd() });
    const self = getOneCloneByRef({ repoPath, ref: { by: 'serial', serial } });
    if (self === null)
      throw new MalfunctionError(
        'the clone env serial names no on-disk clone',
        {
          serial,
        },
      );

    // silent unless a nudge is owed
    const dirs = asCloneDirs({ clone: self });
    const drift = getOneCloneBootDriftNudge(dirs);
    if (drift === null) return;

    // tell it once: latch first, so a fault in the print never repeats the block
    setCloneBootDriftTold({ cloneDir: dirs.cloneDir, drift: drift.drift });
    console.error(
      asCloneBootDriftLines({
        for: 'nudge',
        address: asCloneAddressHuman(self),
        drift,
      }).join('\n'),
    );
    process.exitCode = 2;
  } catch (error) {
    // a constraint would exit 2 and block the stop: recast it, under a message of its own
    if (error instanceof ConstraintError)
      throw new MalfunctionError(
        'the boot drift hook could not read this clone',
        { serial, cause: error },
      );
    throw error;
  }
};

/**
 * .what = the actor dir and clone dir of a clone
 */
const asCloneDirs = (input: {
  clone: CloneOndisk;
}): { actorDir: string; cloneDir: string } => {
  const actorDir = getActorOndiskDir({
    repoPath: input.clone.actor.repoPath,
    exid: input.clone.actor.exid,
  });
  return {
    actorDir,
    cloneDir: getCloneDir({ actorDir, serial: input.clone.serial }),
  };
};
