import { asStubResidueCount } from './asStubResidueCount';
import { getAllResidueTestRepoDirs } from './getAllResidueTestRepoDirs';
import { getOnePsTable } from './getOnePsTable';

/**
 * .what = counts what earlier runs of this checkout left on the box: test repo dirs minted
 *   straight in the os temp root, and brain stubs alive past the cap every stub now carries
 * .why = a box that ran the suite before this fix holds a pile no run of today adds to, and no
 *   run of today may reap: the residue carries no id this run minted. the count lets the run
 *   say so, so a reader does not mistake the old pile for a fix that failed
 *
 * .note = a stub is residue only once it is older than any stub of today could be (the cap plus
 *   a margin), and only when its argv names this checkout — a peer worktree's stubs are not ours
 * .note = a ps that fails throws (`getOnePsTable`), so an unread box never reads as a clean one
 */
export const getOneResidueFromBefore = async (input: {
  repoRoot: string;
  tmpRoot: string;
  stubAgeMinSeconds: number;
}): Promise<{ dirs: number; stubs: number }> => {
  // the dirs: test repos an earlier run minted in the os temp root
  const dirs = getAllResidueTestRepoDirs({ tmpRoot: input.tmpRoot }).length;

  // the stubs: this checkout's, older than any stub of today
  const stubs = asStubResidueCount({
    psTable: await getOnePsTable({ args: ['-eo', 'etime=,args='] }),
    stubPath: `${input.repoRoot}/src/.test/assets/stubBrainCli.cjs`,
    stubAgeMinSeconds: input.stubAgeMinSeconds,
  });

  return { dirs, stubs };
};
