import type { Command } from 'commander';
import { ConstraintError, MalfunctionError } from 'helpful-errors';

import type { CloneOndisk } from '@src/domain.objects/CloneOndisk';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { asBootDriftHookFault } from '@src/domain.operations/clone/asBootDriftHookFault';
import { asCloneAddressHuman } from '@src/domain.operations/clone/asCloneAddressHuman';
import { asCloneBootDriftLines } from '@src/domain.operations/clone/asCloneBootDriftLines';
import {
  asCloneRef,
  type CloneRef,
} from '@src/domain.operations/clone/asCloneRef';
import { getCloneDir } from '@src/domain.operations/clone/getCloneDir';
import { getOneCloneBootDrift } from '@src/domain.operations/clone/getOneCloneBootDrift';
import { getOneCloneByRef } from '@src/domain.operations/clone/getOneCloneByRef';
import { setCloneBootDriftNudgeTold } from '@src/domain.operations/clone/setCloneBootDriftNudgeTold';
import { getOneRepoPath } from '@src/infra/host/getOneRepoPath';
import { CLONE_ENV_KEYS } from '@src/utils/cloneEnvKeys';

import { asCliOutputMode, type CliOutputMode } from './asCliOutputMode';
import { getCliInvocationArgs } from './getCliInvocationArgs';
import { renderCliOutput } from './renderCliOutput';
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
export const invokeCloneBoot = (input: { clone: Command }): void => {
  const boot = input.clone
    .command('boot')
    .description("inspect a clone's boot — its drift");

  boot
    .command('drift')
    .description(
      'show the boot drift a clone carries since it spawned; with --when hook.onStop, nudge it once past the threshold',
    )
    .option('--of <address>', 'the clone to inspect, as @:<slug|serial>')
    .option(
      '--when <moment>',
      `the hook moment this runs at (${WHEN_HOOK_ON_STOP}); when absent, it inspects --of, else the clone it runs in`,
    )
    .option('--output <mode>', 'output mode: tree (default) or json')
    .action(async (opts: { of?: string; when?: string; output?: string }) => {
      await withCliOutputErrors({
        args: getCliInvocationArgs({ command: boot }),
        outputRaw: opts.output,
        run: async () => {
          // validate the output mode before any read
          const outputMode = asCliOutputMode({ raw: opts.output ?? 'tree' });

          // refuse an unknown moment before any read
          if (opts.when !== undefined && opts.when !== WHEN_HOOK_ON_STOP)
            throw new ConstraintError(`unknown --when '${opts.when}'`, {
              when: opts.when,
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

          // the hook speaks to the clone through its exit code and stderr, so --output beside it is refused
          if (opts.when === WHEN_HOOK_ON_STOP && opts.output !== undefined)
            throw new ConstraintError(
              `--output cannot ride --when ${WHEN_HOOK_ON_STOP}`,
              {
                hint: 'the hook answers by exit code and a stderr nudge; for json, inspect: rhx clone boot drift --of @:<slug|serial> --output json',
              },
            );

          // the hook arm: the clone itself, at its stop
          if (opts.when === WHEN_HOOK_ON_STOP) return runHookOnStop();

          // the inspector arm: the named clone, or this one
          return runInspect({ of: opts.of ?? null, outputMode });
        },
      });
    });
};

/**
 * .what = the inspector arm: print one clone's drift tree on stdout
 * .why = an editor or enroller who meets a stale reply checks the clone in one command (case=6, case=7)
 */
const runInspect = (input: {
  of: string | null;
  outputMode: CliOutputMode;
}): void => {
  // name the clone: --of, else this clone by its serial
  const serial = process.env[CLONE_ENV_KEYS.serial] ?? null;
  const ref = asCloneRefOfInspect({ of: input.of, serial });
  if (ref === null)
    throw new ConstraintError(
      'no clone is named, and this process runs in none',
      {
        hint: 'name one with `--of @:<slug|serial>`; list clones with `rhx clone list`',
      },
    );
  const repoPath = getOneRepoPath({ from: process.cwd() });
  const cloneFound = getOneCloneByRef({ repoPath, ref });
  if (cloneFound === null)
    throw new ConstraintError('no clone answers to that address', {
      address: input.of ?? `@:${serial}`,
      hint: 'list clones with `rhx clone list`',
    });

  // its drift, as a tree or as the same data in json
  const drift = getOneCloneBootDrift(asCloneDirs({ clone: cloneFound }));
  const address = asCloneAddressHuman(cloneFound);
  console.log(
    renderCliOutput({
      mode: input.outputMode,
      tree: asCloneBootDriftLines({ for: 'inspect', address, drift }).join(
        '\n',
      ),
      data: { address, serial: cloneFound.serial, drift },
    }),
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
          hint: 'the clone record is gone; respawn the clone with `rhx enroll`, or list clones with `rhx clone list`',
        },
      );

    // silent unless a nudge is owed; the op latches it as told before it returns
    const nudge = setCloneBootDriftNudgeTold({
      ...asCloneDirs({ clone: self }),
      address: asCloneAddressHuman(self),
    });
    if (nudge === null) return;

    // block this one stop, the nudge on stderr
    console.error(nudge.lines.join('\n'));
    process.exitCode = 2;
  } catch (error) {
    // a constraint would exit 2 and block the stop, so it is recast to exit 1
    throw asBootDriftHookFault({ error, serial });
  }
};

/**
 * .what = the clone the inspector names: --of, else the clone this process runs in, else none
 */
const asCloneRefOfInspect = (input: {
  of: string | null;
  serial: string | null;
}): CloneRef | null => {
  // an explicit address wins
  if (input.of !== null) return asCloneRef({ raw: input.of });

  // inside a clone, the clone itself
  if (input.serial) return { by: 'serial', serial: input.serial };

  // outside a clone, with no address, no clone is named
  return null;
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
