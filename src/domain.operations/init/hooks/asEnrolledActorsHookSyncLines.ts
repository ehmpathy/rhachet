import { asTreeBranch } from '@src/utils/asTreeBranch';

import { asEnrolledActorHookSyncRow } from './asEnrolledActorHookSyncRow';

/**
 * .what = the whole `🧢 apply hooks to enrolled actors` block: the header, one row per actor,
 *   and beneath a faulted row the fault's hint
 * .why = one pure owner of the block's shape, so every variant (a change, a fault) is pinned
 *   by a snapshot (rule.forbid.snapshot-visual-blemishes)
 *
 * .note = no actor → no block; the caller prints naught
 * .note = each `claudeMdExcludes` entry the derivation dropped hangs beneath its actor row, so a
 *   cleanup of a committed file (a per-machine home path) is never silent
 */
export const asEnrolledActorsHookSyncLines = (input: {
  actors: {
    actorExid: string;
    outcome: { changes: string } | { error: unknown };
    excludesDropped: string[];
    hint: string | null;
  }[];
}): string[] => {
  if (input.actors.length === 0) return [];
  return [
    '🧢 apply hooks to enrolled actors...',
    ...input.actors.flatMap((actor, actorIndex) => {
      const { branch, stem } = asTreeBranch({
        index: actorIndex,
        count: input.actors.length,
      });

      // each dropped exclude, then the fault's fix, hang beneath the actor row
      // .note = the derivation drops only absolute entries, so one tail fits every drop
      const heads = [
        ...actor.excludesDropped.map(
          (pattern) =>
            `claudeMdExcludes dropped ${pattern} — an absolute path; the excludes keep only portable globs`,
        ),
        ...(actor.hint ? [`hint = ${actor.hint}`] : []),
      ];
      return [
        `   ${branch} ${asEnrolledActorHookSyncRow({ actorExid: actor.actorExid, outcome: actor.outcome })}`,
        ...heads.map((head, headIndex) => {
          const { branch: headBranch } = asTreeBranch({
            index: headIndex,
            count: heads.length,
          });
          return `   ${stem}${headBranch} ${head}`;
        }),
      ];
    }),
  ];
};
