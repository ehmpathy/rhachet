import { asBootDriftFaultRow } from './asBootDriftFaultRow';
import type { BootDriftFault } from './BrainDirBootRender';

/**
 * .what = the stderr block for drift faults a render met outside `rhx init`: one row per fault,
 *         and the fix
 * .why = an enroll re-renders the actor's boot, and with it every revision's drift; a fault
 *        there leaves live clones on a stale drift, so it is said aloud, never dropped
 * .note = empty for no fault, so a clean render says naught
 * .note = a 🟡 caution, never a 💥 error frame: the enroll survives the fault, since its own clone
 *         boots a fresh revision, so the exit stays a success and the glyph must agree with it
 */
export const asBootDriftFaultLines = (input: {
  faults: BootDriftFault[];
}): string[] => {
  if (input.faults.length === 0) return [];
  return [
    '🟡 a boot drift was not written; this clone still spawns, but live clones keep a stale drift',
    ...input.faults.map((fault) => `   ├─ ${asBootDriftFaultRow({ fault })}`),
    '   └─ to fix, run `rhx init`, which re-writes every drift',
  ];
};
