import { asErrorClassText } from '@src/utils/asErrorClassText';
import { asTreeBranch } from '@src/utils/asTreeBranch';

import { asEnrolledActorHookSyncRow } from './asEnrolledActorHookSyncRow';

/**
 * .what = the leaf that says what happened to a faulted or skipped actor: `error = <class>:
 *   <message>` or `skipped = <reason>`; none for a change
 * .why = the row holds the actor alone, so its detail is a subbranch, never a `:` on the row
 *   (rule.forbid.colons-in-stdout)
 */
const asOutcomeLeaves = (input: {
  outcome: { changes: string } | { error: Error } | { skipped: string };
}): { key: string; value: string }[] => {
  if ('error' in input.outcome)
    return [
      { key: 'error', value: asErrorClassText({ error: input.outcome.error }) },
    ];
  if ('skipped' in input.outcome)
    return [{ key: 'skipped', value: input.outcome.skipped }];
  return [];
};

/**
 * .what = the whole `🧢 apply hooks to enrolled actors` block: the header, one row per actor,
 *   and beneath a faulted row its details: the actor's roles, the fault's path, the fix
 * .why = one pure owner of the block's shape, so every variant (a change, a fault, a skip) is
 *   pinned by a snapshot (rule.forbid.snapshot-visual-blemishes)
 *
 * .note = no actor → no block; the caller prints naught
 * .note = each detail arrives as a `{ key, value }` pair and is formatted here as a
 *   `key = value` subbranch, never `key: value` (rule.forbid.colons-in-stdout); the caller
 *   cannot pick the separator, so every recomposition holds the shape
 */
export const asEnrolledActorsHookSyncLines = (input: {
  actors: {
    actorExid: string;
    outcome: { changes: string } | { error: Error } | { skipped: string };
    details: { key: string; value: string }[];
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

      // what went wrong leads the leaves, then the caller's details
      const leaves = [
        ...asOutcomeLeaves({ outcome: actor.outcome }),
        ...actor.details,
      ];
      return [
        `   ${branch} ${asEnrolledActorHookSyncRow({ actorExid: actor.actorExid, outcome: actor.outcome })}`,
        ...leaves.map((detail, detailIndex) => {
          const { branch: detailBranch } = asTreeBranch({
            index: detailIndex,
            count: leaves.length,
          });
          return `   ${stem}${detailBranch} ${detail.key} = ${detail.value}`;
        }),
      ];
    }),
  ];
};
