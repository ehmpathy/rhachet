import { given, then, when } from 'test-fns';

import { genBootSource } from './genBootSource';
import { getAllBriefCandidateFiles } from './getAllBriefCandidateFiles';

const ROOT = '/repo/.agent/repo=test/role=surfer';

const genSource = (input: { dirBriefs: string | null }) =>
  genBootSource({
    rootDir: ROOT,
    pathToSpec: `${ROOT}/boot.yml`,
    dirBriefs: input.dirBriefs,
    label: { base: 'surfer', prefix: 'role' },
    invocation: 'rhx roles boot --repo test --role surfer',
    coordinates: 'repo=test/role=surfer',
    specIsDeclared: true,
  });

describe('getAllBriefCandidateFiles', () => {
  given(
    '[case1] a role with a briefs dir, beside a render leftover that shares its name',
    () => {
      const allFiles = [
        `${ROOT}/briefs.next.4242.ab12/rule.require.wax.md`,
        `${ROOT}/briefs/rule.require.wax.md`,
        `${ROOT}/readme.md`,
      ];

      when('[t0] the candidates are taken', () => {
        const candidates = getAllBriefCandidateFiles({
          allFiles,
          source: genSource({ dirBriefs: `${ROOT}/briefs` }),
          blocklist: [],
        });

        then('only the briefs dir counts, never its peer', () => {
          expect(candidates).toEqual([`${ROOT}/briefs/rule.require.wax.md`]);
        });
      });
    },
  );

  given(
    '[case2] a manifest with no briefs dir, and a doc whose name opens with `skills`',
    () => {
      const allFiles = [
        `${ROOT}/readme.md`,
        `${ROOT}/skills.guide.md`,
        `${ROOT}/skills/wax.board.sh`,
        `${ROOT}/surf.guide.md`,
      ];

      when('[t0] the candidates are taken', () => {
        const candidates = getAllBriefCandidateFiles({
          allFiles,
          source: genSource({ dirBriefs: null }),
          blocklist: [],
        });

        then(
          'the skills dir is left out, and the doc is not mistaken for it',
          () => {
            expect(candidates).toEqual([
              `${ROOT}/skills.guide.md`,
              `${ROOT}/surf.guide.md`,
            ]);
          },
        );
      });
    },
  );
});
