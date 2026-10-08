import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { genSampleFileTree } from '@src/.test/assets/genSampleFileTree';

import { statSync, utimesSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { genOneRepoThisBootBudgetVerdict } from './genOneRepoThisBootBudgetVerdict';

/**
 * .what = a temp repo whose `.agent/repo=.this/role=any` boots one brief under the budget given
 */
const genRepoWithRoleAnyBoot = (input: {
  slug: string;
  budgetTokens: number;
}): { repo: string; pathToBrief: string } => {
  const repo = genTempDir({ slug: input.slug, git: true });
  const roleDir = genSampleFileTree({
    dir: join(repo, '.agent', 'repo=.this', 'role=any'),
    files: {
      'briefs/core.md':
        '# core\n\nthe one brief every clone of this repo reads at boot.\n',
      'boot.yml': [
        'budget:',
        `  tokens: ${input.budgetTokens}`,
        'always:',
        '  briefs:',
        '    say:',
        '      - briefs/core.md',
        '',
      ].join('\n'),
    },
  });
  return { repo, pathToBrief: join(roleDir, 'briefs', 'core.md') };
};

/**
 * .what = clamps the verdict the `.this` onStop hook asks on every stop
 * .why = an over-budget boot must hold EVERY stop until fixed, so only a clean verdict may
 *        be memoized; and a memo that survived an edit under `.this` would pass a boot that
 *        the edit pushed over its cap
 *
 * .note = INTEGRATION grain: it reads the filesystem and loads the tokenizer from disk
 */
describe('genOneRepoThisBootBudgetVerdict', () => {
  given('[case1] a .this boot far under its budget', () => {
    const scene = useBeforeAll(async () => {
      const { repo, pathToBrief } = genRepoWithRoleAnyBoot({
        slug: 'repo-this-verdict-within',
        budgetTokens: 50_000,
      });
      const first = await genOneRepoThisBootBudgetVerdict({ cwd: repo });
      const second = await genOneRepoThisBootBudgetVerdict({ cwd: repo });

      // an edit under `.this` must void the memo
      writeFileSync(
        pathToBrief,
        '# core\n\nthe one brief, now with one more line.\n\nand another.\n',
      );
      const third = await genOneRepoThisBootBudgetVerdict({ cwd: repo });
      return { first, second, third };
    });

    when('[t0] the verdict is first asked', () => {
      then('it reports naught over budget, from a fresh sweep', () => {
        expect(scene.first).toEqual({ over: [], memo: 'miss' });
      });
    });

    when('[t1] the verdict is asked again with naught changed', () => {
      then('it returns the memoized clean verdict', () => {
        expect(scene.second).toEqual({ over: [], memo: 'hit' });
      });
    });

    when('[t2] the verdict is asked after an edit to a brief', () => {
      then('the memo is voided and the sweep reruns', () => {
        expect(scene.third).toEqual({ over: [], memo: 'miss' });
      });
    });
  });

  given('[case2] a .this boot over its budget', () => {
    const scene = useBeforeAll(async () => {
      const { repo } = genRepoWithRoleAnyBoot({
        slug: 'repo-this-verdict-over',
        budgetTokens: 10,
      });
      const first = await genOneRepoThisBootBudgetVerdict({ cwd: repo });
      const second = await genOneRepoThisBootBudgetVerdict({ cwd: repo });
      return { first, second };
    });

    when('[t0] the verdict is first asked', () => {
      then('it names the one spec over its budget', () => {
        expect(scene.first.memo).toEqual('miss');
        expect(scene.first.over).toHaveLength(1);
        expect(scene.first.over[0]?.pathToSpec).toContain(
          '.agent/repo=.this/role=any/boot.yml',
        );
        expect(scene.first.over[0]?.budget).toEqual(10);
        expect(scene.first.over[0]?.tokens).toBeGreaterThan(10);
      });
    });

    when('[t1] the verdict is asked again with naught changed', () => {
      then(
        '🔴 it sweeps again — an over-budget verdict is never memoized',
        () => {
          expect(scene.second.memo).toEqual('miss');
          expect(scene.second.over).toHaveLength(1);
        },
      );
    });
  });

  given(
    '[case3] a brief rewritten at the same size and mtime, past the budget',
    () => {
      const scene = useBeforeAll(async () => {
        const { repo, pathToBrief } = genRepoWithRoleAnyBoot({
          slug: 'repo-this-verdict-same-stat',
          budgetTokens: 300,
        });

        // a short brief, padded with spaces, sits under the cap (~181 tokens with its wrapper)
        const stampSec = 1_700_000_000;
        const contentShort = `# core\n\nok.\n${' '.repeat(400)}`;
        writeFileSync(pathToBrief, contentShort);
        utimesSync(pathToBrief, stampSec, stampSec);
        const statBefore = statSync(pathToBrief);
        const first = await genOneRepoThisBootBudgetVerdict({ cwd: repo });

        // a rewrite of equal byte length, stamped back to the prior mtime, as `cp -p` would
        const contentLong = Array.from(
          { length: contentShort.length / 2 },
          () => 'a ',
        ).join('');
        writeFileSync(pathToBrief, contentLong);
        utimesSync(pathToBrief, stampSec, stampSec);
        const statAfter = statSync(pathToBrief);
        const second = await genOneRepoThisBootBudgetVerdict({ cwd: repo });
        return { first, second, statBefore, statAfter };
      });

      when('[t0] the verdict is asked before the rewrite', () => {
        then('it reports naught over budget', () => {
          expect(scene.first).toEqual({ over: [], memo: 'miss' });
        });
      });

      when('[t1] the verdict is asked after the rewrite', () => {
        then('the rewrite kept the size and mtime of the prior brief', () => {
          expect(scene.statAfter.size).toEqual(scene.statBefore.size);
          expect(scene.statAfter.mtimeMs).toEqual(scene.statBefore.mtimeMs);
        });

        then(
          '🔴 the memo is voided by content, and the overage is named',
          () => {
            expect(scene.second.memo).toEqual('miss');
            expect(scene.second.over).toHaveLength(1);
          },
        );
      });
    },
  );
});
