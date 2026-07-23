import type { RoleDelta } from '@src/domain.objects/RoleDelta';

/**
 * .what = derives the apply mode of a homogeneous RoleDelta list
 * .why = consumers branch on mode — `absolute` replaces the whole set, `incremental`
 *        patches the current/default set. getRoleDeltas guarantees the list is
 *        homogeneous, so a single delta's kind decides the mode.
 *
 * .note = an empty list reads as `absolute` (replace with an empty set); callers that
 *   forbid empty specs reject upstream (getRoleDeltas throws on an empty token list).
 * .note = pure transformer — no i/o, deterministic.
 */
export const getRoleDeltaMode = (input: {
  deltas: RoleDelta[];
}): 'absolute' | 'incremental' =>
  input.deltas.some((delta) => delta.kind !== 'absolute')
    ? 'incremental'
    : 'absolute';
