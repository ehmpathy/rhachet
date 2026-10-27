import type { BrainDirOutsideRepoError } from '@src/domain.operations/actor/enrolled/BrainDirOutsideRepoError';

import type { asEnrolledActorsHookSyncLines } from './asEnrolledActorsHookSyncLines';

type ActorRow = Parameters<
  typeof asEnrolledActorsHookSyncLines
>[0]['actors'][number];

/**
 * .what = split the actor pass's settlements into the four lists the hook sync reports: the
 *   rows, the errors, the skips, and the read-only home files
 * .why = one settlement per actor, so each fault both pushes an error and renders a row; the
 *   split derives both from the one settlement, so neither can drift from the other
 */
export const asActorSettlementsSplit = (input: {
  settlements: {
    row: ActorRow;
    fault: Error | null;
    skip: BrainDirOutsideRepoError | null;
    targetReadonly: { path: string; landsAt: string } | null;
  }[];
}): {
  rows: ActorRow[];
  errors: { source: string; error: Error }[];
  skips: BrainDirOutsideRepoError[];
  targetsReadonly: { path: string; landsAt: string }[];
} => ({
  rows: input.settlements.map(({ row }) => row),
  errors: input.settlements.flatMap(({ row, fault }) =>
    fault ? [{ source: `sync:actor=${row.actorExid}`, error: fault }] : [],
  ),
  skips: input.settlements.flatMap(({ skip }) => (skip ? [skip] : [])),
  targetsReadonly: input.settlements.flatMap(({ targetReadonly }) =>
    targetReadonly ? [targetReadonly] : [],
  ),
});
