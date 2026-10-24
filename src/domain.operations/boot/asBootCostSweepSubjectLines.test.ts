import { given, then, useThen, when } from 'test-fns';

import { genSampleBootSpecCost as asCost } from '@src/.test/assets/genSampleBootSpecCost';

import { asBootCostSweepSubjectLines } from './asBootCostSweepSubjectLines';

describe('asBootCostSweepSubjectLines', () => {
  given('[case1] a spec that declares no subject', () => {
    when('[t0] the lines render', () => {
      then('naught renders', () => {
        expect(
          asBootCostSweepSubjectLines({
            one: asCost({ subjects: [] }),
            widthTokens: 6,
          }),
        ).toEqual([]);
      });
    });
  });

  given('[case2] a budgeted spec with two subjects', () => {
    when('[t0] the lines render', () => {
      const result = useThen('the lines are composed', () => ({
        lines: asBootCostSweepSubjectLines({
          one: asCost({
            tokens: 65_110,
            budget: 30_000,
            subjects: [
              { slug: '101', tokens: 4_200 },
              { slug: 'arch', tokens: 31_000 },
            ],
          }),
          widthTokens: 6,
        }),
      }));

      then('each subject reads as the focus token an enroll takes', () => {
        expect(result.lines[0]).toContain('::101');
        expect(result.lines[1]).toContain('::arch');
      });

      then('the last subject closes the branch', () => {
        expect(result.lines[0]).toContain('├─');
        expect(result.lines[1]).toContain('└─');
      });

      then('a focus over the spec cap is marked, one within it is not', () => {
        expect(result.lines[0]).not.toContain('🟡');
        expect(result.lines[1]).toContain('🟡');
      });

      then('the lines match their snapshot', () => {
        expect(result.lines.join('\n')).toMatchSnapshot();
      });
    });
  });

  given('[case3] an unbudgeted spec with one subject', () => {
    when('[t0] the lines render', () => {
      then('the row states its absent cap, as its spec row does', () => {
        const lines = asBootCostSweepSubjectLines({
          one: asCost({ subjects: [{ slug: 'flow', tokens: 900 }] }),
          widthTokens: 4,
        });
        expect(lines).toEqual(['   │  └─  900 tokens (no budget)  any::flow']);
      });
    });
  });

  given('[case4] a spec whose path names no role', () => {
    when('[t0] the lines render', () => {
      then(
        'the row shows the bare subject slug, with no dangled separator',
        () => {
          const lines = asBootCostSweepSubjectLines({
            one: asCost({
              pathToSpec: '/repo/.behavior/v2026_10_21.demo/boot.yml',
              subjects: [{ slug: 'review', tokens: 900 }],
            }),
            widthTokens: 4,
          });
          expect(lines).toEqual(['   │  └─  900 tokens (no budget)  review']);
        },
      );
    });
  });
});
