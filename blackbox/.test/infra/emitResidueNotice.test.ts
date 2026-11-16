import { given, then, useBeforeAll, when } from 'test-fns';

import { emitResidueNotice } from './emitResidueNotice';

/**
 * .what = runs the notice against a stand-in residue count, and collects what it wrote
 */
const genNoticeRun = async (input: {
  residue: { dirs: number; stubs: number };
}): Promise<{ written: string[] }> => {
  const written: string[] = [];
  await emitResidueNotice(
    { repoRoot: '/repo' },
    {
      getOneResidueFromBefore: async () => input.residue,
      stderr: { write: (text: string) => written.push(text) },
    },
  );
  return { written };
};

describe('emitResidueNotice', () => {
  given('[case1] earlier runs left residue', () => {
    when('[t0] the notice is emitted', () => {
      const scene = useBeforeAll(() => genNoticeRun({ residue: { dirs: 3, stubs: 1 } }));

      then('it writes the notice once, to stderr', () => {
        expect(scene.written).toHaveLength(1);
        expect(scene.written[0]).toContain('3 rhachet-test-* test repo dirs');
        expect(scene.written[0]).toContain('1 stubBrainCli.cjs processes of this checkout');
      });
    });
  });

  given('[case2] the box holds no residue', () => {
    when('[t0] the notice is emitted', () => {
      const scene = useBeforeAll(() => genNoticeRun({ residue: { dirs: 0, stubs: 0 } }));

      then('it writes naught', () => {
        expect(scene.written).toEqual([]);
      });
    });
  });
});
