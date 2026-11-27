import { tmpdir } from 'node:os';

import { asResidueNotice } from './asResidueNotice';
import { getOneResidueFromBefore } from './getOneResidueFromBefore';

/**
 * .what = the age past which a brain stub of this checkout must predate the rhachet#748 hard cap
 * .why = every stub ends at its hard cap (20 min, `stubBrainCli.cjs`); a margin past it
 *   keeps a stub of a live run out of the count
 */
const STUB_AGE_MIN_SECONDS = 30 * 60;

/**
 * .what = prints a notice when earlier runs of this checkout left residue on the box
 * .why = a run of today adds to no pile, and may not reap one it did not mint. the notice says
 *   the pile is old, and names a cure that touches only what it names
 * .note = `emit*` names a procedure whose whole effect is a notice on stderr; it decides naught
 * .note = no pattern kill is proposed: a cmdline match reaches every process on the box, not
 *   only this checkout's (`rule.forbid.unscoped-process-kills`)
 * .note = the residue read and the stderr write are injectable, so a test can prove the wire
 */
export const emitResidueNotice = async (
  input: { repoRoot: string },
  context: {
    getOneResidueFromBefore: typeof getOneResidueFromBefore;
    stderr: { write: (text: string) => unknown };
  } = { getOneResidueFromBefore, stderr: process.stderr },
): Promise<void> => {
  const tmpRoot = tmpdir();
  const residue = await context.getOneResidueFromBefore({
    repoRoot: input.repoRoot,
    tmpRoot,
    stubAgeMinSeconds: STUB_AGE_MIN_SECONDS,
  });
  const notice = asResidueNotice({ ...residue, tmpRoot });
  if (notice === null) return;
  context.stderr.write(`${notice}\n`);
};
