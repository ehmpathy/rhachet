import { asTreeBranch } from '@src/utils/asTreeBranch';

import { asEnrolledActorHookSyncRow } from './asEnrolledActorHookSyncRow';

/**
 * .what = the whole `🧢 apply hooks to enrolled actors` block: the header, one row per actor,
 *   and beneath a faulted row the fault's hint
 * .why = one pure owner of the block's shape, so every variant (a change, a fault) is pinned
 *   by a snapshot (rule.forbid.snapshot-visual-blemishes)
 *
 * .note = no actor → no block; the caller prints naught
 */
export const asEnrolledActorsHookSyncLines = (input: {
  actors: {
    actorExid: string;
    outcome: { changes: string } | { error: unknown };
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

      // the fault's fix hangs beneath the actor row
      const heads = actor.hint ? [`hint: ${actor.hint}`] : [];
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
