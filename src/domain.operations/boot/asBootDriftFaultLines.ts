import { basename } from 'node:path';
import type { BootDriftFault } from './BrainDirBootRender';

/**
 * .what = the stderr block for drift faults a render met outside `rhx init`: one row per fault,
 *         and the fix
 * .why = an enroll re-renders the actor's boot, and with it every revision's drift; a fault
 *        there leaves live clones on a stale drift, so it is said aloud, never dropped
 * .note = empty for no fault, so a clean render says naught
 */
export const asBootDriftFaultLines = (input: {
  faults: BootDriftFault[];
}): string[] => {
  if (input.faults.length === 0) return [];
  return [
    '💥 MalfunctionError: a boot drift was not written',
    ...input.faults.map(
      (fault) => `   ├─ ✗ ${basename(fault.revisionDir)} ${fault.reason}`,
    ),
    '   └─ fix: run `rhx init` to re-write every drift',
  ];
};
