import { given, then, useThen, when } from 'test-fns';

import { genSampleRepoWithSubjects } from '@src/.test/assets/genSampleRepoWithSubjects';

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { getAllRepoBootSpecCosts } from './getAllRepoBootSpecCosts';

/**
 * .what = gives `fixture/zeta` a plain boot.yml, with no subject section
 * .why = the sweep must hold one spec that declares no subjects, so its empty subject list is
 *        asserted beside the subject spec's two
 */
const asRepoWithPlainBootSpecOnZeta = (input: { repoPath: string }): string => {
  writeFileSync(
    join(input.repoPath, '.agent', 'repo=fixture', 'role=zeta', 'boot.yml'),
    'briefs:\n  say:\n    - briefs/core.md\n',
  );
  return input.repoPath;
};

describe('getAllRepoBootSpecCosts', () => {
  given('[case1] a role that declares subjects (wish 4)', () => {
    when('[t0] the repo is swept', () => {
      const result = useThen('the sweep succeeds', async () =>
        getAllRepoBootSpecCosts({
          cwd: asRepoWithPlainBootSpecOnZeta({
            repoPath: genSampleRepoWithSubjects({
              slug: 'getAllRepoBootSpecCosts-c1',
            }),
          }),
          globs: null,
        }),
      );

      then('a spec that declares no subjects carries no subject costs', () => {
        const row = result.costs.find((cost) =>
          cost.pathToSpec.includes('role=zeta'),
        );
        expect(row).toBeDefined();
        expect(row!.subjects).toEqual([]);
      });

      then('the subject role carries one cost per declared subject', () => {
        const row = result.costs.find((cost) =>
          cost.pathToSpec.includes('role=any'),
        );
        expect(row?.subjects.map((subject) => subject.slug)).toEqual([
          'flow',
          'lean',
        ]);
      });

      then('each focus costs less than the whole role', () => {
        const row = result.costs.find((cost) =>
          cost.pathToSpec.includes('role=any'),
        );
        expect(row!.subjects).toHaveLength(2);
        row!.subjects.forEach((subject) => {
          expect(subject.tokens).toBeGreaterThan(0);
          expect(subject.tokens).toBeLessThan(row!.tokens);
        });
      });

      then(
        'a subject that sheds always costs less than one that keeps it',
        () => {
          const row = result.costs.find((cost) =>
            cost.pathToSpec.includes('role=any'),
          );
          const flow = row?.subjects.find((subject) => subject.slug === 'flow');
          const lean = row?.subjects.find((subject) => subject.slug === 'lean');
          expect(lean!.tokens).toBeLessThan(flow!.tokens);
        },
      );
    });
  });
});
