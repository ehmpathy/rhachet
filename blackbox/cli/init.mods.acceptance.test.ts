import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

import { asAmbientBrainPath } from '@/blackbox/.test/infra/asAmbientBrainPath';
import { setupBrainHooksAdapterPackage } from '@/blackbox/.test/infra/brainDirBootJourney';
import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { setRoleModBootYml } from '@/blackbox/.test/infra/setRoleModBootYml';
import {
  getAllHookDispatchManifestRows,
  HOOK_DISPATCH_AUTHOR,
} from '@/blackbox/.test/infra/getAllHookDispatchManifestRows';
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
    env: { HOME: genTempDir({ slug: 'init-mods-home' }), ...input.env },
  });

/**
 * .what = the proof of how `rhx init` treats `.agent/repo=.mods`: it is no supplier, a sound mod
 *         arms no hook, and a refused mod fails only the actors that carry its role
 */
describe('rhx init — a repo with .agent/repo=.mods', () => {
  given('[case1] a sound mod of a linked role', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods' });

      // a brain package, declared, so `init --hooks` finds a brain to sync hooks for
      setupBrainHooksAdapterPackage({ dir: one.path });
      const packagePath = path.join(one.path, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packagePath, 'utf-8'));
      await fs.writeFile(
        packagePath,
        `${JSON.stringify(
          {
            ...packageJson,
            dependencies: {
              ...packageJson.dependencies,
              'rhachet-brains-surfshop': 'file:./node_modules/rhachet-brains-surfshop',
            },
          },
          null,
          2,
        )}\n`,
      );
      return one;
    });

    when('[t0] init links the roles', () => {
      const result = useBeforeAll(async () =>
        invoke({ args: ['init', '--roles', 'surfer', 'lifeguard'], cwd: repo.path }),
      );

      then('init exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('init stdout matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('`.mods` is no supplier: no install of a rhachet-roles-.mods is tried (usecase 11)', () => {
        const output = `${result.stdout}\n${result.stderr}`;
        expect(output).not.toContain('rhachet-roles-.mods');
        expect(output).not.toContain('repo=.mods/role=surfer is not');
      });

      const actor = useThen('the repo actor boot is read', async () => ({
        boot: await fs.readFile(asAmbientBrainPath({ repo: repo.path, file: 'boot.md' }), 'utf-8'),
      }));

      then('the repo actor boot carries the modded role, with its notice', () => {
        expect(actor.boot).toContain('<mod of="test/surfer@0.9.0 (installed 1.0.0)">');
        expect(actor.boot).toContain('modded: wax the board, then wax the rails');
        expect(actor.boot).not.toContain('a wipeout is forbidden');
        expect(actor.boot).toContain('blow the whistle before a swimmer passes the flags');
      });

      then('the repo actor boot.md matches its snapshot', () => {
        expect(asSnapshotSafe(actor.boot)).toMatchSnapshot();
      });

      // the fixture pins `of: test/surfer@0.9.0` while 1.0.0 is installed; the stop holds on
      //   it, as the boot above carries the moved pin as `(installed 1.0.0)` (usecase 5)
      const sweep = useThen('the stop sweep runs as the hook runs it', async () =>
        invoke({
          args: ['roles', 'cost', '--all', '--when', 'hook.onStop'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('the stop sweep holds, exit 2, and names the moved pin', () => {
        expect(sweep.status).toEqual(2);
        expect(sweep.stderr).toContain('1 modded role moved off the version its mod pins');
        expect(sweep.stderr).toContain('then set `of: test/surfer@1.0.0` in the mod boot.yml');
      });

      then('the stop sweep output matches its snapshot', () => {
        expect({
          stdout: asSnapshotSafe(sweep.stdout),
          stderr: asSnapshotSafe(sweep.stderr),
        }).toMatchSnapshot();
      });
    });

    when('[t1] init applies the hooks', () => {
      const result = useBeforeAll(async () =>
        invoke({ args: ['init', '--hooks'], cwd: repo.path }),
      );

      then('init exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('init stdout matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      then('the repo actor dispatch manifest holds the one stop sweep, carried by repo=.this/role=any', async () => {
        // role hooks are rules of the dispatch manifest; the settings hold one dispatcher per event
        const rows = await getAllHookDispatchManifestRows({
          claudeDir: asAmbientBrainPath({ repo: repo.path, file: '' }),
        });
        const sweeps = rows.filter((row) =>
          row.command.includes('roles cost --all --when hook.onStop'),
        );
        expect(sweeps).toHaveLength(1);
        expect(sweeps[0]?.event).toEqual('Stop');
        expect(sweeps[0]?.author).toEqual('repo=.this/role=any');
      });

      then('the repo actor settings hold the stop dispatcher, no rule of its own', async () => {
        const settings = await fs.readFile(
          asAmbientBrainPath({ repo: repo.path, file: 'settings.of.repo.json' }),
          'utf-8',
        );
        expect(settings).toContain(HOOK_DISPATCH_AUTHOR);
        expect(settings).not.toContain('roles cost --all --when hook.onStop');
      });

      then('the mod is no hook author of its own', async () => {
        const rows = await getAllHookDispatchManifestRows({
          claudeDir: asAmbientBrainPath({ repo: repo.path, file: '' }),
        });
        const settings = await fs.readFile(
          asAmbientBrainPath({ repo: repo.path, file: 'settings.of.repo.json' }),
          'utf-8',
        );
        const authorsOfMods = rows.filter((row) =>
          row.author.includes('repo=.mods/role='),
        );
        expect(authorsOfMods).toEqual([]);
        expect(settings).not.toContain('repo=.mods/role=');
      });
    });
  });

  given('[case2] a refused mod beside a role no mod names (usecase 12)', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods' });
      await setRoleModBootYml({
        repo: one.path,
        role: 'surfer',
        lines: [
          'of: test/surfer@0.9.0',
          'briefs:',
          '  say:',
          '    - briefs/rule.require.reef-etiquette.md',
          '  not:',
          '    - briefs/rule.forbid.wipeoutz.md',
        ],
      });
      return one;
    });

    when('[t0] init links the roles', () => {
      const result = useBeforeAll(async () =>
        invoke({
          args: ['init', '--roles', 'surfer', 'lifeguard'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('init exits 0: a faulty mod is skipped, never a refusal (F01)', () => {
        expect(result.status).toEqual(0);
      });

      then('init names the skipped mod, its problem, and its fix', () => {
        expect(result.stdout).toContain('skipped, booted as published until cured');
        expect(result.stdout).toContain('the mod of role=surfer is refused');
        expect(result.stdout).toContain('briefs/rule.forbid.wipeoutz.md');
        expect(result.stdout).toContain('fix = point the not at a held path, or delete the line');
      });

      const actor = useThen('the repo actor boot is read', async () => ({
        boot: await fs.readFile(asAmbientBrainPath({ repo: repo.path, file: 'boot.md' }), 'utf-8'),
      }));

      then('the repo actor boot carries the published role, with the skip notice', () => {
        expect(actor.boot).toContain('<mod.skipped of="surfer">');
        expect(actor.boot).toContain('a wipeout is forbidden');
        expect(actor.boot).not.toContain('<mod of="test/surfer');
        expect(actor.boot).toContain('blow the whistle before a swimmer passes the flags');
      });

      then('the fault rides in its role section alone: the tail block lists only faults no role carries', () => {
        expect(actor.boot).not.toContain('<mods.skipped>');
      });

      then('the repo actor boot.md matches its snapshot', () => {
        expect(asSnapshotSafe(actor.boot)).toMatchSnapshot();
      });

      const sweep = useThen('the stop sweep runs as the hook runs it', async () =>
        invoke({
          args: ['roles', 'cost', '--all', '--when', 'hook.onStop'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('the stop sweep holds, exit 2, and names the skipped mod with its fix (F02)', () => {
        expect(sweep.status).toEqual(2);
        expect(sweep.stderr).toContain('held at the first stop of each turn until cured');
        expect(sweep.stderr).toContain('fix = point the not at a held path, or delete the line');
      });

      then('the role no mod names is still linked', async () => {
        const stat = await fs.lstat(
          path.join(repo.path, '.agent', 'repo=test', 'role=lifeguard', 'briefs'),
        );
        expect(stat.isSymbolicLink()).toEqual(true);
      });

      then('init stdout and stderr match their snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });

    when('[t1] the typo is fixed, and init renders again', () => {
      const result = useBeforeAll(async () => {
        await setRoleModBootYml({
          repo: repo.path,
          role: 'surfer',
          lines: [
            'of: test/surfer@0.9.0',
            'briefs:',
            '  say:',
            '    - briefs/rule.require.reef-etiquette.md',
            '  not:',
            '    - briefs/rule.forbid.wipeouts.md',
          ],
        });
        return invoke({ args: ['init', '--hooks'], cwd: repo.path });
      });

      then('init exits 0', () => {
        expect(result.status).toEqual(0);
      });

      const actor = useThen('the repo actor boot is read', async () => ({
        boot: await fs.readFile(asAmbientBrainPath({ repo: repo.path, file: 'boot.md' }), 'utf-8'),
      }));

      then('the repo actor boot now carries the mod', () => {
        expect(actor.boot).toContain('<mod of="test/surfer@0.9.0 (installed 1.0.0)">');
        expect(actor.boot).not.toContain('a wipeout is forbidden');
        expect(actor.boot).not.toContain('<mod.skipped');
      });

      const sweep = useThen('the stop sweep runs as the hook runs it', async () =>
        invoke({
          args: ['roles', 'cost', '--all', '--when', 'hook.onStop'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('the stop no longer holds on the mod, once cured: only the version pin is left', () => {
        expect(sweep.stderr).not.toContain('held at the first stop of each turn until cured');
        expect(sweep.stderr).not.toContain('modsFaulted');
        expect(sweep.stderr).toContain('moved off the version its mod pins');
      });

      then('init stdout and the repo actor boot.md match their snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          boot: asSnapshotSafe(actor.boot),
        }).toMatchSnapshot();
      });
    });
  });
});
