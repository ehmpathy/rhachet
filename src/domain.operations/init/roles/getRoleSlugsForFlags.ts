import type { RoleDelta } from '@src/domain.objects/RoleDelta';
import { getRoleDeltaMode } from '@src/domain.operations/roles/deltas/getRoleDeltaMode';
import { getRoleDeltasOfKind } from '@src/domain.operations/roles/deltas/getRoleDeltasOfKind';

/**
 * .what = the unsigiled role slugs that downstream flags (--keys, --prep) act on
 * .why = those flags never take the sigiled +/- tokens; this picks the right
 *   slug list for each delta mode so the invokeInit orchestrator stays declarative
 *
 * .note = a slug keeps its focus (`mechanic::flow`): `--prep` writes it into the
 *   replay. a caller that needs the role alone (a link, a keyrack read) strips it
 *
 * .note = absolute mode => the replacement members; incremental mode => the
 *   additions (a `--keys`/`--prep` flag extends the enrolled roles, so the
 *   removed roles are irrelevant to it)
 * .note = pure transformer — no i/o, deterministic.
 */
export const getRoleSlugsForFlags = (input: {
  deltas: RoleDelta[] | null;
}): string[] => {
  const { deltas } = input;
  if (deltas === null) return [];
  const mode = getRoleDeltaMode({ deltas });
  if (mode === 'absolute')
    return getRoleDeltasOfKind({ deltas, kind: 'absolute' });
  return getRoleDeltasOfKind({ deltas, kind: 'addition' });
};
