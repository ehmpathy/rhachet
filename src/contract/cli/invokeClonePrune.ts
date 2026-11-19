import type { Command } from 'commander';
import { ConstraintError, MalfunctionError } from 'helpful-errors';

import type { CloneOndisk } from '@src/domain.objects/CloneOndisk';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { getActorsRootDir } from '@src/domain.operations/actor/enrolled/getActorsRootDir';
import { getAllActorsOndisk } from '@src/domain.operations/actor/enrolled/getAllActorsOndisk';
import { delActorBootRevision } from '@src/domain.operations/boot/delActorBootRevision';
import { asActorRef } from '@src/domain.operations/clone/asActorRef';
import { asClonePruneView } from '@src/domain.operations/clone/cli/asClonePruneView';
import { delClone } from '@src/domain.operations/clone/delClone';
import { getAllBootRevisionsUnreferenced } from '@src/domain.operations/clone/getAllBootRevisionsUnreferenced';
import { getAllClonesForActor } from '@src/domain.operations/clone/getAllClonesForActor';
import { getAllClonesGroupedByActor } from '@src/domain.operations/clone/getAllClonesGroupedByActor';
import { getAllClonesPrunable } from '@src/domain.operations/clone/getAllClonesPrunable';
import { getOneActorOndiskByRef } from '@src/domain.operations/clone/getOneActorOndiskByRef';
import { getOneRepoPath } from '@src/infra/host/getOneRepoPath';

import { asCliOutputMode } from './asCliOutputMode';
import { getCliInvocationArgs } from './getCliInvocationArgs';
import { renderCliOutput } from './renderCliOutput';
import { withCliOutputErrors } from './withCliOutputErrors';

const UNIT_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/**
 * .what = parse the `--older-than` flag into a millisecond age gate, or null
 * .why = a human bounds a prune to clones dead for at least a while; `<N><unit>`
 *   (s|m|h|d) is the plainest form, and any other value fails loud with the valid
 *   shape (rule.require.errors-name-the-fix). absent = no gate (prune all dead)
 */
const asOlderThanMs = (input: { raw: string | undefined }): number | null => {
  if (input.raw === undefined) return null;
  const match = /^(\d+)([smhd])$/.exec(input.raw);
  if (!match)
    throw new ConstraintError(`invalid --older-than "${input.raw}"`, {
      hint: 'use <N><unit> where unit is s|m|h|d, e.g. --older-than 1h',
    });
  return Number(match[1]) * UNIT_MS[match[2]!]!;
};

/**
 * .what = parse the `--mode` flag into plan (default, preview) or apply (commit)
 * .why = prune is safe-by-default: the bare command PREVIEWS what it would reap,
 *   and only `--mode apply` deletes — a slip never destroys a clone record
 *   (rule.require.safe-by-default)
 */
const asPruneMode = (input: { raw: string }): 'plan' | 'apply' => {
  if (input.raw === 'plan' || input.raw === 'apply') return input.raw;
  throw new ConstraintError(`invalid --mode "${input.raw}"`, {
    hint: 'use --mode plan (default, preview) or --mode apply (remove)',
  });
};

/**
 * .what = the clones in scope — one actor's when a `@<exid-prefix>` is given, else
 *   every actor's, flattened to a single list
 * .why = the scoped and the all-actors paths are distinct; an early return keeps
 *   each a straight-line narrative (rule.require.narrative-flow)
 */
const getClonesInScope = (input: {
  repoPath: string;
  actor: string | undefined;
}): CloneOndisk[] => {
  if (input.actor !== undefined) {
    const found = getOneActorOndiskByRef({
      repoPath: input.repoPath,
      ref: asActorRef({ raw: input.actor }),
    });
    return getAllClonesForActor({
      actorDir: getActorOndiskDir({
        repoPath: found.repoPath,
        exid: found.exid,
      }),
      actorsRoot: getActorsRootDir({ repoPath: found.repoPath }),
      repoPath: found.repoPath,
      actorExid: found.exid,
    });
  }

  return getAllClonesGroupedByActor({ repoPath: input.repoPath }).flatMap(
    (group) => group.clones,
  );
};

/**
 * .what = the actors in scope — the one a `@<exid-prefix>` names, else every actor on disk
 * .why = a revision outlives its clones, so an actor with no clone left may still hold one;
 *   the sweep walks actors, never only the actors the clone list happened to name
 */
const getActorsInScope = (input: {
  repoPath: string;
  actor: string | undefined;
}): { repoPath: string; exid: string }[] => {
  if (input.actor !== undefined)
    return [
      getOneActorOndiskByRef({
        repoPath: input.repoPath,
        ref: asActorRef({ raw: input.actor }),
      }),
    ];
  return getAllActorsOndisk({ repoPath: input.repoPath });
};

/**
 * .what = register `rhx clone prune [@<actor>] [--older-than <dur>]
 *   [--mode plan|apply]` on the clone command group
 * .why =
 *   - crons + headless enrolls accrue DEAD clones over time; this reaps them so
 *     `list` stays legible and the `.agent/.actors/` tree does not grow unbounded
 *   - it NEVER touches a LIVE clone (it answers a say) or a DEAF clone (still an
 *     active process), and never a cross-host clone (may be alive elsewhere) — only
 *     a finished, same-host DEAD clone is reaped (getAllClonesPrunable guards this)
 *   - PLAN-by-default previews the reap; `--mode apply` commits it
 *
 * .note = `--output json` emits the same {mode,count,clones} a machine reads as
 *   fields, so a cron can prune + parse the result, never a scrape of the tree
 */
