import { given, then, when } from 'test-fns';

import { asBootCostSweepReachLines } from './asBootCostSweepReachLines';

/**
 * .what = clamps that the sweep DISCLOSES its bound
 * .why = `--all` is a completeness claim the sweep cannot honor — it walks a glob policy, and
 *        a manifest may sit at any path in the repo. so the honest form is a stated bound, and
 *        an unstated one turns *"no boot specs found"* into a sentence a reader acts on
 *        wrongly (`rule.forbid.failhide`).
 *
 * 🔴 .note = the sharpest row is the LAST: the disclosure must name a way FORWARD, never only
 *   a limit. a reader whose spec sits outside the swept set needs the command that costs it,
 *   or the bound is a dead end dressed as a courtesy (`rule.require.errors-name-the-fix`).
 */
describe('asBootCostSweepReachLines', () => {
  given('[case1] the four globs the sweep walks', () => {
    const globs = [
      '.agent/repo=*/role=*/boot.yml',
      '.behavior/*/boot.yml',
      '.route/*/boot.yml',
      'src/domain.roles/*/boot.yml',
    ];

    when('[t0] rendered', () => {
      then('every glob the sweep walked is named', () => {
        const lines = asBootCostSweepReachLines({ globs });

        // 🔴 each one, not a count. a reader whose spec sits outside the set can only tell by
        //    a read of the set itself
        globs.forEach((glob) =>
          expect(lines.some((line) => line.includes(glob))).toEqual(true),
        );
      });

      then('the bound is stated as a bound, never implied', () => {
        const lines = asBootCostSweepReachLines({ globs });

        expect(lines.join('\n')).toContain('not swept');
      });

      then('it names the way forward for a spec outside the set', () => {
        // 🔴 the row that parts a disclosure from a dead end
        const lines = asBootCostSweepReachLines({ globs });

        expect(lines.join('\n')).toContain('roles cost --what');
      });

      then(
        'it renders as a tree, so it reads beside the roster above it',
        () => {
          const lines = asBootCostSweepReachLines({ globs });

          expect(lines.filter((line) => line.includes('├─'))).toHaveLength(3);
          expect(lines.filter((line) => line.includes('└─'))).toHaveLength(2);
        },
      );
    });
  });

  given('[case2] a single glob', () => {
    when('[t0] rendered', () => {
      then('the lone entry takes the terminal elbow', () => {
        // the bound from BELOW on the elbow rule — a one-item list has no `├─` to draw
        const lines = asBootCostSweepReachLines({ globs: ['only/boot.yml'] });

        expect(lines.some((line) => line.includes('└─ only/boot.yml'))).toEqual(
          true,
        );
        expect(lines.some((line) => line.includes('├─ only/boot.yml'))).toEqual(
          false,
        );
      });
    });
  });
});
