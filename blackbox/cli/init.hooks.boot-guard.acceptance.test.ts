import * as fs from 'fs/promises';
import * as path from 'path';

import { given, then, useBeforeAll, useThen, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = the journey that keeps a repo's own boot from unbounded growth
 * .why = a `.agent/repo=.this` role gains a `say` brief every few rounds and no one trims it.
 *        so init findserts a budget for `role=any`, and that budget arms rhachet's one built-in
 *        onStop hook, which halts every stop once the boot crosses its budget — a forgotten
 *        budget fails fast, never silently
 */

// the args the relayed onStop hook runs — the built-in budget gate
const HOOK_ARGS = ['roles', 'cost', '--all', '--when', 'hook.onStop'];

// a brief large enough to push any role past the 5_000 token default
const BRIEF_OVERGROWN = [
  '# overgrown',
  '',
  ...Array.from(
    { length: 1_500 },
    (_, index) =>
      `- rule ${index}: a lesson someone said once, then never moved to ref or condensed.`,
  ),
  '',
].join('\n');

// the Stop entries the fixture's test brain adapter relays — flat `{ matcher: author, command }`
const getSettingsHooksStop = async (input: {
  repoPath: string;
}): Promise<Array<{ matcher: string; command: string }>> => {
  const content = await fs.readFile(
    path.join(input.repoPath, '.claude', 'settings.json'),
    'utf-8',
  );
  return JSON.parse(content).hooks.Stop ?? [];
};

describe('rhachet init --hooks, boot guard for .agent/repo=.this/role=any', () => {
  given('[case1] a repo whose own role has a payload and no budget', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-boot-guard-unset' }),
    );
    const roleDir = () =>
      path.join(repo.path, '.agent', 'repo=.this', 'role=any');

    when('[t0] init --hooks', () => {
      const result = useThen('it succeeds', async () =>
        invokeRhachetCliBinary({ args: ['init', '--hooks'], cwd: repo.path }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('stdout reports the budget it findserted', () => {
        expect(result.stdout).toContain('+ boot.yml');
        expect(result.stdout).toContain('budget.tokens: 5_000');
        expect(result.stdout).not.toContain('hooks.yml');
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('boot.yml now declares a 5_000 token budget', async () => {
        const bootYml = await fs.readFile(
          path.join(roleDir(), 'boot.yml'),
          'utf-8',
        );
        expect(bootYml).toContain('budget:\n  tokens: 5_000');
        expect(bootYml).toMatchSnapshot();
      });

      then('no hooks.yml is written, since the gate is built in', async () => {
        const isHooksYmlPresent = await fs
          .stat(path.join(roleDir(), 'hooks.yml'))
          .then(() => true)
          .catch(() => false);
        expect(isHooksYmlPresent).toEqual(false);
      });

      then('settings.json relays the Stop hook, authored by the repo role', async () => {
        const stops = await getSettingsHooksStop({ repoPath: repo.path });
        expect(stops).toContainEqual(
          expect.objectContaining({
            command:
              './node_modules/.bin/rhachet roles cost --all --when hook.onStop',
            matcher: 'repo=.this/role=any',
          }),
        );
      });
    });

    when('[t1] the onStop hook fires while the boot fits its budget', () => {
      const result = useThen('it runs', async () =>
        invokeRhachetCliBinary({ args: HOOK_ARGS, cwd: repo.path }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('is silent', () => {
        expect(result.stdout).toEqual('');
        expect(result.stderr).toEqual('');
      });
    });

    when('[t2] a brief grows the boot past its budget, then the hook fires', () => {
      const result = useThen('it runs', async () => {
        await fs.writeFile(
          path.join(roleDir(), 'briefs', 'overgrown.md'),
          BRIEF_OVERGROWN,
        );
        return invokeRhachetCliBinary({
          args: HOOK_ARGS,
          cwd: repo.path,
          logOnError: false,
        });
      });

      then('exits with status 2, so the stop is held', () => {
        expect(result.status).toEqual(2);
      });

      then('stderr names the spec over budget and the remedies', () => {
        expect(result.stderr).toContain(
          '✋ ConstraintError: 1 boot spec over budget',
        );
        expect(result.stderr).toContain('.agent/repo=.this/role=any/boot.yml');
        expect(result.stderr).toContain(
          'rhx cost --what .agent/repo=.this/role=any/boot.yml',
        );
        expect(result.stderr).toContain(
          'fix — four strategies, cheapest first',
        );
        for (const verb of ['catalogize', 'condense', 'reference', 'eliminate'])
          expect(result.stderr).toContain(verb);
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t3] init --hooks runs again', () => {
      const result = useThen('it succeeds', async () =>
        invokeRhachetCliBinary({ args: ['init', '--hooks'], cwd: repo.path }),
      );

      then('findserts naught new', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).not.toContain('+ boot.yml');
      });

      then('the re-run renders as snapshotted', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout-rerun');
      });

      then('the Stop hook is relayed once, never twice', async () => {
        const stops = await getSettingsHooksStop({ repoPath: repo.path });
        const matched = stops.filter((hook) =>
          hook.command.includes('roles cost --all --when hook.onStop'),
        );
        expect(matched).toHaveLength(1);
      });
    });
  });

  given('[case2] a repo whose own role already declares a budget', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-boot-guard-custom' }),
    );
    const bootYmlPath = () =>
      path.join(repo.path, '.agent', 'repo=.this', 'role=any', 'boot.yml');

    when('[t0] init --hooks', () => {
      // wrap the read in an object, since a bare string does not survive the lazy proxy
      const bootYmlBefore = useBeforeAll(async () => ({
        content: await fs.readFile(bootYmlPath(), 'utf-8'),
      }));
      const result = useThen('it succeeds', async () =>
        invokeRhachetCliBinary({ args: ['init', '--hooks'], cwd: repo.path }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('boot.yml is left exactly as its owner wrote it', async () => {
        const bootYmlAfter = await fs.readFile(bootYmlPath(), 'utf-8');
        expect(bootYmlAfter).toEqual(bootYmlBefore.content);
        expect(result.stdout).not.toContain('+ boot.yml');
      });

      then('the owner budget arms the Stop hook in settings.json', async () => {
        const stops = await getSettingsHooksStop({ repoPath: repo.path });
        expect(stops).toContainEqual(
          expect.objectContaining({
            command:
              './node_modules/.bin/rhachet roles cost --all --when hook.onStop',
            matcher: 'repo=.this/role=any',
          }),
        );
      });

      then('the render matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-owner-budget',
        );
      });
    });

    when('[t1] the onStop hook fires against the owner budget', () => {
      const result = useThen('it runs', async () =>
        invokeRhachetCliBinary({
          args: HOOK_ARGS,
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with status 2, measured against the owner budget', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain(' / 20 tokens)');
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case3] a caller that names no declared hook event', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-boot-guard-unset' }),
    );

    when('[t0] roles cost --all --when hook.bogus', () => {
      const result = useThen('it runs', async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'cost', '--all', '--when', 'hook.bogus'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('is refused with status 2, and names the valid callers', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain(
          '--when must be one of hook.onBoot, hook.onTool, hook.onStop, hook.onTalk',
        );
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] roles cost --when hook.onStop, without --all', () => {
      const result = useThen('it runs', async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'cost', '--when', 'hook.onStop'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('is refused with status 2', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('--when requires --all');
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });
});