export const invokeClonePrune = ({ clone }: { clone: Command }): void => {
  clone
    .command('prune [actor]')
    .description(
      'reap dead clones (all, or scoped to one actor by @<exid-prefix>, e.g. @repo=ambient or @hash=9c1e)',
    )
    .option(
      '--older-than <dur>',
      'only reap clones spawned at least this long ago (e.g. 1h, 30m); measures age since spawn, not since death (a clone has no recorded death time)',
    )
    .option(
      '--mode <mode>',
      'plan (default, preview) or apply (remove)',
      'plan',
    )
    .option('--output <mode>', 'output mode: tree (default) or json', 'tree')
    .action(
      async (
        actor: string | undefined,
        opts: { olderThan?: string; mode: string; output?: string },
      ) => {
        await withCliOutputErrors({
          args: getCliInvocationArgs({ command: clone }),
          outputRaw: opts.output,
          run: async () => {
            const outputMode = asCliOutputMode({ raw: opts.output });
            const mode = asPruneMode({ raw: opts.mode });
            const olderThanMs = asOlderThanMs({ raw: opts.olderThan });
            const repoPath = getOneRepoPath({ from: process.cwd() });

            // enumerate the clones in scope, then filter to the prunable (dead,
            // same-host, past the age gate) — a live/deaf/foreign clone never enters
            const clones = getClonesInScope({ repoPath, actor });
            const prunable = await getAllClonesPrunable({
              clones,
              olderThanMs,
            });

            // apply reaps each; plan only previews. the reap is per-clone off its
            // own actor's root, so a multi-actor sweep removes each cleanly. it is
            // RESILIENT: one reap that fails (a permission-denied stale dir) does NOT
            // abort the batch — reap the rest, then fail loud with the serials it could
            // not reap, so a batch cleanup never leaves the other dead clones behind on
            // one bad dir, and never silently swallows the failure (rule.forbid.failhide)
            // .note = deliberate mutation — two accumulators local to this action: the
            //   reaped set (what actually left disk) and the failures; neither escapes
            const reaped: CloneOndisk[] = [];
            const failed: { serial: string; message: string }[] = [];
            if (mode === 'apply')
              for (const dead of prunable) {
                try {
                  delClone({
                    clone: dead,
                    actorsRoot: getActorsRootDir({
                      repoPath: dead.actor.repoPath,
                    }),
                  });
                  reaped.push(dead);
                } catch (error) {
                  failed.push({
                    serial: dead.serial,
                    message: error instanceof Error ? error.message : 'unknown',
                  });
                }
              }

            // the boot revisions no clone that stays refers to: in plan, past the clones
            // this prune would reap; in apply, past the clones it did reap. a revision a
            // clone still names (LIVE, DEAF, or a DEAD one this run did not reap) stays
            const clonesGone = mode === 'apply' ? reaped : prunable;
            const revisions = getActorsInScope({ repoPath, actor }).flatMap(
              (actorOndisk) => {
                const actorDir = getActorOndiskDir({
                  repoPath: actorOndisk.repoPath,
                  exid: actorOndisk.exid,
                });
                return getAllBootRevisionsUnreferenced({
                  actorDir,
                  serialsReaped: clonesGone
                    .filter((c) => c.actor.exid === actorOndisk.exid)
                    .map((c) => c.serial),
                }).map((hash) => ({ actor: actorOndisk.exid, actorDir, hash }));
              },
            );
            const revisionsReaped: typeof revisions = [];
            const revisionsFailed: {
              actor: string;
              hash: string;
              message: string;
            }[] = [];
            if (mode === 'apply')
              for (const revision of revisions) {
                try {
                  delActorBootRevision(revision);
                  revisionsReaped.push(revision);
                } catch (error) {
                  revisionsFailed.push({
                    actor: revision.actor,
                    hash: revision.hash,
                    message: error instanceof Error ? error.message : 'unknown',
                  });
                }
              }

            // the view shows what a plan WOULD reap, or in apply what actually WAS
            // reaped (never a clone still on disk — no false "pruned" render)
            const rowsShown = mode === 'apply' ? reaped : prunable;
            const view = asClonePruneView({
              rows: rowsShown.map((c) => ({
                serial: c.serial,
                slug: c.slug,
                spawnedAt: c.spawnedAt,
              })),
              revisions: (mode === 'apply' ? revisionsReaped : revisions).map(
                (r) => ({ actor: r.actor, hash: r.hash }),
              ),
              mode,
            });
            console.log(
              renderCliOutput({
                mode: outputMode,
                tree: view.tree,
                data: view.data,
              }),
            );

            // fail loud on any reap that could not complete — the batch reaped what it
            // could (shown above), and this surfaces the rest with a non-zero exit
            if (failed.length > 0)
              throw new MalfunctionError(
                `pruned ${reaped.length} clone(s), but ${failed.length} could not be reaped`,
                {
                  hint: `check filesystem permissions on the ${revisionsFailed.length > 0 ? 'clone and boot revision dirs' : 'clone dirs'}, then re-run \`rhx clone prune\``,
                  failed,
                  reapedSerials: reaped.map((c) => c.serial),
                  ...(revisionsFailed.length > 0 ? { revisionsFailed } : {}),
                },
              );
            if (revisionsFailed.length > 0)
              throw new MalfunctionError(
                `pruned ${reaped.length} clone(s), but ${revisionsFailed.length} boot revision(s) could not be reaped`,
                {
                  hint: 'check filesystem permissions on the boot revision dirs, then re-run `rhx clone prune`',
                  revisionsFailed,
                  reapedSerials: reaped.map((c) => c.serial),
                },
              );
          },
        });
      },
    );
};
