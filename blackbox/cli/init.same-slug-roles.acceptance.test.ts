import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = the cli, run in a HOME with no grove, so no brain dir arrow reaches the host
 */
const invoke = (
  input: Parameters<typeof invokeRhachetCliBinary>[0],
): ReturnType<typeof invokeRhachetCliBinary> =>
  invokeRhachetCliBinary({
    ...input,
    env: { HOME: genTempDir({ slug: 'same-slug-home' }), ...input.env },
  });

/**
 * .what = the proof of requirements case 10: two repos that ship one role slug both boot
 */
describe('rhachet init — two repos that ship one role slug', () => {
  given('[case1] alpha and beta each ship role surfer', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-same-slug-roles' }),
    );

    when('[t0] init links both, each by its repo/role', () => {
      const result = useBeforeAll(async () =>
        invoke({
          args: ['init', '--roles', 'alpha/surfer', 'beta/surfer'],
          cwd: repo.path,
        }),
      );

      then('init exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('init stdout matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('the repo actor boot.md carries both roles; neither is dropped', async () => {
        const boot = await fs.readFile(
          path.join(
            repo.path,
            '.agent',
            '.actors',
            'actor.via.repo=ambient',
            'brain',
            '.claude',
            'boot.md',
          ),
          'utf-8',
        );
        expect(boot).toContain('alpha: ride a longboard on small days');
        expect(boot).toContain('beta: ride a shortboard on big days');
        expect(asSnapshotSafe(boot)).toMatchSnapshot();
      });

      then('each boots apart on the cli, as its own repo/role', async () => {
        const alpha = await invoke({
          args: ['roles', 'boot', '--repo', 'alpha', '--role', 'surfer'],
          cwd: repo.path,
        });
        const beta = await invoke({
          args: ['roles', 'boot', '--repo', 'beta', '--role', 'surfer'],
          cwd: repo.path,
        });
        expect(alpha.stdout).toContain('alpha: ride a longboard');
        expect(alpha.stdout).not.toContain('beta: ride a shortboard');
        expect(beta.stdout).toContain('beta: ride a shortboard');
        expect(beta.stdout).not.toContain('alpha: ride a longboard');
      });
    });

    when('[t1] a skill both roles ship is run by bare name', () => {
      const result = useBeforeAll(async () =>
        invoke({
          args: ['run', '--skill', 'wax.board'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it is refused as ambiguous, and names --repo', () => {
        expect(result.status).toEqual(2);
        expect(`${result.stdout}${result.stderr}`).toContain('--repo');
      });

      then('the refusal matches its snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });

    when('[t2] the skill is run with --repo', () => {
      const result = useBeforeAll(async () =>
        invoke({
          args: ['run', '--skill', 'wax.board', '--repo', 'beta'],
          cwd: repo.path,
        }),
      );

      then('the named repo skill runs', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('waxed by beta');
      });

      then('the run stdout matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t3] the sweep prices every role', () => {
      const result = useBeforeAll(async () =>
        invoke({ args: ['roles', 'cost', '--all'], cwd: repo.path }),
      );

      then('the sweep exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('it lists one row per repo of the slug; neither is dropped', () => {
        const rows = result.stdout.split('\n').filter((line) => line.includes(' tokens '));
        expect(rows.filter((line) => line.includes('repo=alpha/role=surfer'))).toHaveLength(1);
        expect(rows.filter((line) => line.includes('repo=beta/role=surfer'))).toHaveLength(1);
      });

      then('the sweep stdout matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t4] `rhx list` is invoked', () => {
      const result = useBeforeAll(async () => {
        // `rhx list` reads the repo's rhachet config; the fixture ships none
        await fs.writeFile(
          path.join(repo.path, 'rhachet.use.ts'),
          'export const getRoleRegistries = () => [];\nexport const getBrainRepls = () => [];\n',
        );
        return invoke({ binary: 'rhx', args: ['list'], cwd: repo.path });
      });

      then('list exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('each repo lists its own skill; neither is dropped', () => {
        expect(result.stdout).toContain('repo=alpha');
        expect(result.stdout).toContain('repo=beta');
        expect(result.stdout.split('wax.board').length - 1).toEqual(2);
      });

      then('the repos list in a fixed order, alpha before beta', () => {
        expect(result.stdout.indexOf('repo=alpha')).toBeLessThan(result.stdout.indexOf('repo=beta'));
      });

      then('the list stdout and stderr match their snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });
  });
});
