import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

import { asAmbientBrainPath } from '@/blackbox/.test/infra/asAmbientBrainPath';
import { asModsPath } from '@/blackbox/.test/infra/asModsPath';
import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { setRoleModBootYml } from '@/blackbox/.test/infra/setRoleModBootYml';

/**
 * .what = the cli, run in a HOME with no grove, so no brain dir arrow reaches the host
 * .why = init writes brain dirs; a hermetic HOME keeps the host's settings out of each run
 */
const invoke = (
  input: Parameters<typeof invokeRhachetCliBinary>[0],
): ReturnType<typeof invokeRhachetCliBinary> =>
  invokeRhachetCliBinary({
    ...input,
    env: { HOME: genTempDir({ slug: 'roles-mods-home' }), ...input.env },
  });

const ARGS_BOOT = ['roles', 'boot', '--repo', 'test', '--role', 'surfer'];

/**
 * .what = the published skill of `surfer` that case13's mod nots
 */
const SKILL_NOTED = 'wax.board.sh';

/**
 * .what = the path of one file under the mod dir of `surfer`
 */
const asModPath = (input: { repo: string; rel: string }): string =>
  asModsPath({ repo: input.repo, rel: path.join('role=surfer', input.rel) });

describe('rhachet roles — a role modded via .agent/repo=.mods', () => {
  given('[case1] a repo that mods a linked package role', () => {
    const repo = useBeforeAll(async () => genTestTempRepo({ fixture: 'with-mods' }));

    when('[t0] init links the role, then renders the modded view', () => {
      const result = useBeforeAll(async () =>
        invoke({ args: ['init', '--roles', 'surfer'], cwd: repo.path }),
      );

      then('init exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the role dir holds the modded view, the not-ed brief absent', async () => {
        const briefs = await fs.readdir(
          path.join(repo.path, '.agent', 'repo=test', 'role=surfer', 'briefs'),
        );
        expect(briefs.sort()).toEqual([
          'howto.paddle-out.md',
          'rule.require.reef-etiquette.md',
          'rule.require.surf-wax.md',
        ]);
      });

      then('the role dir keeps its own boot.yml, untouched by the view', async () => {
        const entries = await fs.readdir(
          path.join(repo.path, '.agent', 'repo=test', 'role=surfer'),
        );
        expect(entries).toContain('boot.yml');
      });

      then('init says a live clone keeps its prior boot until re-enrolled', () => {
        expect(result.stdout).toContain('role=surfer');
        expect(result.stdout).toContain(
          'a live clone keeps the boot it read at session start; re-enroll it to pick up the change',
        );
      });

      then('init stdout matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });

      const actor = useThen('the boot.md a clone reads is read', async () => ({
        bootMd: await fs.readFile(
          asAmbientBrainPath({ repo: repo.path, file: 'boot.md' }),
          'utf-8',
        ),
      }));

      then('the boot.md a clone reads carries the notice and the tags', () => {
        expect(actor.bootMd).toContain('<mod of="test/surfer@0.9.0 (installed 1.0.0)">');
        expect(actor.bootMd).toContain('mod="shadow"');
        expect(actor.bootMd).toContain('mod="add"');
        expect(actor.bootMd).toContain('modded: wax the board, then wax the rails');
        expect(actor.bootMd).not.toContain('published (min): wax the board');
        expect(actor.bootMd).not.toContain('a wipeout is forbidden');
      });

      then('the boot.md a clone reads matches its snapshot', () => {
        expect(asSnapshotSafe(actor.bootMd)).toMatchSnapshot();
      });
    });

    when('[t0.1] init renders again, with no mod change', () => {
      const result = useBeforeAll(async () =>
        invoke({ args: ['init', '--hooks'], cwd: repo.path }),
      );

      then('the render is silent about mods: no view changed', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).not.toContain('a live clone keeps the boot');
      });

      then('the render stdout matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] the role is booted', () => {
      const result = useBeforeAll(async () => invoke({ args: ARGS_BOOT, cwd: repo.path }));

      then('the boot exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the notice names the mod, its counts, and each not', () => {
        expect(result.stdout).toContain('<mod of="test/surfer@0.9.0 (installed 1.0.0)">');
        expect(result.stdout).toContain('1 shadow, 1 add, 1 not');
        expect(result.stdout).toContain('[-] not briefs/rule.forbid.wipeouts.md');
      });

      then('the shadow renders in place of the published brief, tagged', () => {
        expect(result.stdout).toContain('modded: wax the board, then wax the rails');
        expect(result.stdout).not.toContain('published: wax the board');
        expect(result.stdout).toContain('mod="shadow"');
      });

      then('the published .md.min of the shadow is dropped, and the notice says so', () => {
        expect(result.stdout).not.toContain('published (min): wax the board');
        expect(result.stdout).toContain(
          '[~] shadow briefs/rule.require.surf-wax.md drops the published briefs/rule.require.surf-wax.md.min',
        );
      });

      then('the add renders beside the published briefs, tagged', () => {
        expect(result.stdout).toContain('modded: mind the reef');
        expect(result.stdout).toContain('mod="add"');
      });

      then('the not-ed brief does not render', () => {
        expect(result.stdout).not.toContain('a wipeout is forbidden');
      });

      then('a brief the mod leaves alone renders as published, untagged', () => {
        expect(result.stdout).toContain('published: paddle out past the break');
      });

      then('the boot matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] the sweep prices every role', () => {
      const result = useBeforeAll(async () =>
        invoke({ args: ['roles', 'cost', '--all'], cwd: repo.path }),
      );

      then('the modded role row carries the changed mark and its counts', () => {
        expect(result.stdout).toContain('[~] modded · 1 shadow · 1 add · 1 not');
      });

      then('the sweep stdout matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t3] a session stops, with the mod pinned to 0.9.0 and 1.0.0 installed', () => {
      const result = useBeforeAll(async () =>
        invoke({
          args: ['roles', 'cost', '--all', '--when', 'hook.onStop'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('the stop is held, exit 2, as a boot budget breach holds it', () => {
        expect(result.status).toEqual(2);
      });

      then('the hold names the role, both versions, each mod, and the fix', () => {
        expect(result.stderr).toContain(
          '✋ ConstraintError: 1 modded role moved off the version its mod pins',
        );
        expect(result.stderr).toContain('role    = test/surfer');
        expect(result.stderr).toContain(
          'mods    = 0.9.0   (declared in .agent/repo=.mods/role=surfer/boot.yml)',
        );
        expect(result.stderr).toContain('now     = 1.0.0');
        expect(result.stderr).toContain('[-] not briefs/rule.forbid.wipeouts.md');
        expect(result.stderr).toContain(
          'then set `of: test/surfer@1.0.0` in the mod boot.yml',
        );
      });

      then('the stop output matches its snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });

    when('[t4] the pin is moved to the installed version, rendered, and booted', () => {
      const result = useBeforeAll(async () => {
        const pathSpec = asModPath({ repo: repo.path, rel: 'boot.yml' });
        const spec = await fs.readFile(pathSpec, 'utf-8');
        await fs.writeFile(pathSpec, spec.replace('@0.9.0', '@1.0.0'));
        await invoke({ args: ['init', '--hooks'], cwd: repo.path });
        return invoke({ args: ARGS_BOOT, cwd: repo.path });
      });

      then('the boot names the pin alone: no drift is left to show', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('<mod of="test/surfer@1.0.0">');
        expect(result.stdout).not.toContain('(installed ');
      });

      then('the boot stdout matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t5] a session stops, with the pin at the installed version', () => {
      const result = useBeforeAll(async () =>
        invoke({
          args: ['roles', 'cost', '--all', '--when', 'hook.onStop'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('the stop is clear, exit 0, and silent: no drift is left to hold for', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toEqual('');
        expect(result.stderr).toEqual('');
      });
    });
  });

  given('[case2] a mod edited after the last render', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods' });
      await invoke({ args: ['init', '--roles', 'surfer'], cwd: one.path });
      await fs.writeFile(
        asModPath({ repo: one.path, rel: 'briefs/howto.paddle-out.md' }),
        'modded: paddle out, then duck dive\n',
      );
      return one;
    });

    when('[t0] the role is booted before a render', () => {
      const result = useBeforeAll(async () =>
        invoke({ args: ARGS_BOOT, cwd: repo.path, logOnError: false }),
      );

      then('the boot exits 0: a stale view is skipped, never a refusal', () => {
        expect(result.status).toEqual(0);
      });

      then('the boot carries the published role, and a notice that names the stale view and its render', () => {
        expect(result.stdout).toContain('<mod.skipped of="surfer">');
        expect(result.stdout).toContain('is stale');
        expect(result.stdout).toContain('rhx init --hooks');
        expect(result.stdout).toContain('wax the board before each session');
        expect(result.stdout).toContain('published: paddle out past the break');
        expect(result.stdout).toContain('published: a wipeout is forbidden');
        expect(result.stdout).not.toContain('modded: paddle out, then duck dive');
      });

      then('the stale view boot matches its snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });

    when('[t0.1] the sweep prices every role before a render', () => {
      const result = useBeforeAll(async () =>
        invoke({ args: ['roles', 'cost', '--all'], cwd: repo.path }),
      );

      then('the sweep reports, never refuses: exit 0, the row marked stale', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain(
          '[~] modded, view not current (rhx init --hooks)',
        );
      });

      then('the spec is priced as the boot it emits: published, its mod skipped', () => {
        expect(result.stdout).toContain('🧢 1 boot spec — none declare a budget');
        expect(result.stdout).not.toContain('withheld by a mod');
        expect(result.stdout).not.toContain('carries your mod');
        expect(result.stdout).not.toContain('none found at the paths swept');
      });

      then('the sweep stdout matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t0.2] a session stops before a render', () => {
      const result = useBeforeAll(async () =>
        invoke({
          args: ['roles', 'cost', '--all', '--when', 'hook.onStop'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('the stop holds on the moved pin alone; the stale view is the boot to refuse, as [t0] shows', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('1 modded role moved off the version its mod pins');
        expect(result.stderr).not.toContain('is stale');
      });

      then('the stop stdout and stderr match their snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });

    when('[t1] init renders again, then the role is booted', () => {
      const result = useBeforeAll(async () => {
        await invoke({ args: ['init', '--hooks'], cwd: repo.path });
        return invoke({ args: ARGS_BOOT, cwd: repo.path });
      });

      then('the boot carries the new shadow', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('modded: paddle out, then duck dive');
        expect(result.stdout).toContain('2 shadow, 1 add, 1 not');
      });

      then('the boot stdout matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case3] a mod deleted', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods' });
      await invoke({ args: ['init', '--roles', 'surfer'], cwd: one.path });
      await fs.rm(path.join(one.path, '.agent', 'repo=.mods'), { recursive: true });
      const render = await invoke({ args: ['init', '--hooks'], cwd: one.path });
      return { path: one.path, render };
    });

    when('[t0.0] the render after the delete', () => {
      then('init names the role returned to published', () => {
        expect(repo.render.status).toEqual(0);
        expect(repo.render.stdout).toContain('returned to published, its mod gone');
        expect(repo.render.stdout).toContain('role=surfer');
      });

      then('the render stdout and stderr match their snapshot', () => {
        expect({
          stdout: asSnapshotSafe(repo.render.stdout),
          stderr: asSnapshotSafe(repo.render.stderr),
        }).toMatchSnapshot();
      });
    });

    when('[t0] the role is booted after a render', () => {
      const result = useBeforeAll(async () => invoke({ args: ARGS_BOOT, cwd: repo.path }));

      then('the role boots as published, with no notice and no tag', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).not.toContain('<mod of=');
        expect(result.stdout).not.toContain('mod="');
        expect(result.stdout).toContain('published (min): wax the board');
        expect(result.stdout).toContain('published: a wipeout is forbidden');
      });

      then('the boot stdout matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case4] a mod that shadows a skill', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods' });
      const pathSkill = asModPath({ repo: one.path, rel: 'skills/wax.board.sh' });
      await fs.mkdir(path.dirname(pathSkill), { recursive: true });
      await fs.writeFile(pathSkill, '#!/usr/bin/env bash\necho "waxed, modded"\n', {
        mode: 0o755,
      });
      await invoke({ args: ['init', '--roles', 'surfer'], cwd: one.path });
      return one;
    });

    when('[t0] the skill is run', () => {
      const result = useBeforeAll(async () =>
        invoke({ args: ['run', '--skill', 'wax.board'], cwd: repo.path }),
      );

      then('the shadow runs in place of the published skill', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('waxed, modded');
        expect(result.stdout).not.toContain('\nwaxed\n');
      });

      then('the run stdout matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case4.0.1] a mod that shadows a skill, and the shadow sources its published peer', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods' });
      const pathSkill = asModPath({ repo: one.path, rel: 'skills/wax.board.sh' });
      await fs.mkdir(path.dirname(pathSkill), { recursive: true });
      await fs.writeFile(
        pathSkill,
        '#!/usr/bin/env bash\nsource "$(dirname "${BASH_SOURCE[0]}")/wax.lib.sh"\necho "modded, then $(wax_word)"\n',
        { mode: 0o755 },
      );
      await invoke({ args: ['init', '--roles', 'surfer'], cwd: one.path });
      return one;
    });

    when('[t0] the skill is run', () => {
      const result = useBeforeAll(async () =>
        invoke({ args: ['run', '--skill', 'wax.board'], cwd: repo.path }),
      );

      then('the shadow runs, and finds the published peer beside it in the view', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('modded, then waxed');
      });

      then('the run stdout matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case4.1] a mod that shadows only the peer a published skill sources', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods' });
      const pathPeer = asModPath({ repo: one.path, rel: 'skills/wax.lib.sh' });
      await fs.mkdir(path.dirname(pathPeer), { recursive: true });
      await fs.writeFile(
        pathPeer,
        '#!/usr/bin/env bash\nwax_word() {\n  echo "waxed, by the modded lib"\n}\n',
        { mode: 0o755 },
      );
      await invoke({ args: ['init', '--roles', 'surfer'], cwd: one.path });
      return one;
    });

    when('[t0] the published skill is run', () => {
      const result = useBeforeAll(async () =>
        invoke({ args: ['run', '--skill', 'wax.board'], cwd: repo.path }),
      );

      then('the published skill sources the modded peer, from one merged dir', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('waxed, by the modded lib');
      });

      then('the run stdout matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case5] a mod file at a typo of a held path, beside a role no mod names', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods' });
      await fs.writeFile(
        asModPath({ repo: one.path, rel: 'briefs/rule.require.surf-wux.md' }),
        'a typo of a held path\n',
      );
      return one;
    });

    when('[t0] init renders every actor', () => {
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

      then('init names the skipped mod', () => {
        expect(result.stdout).toContain('skipped, booted as published until cured');
        expect(result.stdout).toContain('the mod of role=surfer is refused');
      });

      then('init stdout and stderr match their snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });

      then('the role no mod names is still linked', async () => {
        const stat = await fs.lstat(
          path.join(repo.path, '.agent', 'repo=test', 'role=lifeguard', 'briefs'),
        );
        expect(stat.isSymbolicLink()).toEqual(true);
      });
    });

    when('[t1] the role no mod names is booted', () => {
      const result = useBeforeAll(async () =>
        invoke({
          args: ['roles', 'boot', '--repo', 'test', '--role', 'lifeguard'],
          cwd: repo.path,
        }),
      );

      then('the boot is not blocked by the refused mod of another role', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('rule.require.whistle.md');
        expect(result.stdout).not.toContain('<mod of=');
      });

      then('the boot stdout and stderr match their snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });

    when('[t2] the modded role is booted', () => {
      const result = useBeforeAll(async () =>
        invoke({ args: ARGS_BOOT, cwd: repo.path, logOnError: false }),
      );

      then('the boot exits 0, the role booted as published', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('published (min): wax the board before each session');
        expect(result.stdout).toContain('published: a wipeout is forbidden');
        expect(result.stdout).not.toContain('a typo of a held path');
      });

      then('the skip notice names the mod, the file, and the held path it missed', () => {
        expect(result.stdout).toContain('<mod.skipped of="surfer">');
        expect(result.stdout).toContain('the mod of role=surfer is refused');
        expect(result.stdout).toContain('rule.require.surf-wux.md');
        expect(result.stdout).toContain('rule.require.surf-wax.md');
      });

      then('the skipped boot matches its snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });
  });

  given('[case5.1] a sound mod whose pin drifted, beside a stray file under .agent/repo=.mods', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods' });
      await invoke({ args: ['init', '--roles', 'surfer'], cwd: one.path });
      await fs.writeFile(
        path.join(one.path, '.agent', 'repo=.mods', 'notes.md'),
        'a note the human left beside the mods\n',
      );
      return one;
    });

    when('[t0] a stop claude already held', () => {
      const result = useBeforeAll(async () =>
        invoke({
          args: ['roles', 'cost', '--all', '--when', 'hook.onStop'],
          cwd: repo.path,
          env: { RHACHET_HOOKS_STOP_HELD: '1' },
          logOnError: false,
        }),
      );

      then('🔴 it still holds (exit 2): only a fault alone passes a held stop', () => {
        expect(result.status).toEqual(2);
      });

      then('it names the drift and the stray, under one echo of the invocation', () => {
        expect(result.stderr).toContain('0.9.0');
        expect(result.stderr).toContain('.agent/repo=.mods/notes.md');
        expect(result.stderr.split('🧢 roles cost --all --when hook.onStop').length - 1).toEqual(1);
      });

      then('the held stop matches its snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });
  });

  given('[case6] a release removes the path a mod shadows', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods' });
      await invoke({ args: ['init', '--roles', 'surfer'], cwd: one.path });
      await setPackageRelease({
        repo: one.path,
        removed: ['rule.require.surf-wax.md', 'rule.require.surf-wax.md.min'],
      });
      return one;
    });

    when('[t0] a session stops', () => {
      const result = useBeforeAll(async () =>
        invoke({
          args: ['roles', 'cost', '--all', '--when', 'hook.onStop'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('the stop holds, exit 2, on the skipped mod with its fix, until it is cured (F02)', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('1 mod fault, held at the first stop of each turn until cured');
        expect(result.stderr).toContain('the mod of role=surfer is refused');
        expect(result.stderr).toContain('fix = ');
        expect(result.stderr).not.toContain('moved off the version its mod pins');
      });

      then('the stop stdout and stderr match their snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });

    when('[t1] the role is booted', () => {
      const result = useBeforeAll(async () =>
        invoke({ args: ARGS_BOOT, cwd: repo.path, logOnError: false }),
      );

      then('the boot exits 0, as published, and names that the mod no longer applies', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('<mod.skipped of="surfer">');
        expect(result.stdout).toContain('the mod of role=surfer is refused');
        expect(result.stdout).toContain('published: paddle out past the break');
        expect(result.stdout).not.toContain('<mod of=');
      });

      then('the skipped boot stdout and stderr match their snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });

      then('the brief the mod nots boots too: the view the last render left modded is not trusted (F03)', () => {
        expect(result.stdout).toContain('published: a wipeout is forbidden');
      });
    });
  });

  given('[case6.1] a release removes the path a mod nots', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods' });
      await invoke({ args: ['init', '--roles', 'surfer'], cwd: one.path });
      await setPackageRelease({
        repo: one.path,
        removed: ['rule.forbid.wipeouts.md'],
      });
      return one;
    });

    when('[t0] a session stops', () => {
      const result = useBeforeAll(async () =>
        invoke({
          args: ['roles', 'cost', '--all', '--when', 'hook.onStop'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('the stop holds, exit 2, on the skipped mod with its fix, until it is cured (F02)', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('1 mod fault, held at the first stop of each turn until cured');
        expect(result.stderr).toContain('the mod of role=surfer is refused');
        expect(result.stderr).toContain('fix = ');
        expect(result.stderr).not.toContain('moved off the version its mod pins');
      });

      then('the stop stdout and stderr match their snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });

    when('[t1] the role is booted', () => {
      const result = useBeforeAll(async () =>
        invoke({ args: ARGS_BOOT, cwd: repo.path, logOnError: false }),
      );

      then('the boot exits 0, as published, and names that the mod no longer applies', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('<mod.skipped of="surfer">');
        expect(result.stdout).toContain('the mod of role=surfer is refused');
        expect(result.stdout).toContain('published: paddle out past the break');
        expect(result.stdout).not.toContain('<mod of=');
      });

      then('the skipped boot stdout and stderr match their snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });
  });

  given('[case7] the content of an extant shadow is edited after the render', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods' });
      await invoke({ args: ['init', '--roles', 'surfer'], cwd: one.path });
      await fs.writeFile(
        asModPath({ repo: one.path, rel: 'briefs/rule.require.surf-wax.md' }),
        'modded twice: wax the board, the rails, and the fins\n',
      );
      return one;
    });

    when('[t0] the role is booted, with no render', () => {
      const result = useBeforeAll(async () => invoke({ args: ARGS_BOOT, cwd: repo.path }));

      then('the boot exits 0: a content edit needs no render', () => {
        expect(result.status).toEqual(0);
      });

      then('the boot carries the edit, in one save', () => {
        expect(result.stdout).toContain(
          'modded twice: wax the board, the rails, and the fins',
        );
        expect(result.stdout).not.toContain('modded: wax the board, then wax the rails');
      });

      then('the boot stdout matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case8] a not whose path is a typo', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods' });
      await setModBootYml({
        repo: one.path,
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

    when('[t0] init renders the view', () => {
      const result = useBeforeAll(async () =>
        invoke({
          args: ['init', '--roles', 'surfer'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('init exits 0: a faulty mod is skipped, never a refusal (F01)', () => {
        expect(result.status).toEqual(0);
      });

      then('init names the not and the held path it missed', () => {
        expect(result.stdout).toContain('skipped, booted as published until cured');
        expect(result.stdout).toContain('the mod of role=surfer is refused');
      });

      then('init stdout and stderr match their snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });

      then('the boot names the not and the held path it missed', async () => {
        const boot = await invoke({ args: ARGS_BOOT, cwd: repo.path, logOnError: false });
        expect(boot.status).toEqual(0);
        expect(boot.stdout).toContain('<mod.skipped of="surfer">');
        expect(boot.stdout).toContain('briefs/rule.forbid.wipeoutz.md');
        expect(boot.stdout).toContain('published: a wipeout is forbidden');
        expect({
          stdout: asSnapshotSafe(boot.stdout),
          stderr: asSnapshotSafe(boot.stderr),
        }).toMatchSnapshot();
      });
    });

    when('[t1] the typo is fixed, and init renders again', () => {
      const result = useBeforeAll(async () => {
        await setModBootYml({
          repo: repo.path,
          lines: [
            'of: test/surfer@0.9.0',
            'briefs:',
            '  say:',
            '    - briefs/rule.require.reef-etiquette.md',
            '  not:',
            '    - briefs/rule.forbid.wipeouts.md',
          ],
        });
        await invoke({ args: ['init', '--hooks'], cwd: repo.path });
        return invoke({ args: ARGS_BOOT, cwd: repo.path });
      });

      then('the boot exits 0, the not now applied', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('[-] not briefs/rule.forbid.wipeouts.md');
        expect(result.stdout).not.toContain('a wipeout is forbidden');
      });

      then('the boot stdout matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case9] a mod that ships its own .md.min beside a shadow', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods' });
      await fs.writeFile(
        asModPath({ repo: one.path, rel: 'briefs/rule.require.surf-wax.md.min' }),
        'modded (min): wax board and rails\n',
      );
      await invoke({ args: ['init', '--roles', 'surfer'], cwd: one.path });
      return one;
    });

    when('[t0] the role is booted', () => {
      const result = useBeforeAll(async () => invoke({ args: ARGS_BOOT, cwd: repo.path }));

      then('the boot exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the mod minification renders, never the published one', () => {
        expect(result.stdout).toContain('modded (min): wax board and rails');
        expect(result.stdout).not.toContain('published (min): wax the board');
      });

      then('the notice does not claim the published .min is dropped', () => {
        expect(result.stdout).not.toContain('drops the published');
      });

      then('the boot stdout matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case9.1] a mod that ships a .md.min with no .md anywhere', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods' });
      await fs.writeFile(
        asModPath({ repo: one.path, rel: 'briefs/rule.require.tide-charts.md.min' }),
        'an orphan minification\n',
      );
      await invoke({
        args: ['init', '--roles', 'surfer'],
        cwd: one.path,
        logOnError: false,
      });
      return one;
    });

    when('[t0] the role is booted', () => {
      const result = useBeforeAll(async () =>
        invoke({ args: ARGS_BOOT, cwd: repo.path, logOnError: false }),
      );

      then('the boot exits 0, as published', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('<mod.skipped of="surfer">');
        expect(result.stdout).not.toContain('an orphan minification');
      });

      then('the skip notice names the orphan, and what makes it one', () => {
        expect(result.stdout).toContain(
          'it holds briefs/rule.require.tide-charts.md.min, a minified brief with no .md beside it',
        );
      });

      then('the skipped boot matches its snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });
  });

  given('[case9.2] a mod whose say glob adds three briefs', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods' });
      await setModBootYml({
        repo: one.path,
        lines: [
          'of: test/surfer@0.9.0',
          'briefs:',
          '  say:',
          '    - briefs/rule.require.reef-*.md',
          '  not:',
          '    - briefs/rule.forbid.wipeouts.md',
        ],
      });
      for (const slug of ['reef-breaks', 'reef-cuts'])
        await fs.writeFile(
          asModPath({ repo: one.path, rel: `briefs/rule.require.${slug}.md` }),
          `modded: mind the ${slug}\n`,
        );
      await invoke({ args: ['init', '--roles', 'surfer'], cwd: one.path });
      return one;
    });

    when('[t0] the role is booted', () => {
      const result = useBeforeAll(async () => invoke({ args: ARGS_BOOT, cwd: repo.path }));

      then('the boot exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('the notice counts all three adds the glob names', () => {
        expect(result.stdout).toContain('1 shadow, 3 add, 1 not');
      });

      then('each add renders', () => {
        expect(result.stdout).toContain('modded: mind the reef');
        expect(result.stdout).toContain('modded: mind the reef-breaks');
        expect(result.stdout).toContain('modded: mind the reef-cuts');
      });

      then('the boot stdout matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case10] a modded role beside a role no mod names, in one sweep', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods' });
      await invoke({ args: ['init', '--roles', 'surfer', 'lifeguard'], cwd: one.path });
      return one;
    });

    when('[t0] the sweep prices every role', () => {
      const result = useBeforeAll(async () =>
        invoke({ args: ['roles', 'cost', '--all'], cwd: repo.path }),
      );

      then('the sweep exits 0', () => {
        expect(result.status).toEqual(0);
      });

      then('only the modded row carries the changed mark', () => {
        const lines = result.stdout.split('\n');
        const rows = lines.filter((line) => line.includes(' tokens '));
        expect(rows.filter((line) => line.includes('[~] modded'))).toHaveLength(1);
        expect(result.stdout).toContain('lifeguard');
      });

      then('the sweep stdout matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });

  /**
   * .what = a mod boot.yml a mod may not declare, one per row: a key the role owns, an `of:`
   *   that is no role spec, and a mode the role does not use
   */
  const CASES_SPEC_REFUSED = [
    {
      slug: 'case11.1',
      title: 'a mod that declares a budget',
      lines: ['of: test/surfer@0.9.0', 'budget:', '  tokens: 5000', 'briefs:', '  say:', '    - briefs/rule.require.reef-etiquette.md'],
      problem: 'declares a `budget:`',
    },
    {
      slug: 'case11.2',
      title: 'a mod whose of names no role spec',
      lines: ['of: test/surfer/extra', 'briefs:', '  say:', '    - briefs/rule.require.reef-etiquette.md'],
      problem: 'is not a role spec',
    },
    {
      slug: 'case11.3',
      title: 'a mod in subject mode, of a role in simple mode',
      lines: ['of: test/surfer@0.9.0', 'always:', '  briefs:', '    say:', '      - briefs/rule.require.reef-etiquette.md'],
      problem: 'in subject mode',
    },
  ];
  CASES_SPEC_REFUSED.map((thisCase) =>
    given(`[${thisCase.slug}] ${thisCase.title}`, () => {
      const repo = useBeforeAll(async () => {
        const one = await genTestTempRepo({ fixture: 'with-mods' });
        await setModBootYml({ repo: one.path, lines: thisCase.lines });
        return one;
      });

      when('[t0] init renders the view, then the role is booted', () => {
        const result = useBeforeAll(async () => {
          const init = await invoke({
            args: ['init', '--roles', 'surfer'],
            cwd: repo.path,
            logOnError: false,
          });
          const boot = await invoke({ args: ARGS_BOOT, cwd: repo.path, logOnError: false });
          const cost = await invoke({ args: ['roles', 'cost', '--all'], cwd: repo.path });
          return { init, boot, cost };
        });

        then('init exits 0 and names the skipped mod (F01)', () => {
          expect(result.init.status).toEqual(0);
          expect(result.init.stdout).toContain('skipped, booted as published until cured');
          expect(result.init.stdout).toContain('the mod of role=surfer is refused');
        });

        then('init stdout and stderr match their snapshot', () => {
          expect({
            stdout: asSnapshotSafe(result.init.stdout),
            stderr: asSnapshotSafe(result.init.stderr),
          }).toMatchSnapshot();
        });

        then('the sweep reports the refused mod, never refuses: exit 0', () => {
          expect(result.cost.status).toEqual(0);
          expect(result.cost.stdout).toContain('[~] modded, refused');
          expect(asSnapshotSafe(result.cost.stdout)).toMatchSnapshot();
        });

        then('the boot exits 0, as published, and names the problem', () => {
          expect(result.boot.status).toEqual(0);
          expect(result.boot.stdout).toContain('<mod.skipped of="surfer">');
          expect(result.boot.stdout).toContain(thisCase.problem);
          expect(result.boot.stdout).toContain('published: a wipeout is forbidden');
        });

        then('the boot stdout and stderr match their snapshot', () => {
          expect({
            stdout: asSnapshotSafe(result.boot.stdout),
            stderr: asSnapshotSafe(result.boot.stderr),
          }).toMatchSnapshot();
        });
      });
    }),
  );

  /**
   * .what = a mod file of a kind a mod may not change, one per row (usecase 11): a readme, an
   *   init, and a keyrack manifest
   */
  const CASES_KIND_REFUSED = [
    { slug: 'case11.4', title: 'a mod that holds a readme', rel: 'readme.md', content: '# modded readme\n' },
    { slug: 'case11.5', title: 'a mod that holds an init', rel: 'inits/claude.hooks.sh', content: '#!/usr/bin/env bash\necho modded\n' },
    { slug: 'case11.6', title: 'a mod that holds a keyrack manifest', rel: 'keyrack.yml', content: 'org: test\n' },
  ];
  CASES_KIND_REFUSED.map((thisCase) =>
    given(`[${thisCase.slug}] ${thisCase.title}`, () => {
      const repo = useBeforeAll(async () => {
        const one = await genTestTempRepo({ fixture: 'with-mods' });
        const pathFile = asModPath({ repo: one.path, rel: thisCase.rel });
        await fs.mkdir(path.dirname(pathFile), { recursive: true });
        await fs.writeFile(pathFile, thisCase.content);
        return one;
      });

      when('[t0] init renders the view, then the sweep runs and the role is booted', () => {
        const result = useBeforeAll(async () => {
          const init = await invoke({
            args: ['init', '--roles', 'surfer'],
            cwd: repo.path,
            logOnError: false,
          });
          const cost = await invoke({ args: ['roles', 'cost', '--all'], cwd: repo.path });
          const boot = await invoke({ args: ARGS_BOOT, cwd: repo.path, logOnError: false });
          return { init, cost, boot };
        });

        then('init exits 0 and names the file, its kind, and the fix (F01)', () => {
          const output = result.init.stdout;
          expect(result.init.status).toEqual(0);
          expect(output).toContain('skipped, booted as published until cured');
          expect(output).toContain('the mod of role=surfer is refused');
          expect(output).toContain(thisCase.rel);
          expect(output).toContain('a kind a mod cannot change');
          expect(output).toContain('fix =');
        });

        then('init stdout and stderr match their snapshot', () => {
          expect({
            stdout: asSnapshotSafe(result.init.stdout),
            stderr: asSnapshotSafe(result.init.stderr),
          }).toMatchSnapshot();
        });

        then('the sweep reports the refused mod, never refuses: exit 0', () => {
          expect(result.cost.status).toEqual(0);
          expect(result.cost.stdout).toContain('[~] modded, refused');
        });

        then('the sweep stdout and stderr match their snapshot', () => {
          expect({
            stdout: asSnapshotSafe(result.cost.stdout),
            stderr: asSnapshotSafe(result.cost.stderr),
          }).toMatchSnapshot();
        });

        then('the boot exits 0, as published, and names the kind', () => {
          expect(result.boot.status).toEqual(0);
          expect(result.boot.stdout).toContain('<mod.skipped of="surfer">');
          expect(result.boot.stdout).toContain('a kind a mod cannot change');
          expect(result.boot.stdout).toContain('a test role, as published');
        });

        then('the boot stdout and stderr match their snapshot', () => {
          expect({
            stdout: asSnapshotSafe(result.boot.stdout),
            stderr: asSnapshotSafe(result.boot.stderr),
          }).toMatchSnapshot();
        });
      });
    }),
  );

  /**
   * .what = one fault class per row, each of a class no other case covers (C1, C3, C7, C10, C11,
   *   C13 of the vision's fault axis)
   * .why = every class must leave the boot whole and hold the stop until cured; a row whose
   *   `stage` is `boot` plants its fault after the render, as a hand edit or a corrupt write would
   */
  const CASES_FAULT_CLASSES: Array<{
    slug: string;
    title: string;
    stage: 'render' | 'boot';
    plant: (input: { repo: string }) => Promise<void>;
    named: string;
    booted: string;

    /**
     * the problem the repo actor's `<mods.skipped>` tail block names, for a fault no role
     *   carries; null where a role section carries the notice
     */
    tailed: string | null;
  }> = [
    {
      slug: 'case18.1',
      title: 'C1: a mod dir with no boot.yml',
      stage: 'render',
      plant: async ({ repo }) => fs.rm(asModPath({ repo, rel: 'boot.yml' })),
      named: 'it holds no boot.yml',
      booted: '<mod.skipped of="surfer">',
      tailed: null,
    },
    {
      slug: 'case18.2',
      title: 'C3: a mod whose of names a role that is not linked, beside a sound mod',
      stage: 'render',
      plant: async ({ repo }) => {
        const pathModDir = path.join(repo, '.agent', 'repo=.mods', 'role=lifeguard');
        await fs.mkdir(path.join(pathModDir, 'briefs'), { recursive: true });
        await fs.writeFile(path.join(pathModDir, 'boot.yml'), 'of: test/lifeguard\n');
        await fs.writeFile(
          path.join(pathModDir, 'briefs', 'rule.require.whistle.md'),
          'modded: whistle twice, then wave\n',
        );
      },
      named: 'names a role that is not linked',
      booted: '<mod of="test/surfer@0.9.0',
      tailed: 'names a role that is not linked',
    },
    {
      slug: 'case18.3',
      title: 'C7: a not that removes a path the mod also shadows',
      stage: 'render',
      plant: async ({ repo }) =>
        setModBootYml({
          repo,
          lines: [
            'of: test/surfer@0.9.0',
            'briefs:',
            '  say:',
            '    - briefs/rule.require.reef-etiquette.md',
            '  not:',
            '    - briefs/rule.require.surf-wax.md',
          ],
        }),
      named: 'a path the mod also shadows',
      booted: '<mod.skipped of="surfer">',
      tailed: null,
    },
    {
      slug: 'case18.4',
      title: 'C10: a role kind dir that holds a file no link made',
      stage: 'boot',
      plant: async ({ repo }) =>
        fs.writeFile(
          path.join(repo, '.agent', 'repo=test', 'role=surfer', 'briefs', 'rule.require.hand-wax.md'),
          'a brief no link made\n',
        ),
      named: 'a linked role dir holds a file no link made',
      booted: 'ConstraintError: a linked role dir holds a file no link made',
      tailed: null,
    },
    {
      slug: 'case18.5',
      title: 'C11: a corrupt modded view record',
      stage: 'boot',
      plant: async ({ repo }) =>
        fs.writeFile(
          path.join(repo, '.agent', 'repo=test', 'role=surfer', '.modded.json'),
          '{ not json',
        ),
      named: 'the modded view record is unreadable',

      // the brief the mod not-ed boots back, read through the view's file links (no record)
      booted: 'published: a wipeout is forbidden',
      tailed: null,
    },
    {
      slug: 'case18.6',
      title: 'C13: a file where the mods dir belongs',
      stage: 'render',
      plant: async ({ repo }) => {
        const pathMods = path.join(repo, '.agent', 'repo=.mods');
        await fs.rm(pathMods, { recursive: true });
        await fs.writeFile(pathMods, 'not a dir\n');
      },
      named: 'the mods path cannot be read',
      booted: 'published: a wipeout is forbidden',
      tailed: 'the mods path cannot be read',
    },
  ];
  CASES_FAULT_CLASSES.map((thisCase) =>
    given(`[${thisCase.slug}] ${thisCase.title}`, () => {
      const repo = useBeforeAll(async () => {
        const one = await genTestTempRepo({ fixture: 'with-mods' });
        if (thisCase.stage === 'render') await thisCase.plant({ repo: one.path });
        const init = await invoke({
          args: ['init', '--roles', 'surfer'],
          cwd: one.path,
          logOnError: false,
        });
        if (thisCase.stage === 'boot') await thisCase.plant({ repo: one.path });
        return { path: one.path, init };
      });

      when('[t0] the role is booted, then a session stops', () => {
        const result = useBeforeAll(async () => {
          const boot = await invoke({ args: ARGS_BOOT, cwd: repo.path, logOnError: false });
          const stop = await invoke({
            args: ['roles', 'cost', '--all', '--when', 'hook.onStop'],
            cwd: repo.path,
            logOnError: false,
          });
          return { boot, stop };
        });

        then('init exits 0 (F01)', () => {
          expect(repo.init.status).toEqual(0);
        });

        then('the boot exits 0, and renders what it can', () => {
          expect(result.boot.status).toEqual(0);
          expect(result.boot.stdout).toContain(thisCase.booted);
        });

        then('the stop holds, exit 2, and names the fault (F02)', () => {
          expect(result.stop.status).toEqual(2);
          expect(result.stop.stderr).toContain('held at the first stop of each turn until cured');
          expect(result.stop.stderr).toContain(thisCase.named);
        });

        then('the repo actor boot.md tails a fault no role carries, else holds no tail block', async () => {
          const boot = await fs.readFile(
            asAmbientBrainPath({ repo: repo.path, file: 'boot.md' }),
            'utf-8',
          );
          if (!thisCase.tailed) return expect(boot).not.toContain('<mods.skipped>');
          const tail = boot.slice(boot.lastIndexOf('<mods.skipped>'));
          expect(tail).toContain(thisCase.tailed);
          expect(tail).toContain('fix = ');
        });

        then('init, boot and stop output match their snapshot', () => {
          expect({
            init: asSnapshotSafe(repo.init.stdout),
            boot: asSnapshotSafe(result.boot.stdout),
            bootStderr: asSnapshotSafe(result.boot.stderr),
            stop: asSnapshotSafe(result.stop.stderr),
          }).toMatchSnapshot();
        });
      });
    }),
  );

  given('[case11.7] a published role whose own boot.yml declares `of:` (usecase 11)', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods' });

      // no mod here: the `of:` sits in the role's own spec, as a publisher might ship it
      await fs.rm(path.join(one.path, '.agent', 'repo=.mods'), { recursive: true });
      const pathRoleSpec = path.join(
        one.path, 'node_modules', 'rhachet-roles-test', 'roles', 'surfer', 'boot.yml',
      );
      const spec = await fs.readFile(pathRoleSpec, 'utf-8');
      await fs.writeFile(pathRoleSpec, `of: test/surfer@1.0.0\n${spec}`);
      await invoke({ args: ['init', '--roles', 'surfer'], cwd: one.path, logOnError: false });
      return one;
    });

    when('[t0] the role is booted', () => {
      const result = useBeforeAll(async () =>
        invoke({ args: ARGS_BOOT, cwd: repo.path, logOnError: false }),
      );

      then('the boot exits 2 and names the key and where it belongs', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('boot.yml declares `of:`, which belongs only in a mod boot.yml');
        expect(result.stderr).toContain('.agent/repo=.mods/role=<role>/boot.yml');
      });

      then('the boot stdout and stderr match their snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });
  });

  given('[case12] a mod that adds a brief', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods' });
      await invoke({ args: ['init', '--roles', 'surfer'], cwd: one.path });
      const costModded = await invoke({ args: ['roles', 'cost', '--all'], cwd: one.path });
      return { path: one.path, costModded };
    });

    when('[t0] the mod is deleted and the sweep prices the role again', () => {
      const result = useBeforeAll(async () => {
        await fs.rm(path.join(repo.path, '.agent', 'repo=.mods'), { recursive: true });
        await invoke({ args: ['init', '--roles', 'surfer'], cwd: repo.path });
        return invoke({ args: ['roles', 'cost', '--all'], cwd: repo.path });
      });

      then('the token count moves with the modded payload', () => {
        const asTokens = (stdout: string): number =>
          Number(/(\d[\d,]*) tokens/.exec(stdout)?.[1]?.replace(/,/g, '') ?? NaN);
        expect(asTokens(repo.costModded.stdout)).not.toBeNaN();
        expect(asTokens(result.stdout)).not.toBeNaN();
        expect(asTokens(result.stdout)).not.toEqual(asTokens(repo.costModded.stdout));
      });

      then('the published row carries no mod mark', () => {
        expect(result.stdout).not.toContain('[~] modded');
      });

      then('the sweep stdout and stderr match their snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });
  });

  given('[case13] a mod that nots a skill', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods' });
      await invoke({ args: ['init', '--roles', 'surfer'], cwd: one.path });
      const nameSkill = SKILL_NOTED.replace(/\.sh$/, '');
      const runBefore = await invoke({
        args: ['run', '--skill', nameSkill],
        cwd: one.path,
        logOnError: false,
      });
      await setModBootYml({
        repo: one.path,
        lines: [
          'of: test/surfer@0.9.0',
          'briefs:',
          '  say:',
          '    - briefs/rule.require.reef-etiquette.md',
          'skills:',
          '  not:',
          `    - skills/${SKILL_NOTED}`,
        ],
      });
      const initAfter = await invoke({ args: ['init', '--hooks'], cwd: one.path, logOnError: false });
      return { path: one.path, nameSkill, runBefore, initAfter };
    });

    when('[t0] the not-ed skill is run by name', () => {
      const result = useBeforeAll(async () =>
        invoke({ args: ['run', '--skill', repo.nameSkill], cwd: repo.path, logOnError: false }),
      );

      then('before the mod, the published skill runs', () => {
        expect(repo.runBefore.status).toEqual(0);
      });

      then('after the mod, the skill is not found, though the published role ships it', () => {
        expect(repo.initAfter.status).toEqual(0);
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain(`no skill "${repo.nameSkill}" found`);
      });

      // usecase 9 [t2]: the refusal names the mod's not as the cause, never a bare not-found
      then("the refusal names the mod's not: as the cause, and no relink tip", () => {
        expect(result.stderr).toContain('a mod in this repo nots it');
        expect(result.stderr).toContain(
          `.agent/repo=.mods/role=surfer/boot.yml nots skills/${SKILL_NOTED} (of test/surfer)`,
        );
        expect(result.stderr).not.toContain('roles link');
      });

      then('the not-found stderr matches its snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });

      then('the published skill file is untouched in the package', async () => {
        const pathPublished = path.join(
          repo.path, 'node_modules', 'rhachet-roles-test', 'roles', 'surfer', 'skills', SKILL_NOTED,
        );
        await expect(fs.access(pathPublished)).resolves.toBeUndefined();
      });
    });
  });

  given('[case13.1] `rhx list` over a role whose mod shadows one skill and nots another', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods' });

      // `rhx list` reads the repo's rhachet config; the fixture ships none
      await fs.writeFile(
        path.join(one.path, 'rhachet.use.ts'),
        'export const getRoleRegistries = () => [];\nexport const getBrainRepls = () => [];\n',
      );

      // the mod shadows wax.board.sh and nots wax.lib.sh
      const pathShadow = asModPath({ repo: one.path, rel: 'skills/wax.board.sh' });
      await fs.mkdir(path.dirname(pathShadow), { recursive: true });
      await fs.writeFile(pathShadow, '#!/usr/bin/env bash\necho "waxed, modded"\n', { mode: 0o755 });
      await setModBootYml({
        repo: one.path,
        lines: [
          'of: test/surfer@0.9.0',
          'briefs:',
          '  say:',
          '    - briefs/rule.require.reef-etiquette.md',
          'skills:',
          '  not:',
          '    - skills/wax.lib.sh',
        ],
      });
      const linked = await invoke({ args: ['init', '--roles', 'surfer'], cwd: one.path, logOnError: false });
      return { path: one.path, linked };
    });

    when('[t0] `rhx list` is invoked', () => {
      const result = useBeforeAll(async () =>
        invoke({ binary: 'rhx', args: ['list'], cwd: repo.path, logOnError: false }),
      );

      then('init and list both exit 0', () => {
        expect(repo.linked.status).toEqual(0);
        expect(result.status).toEqual(0);
      });

      then('the shadowed skill is listed once', () => {
        expect(result.stdout.split('wax.board').length - 1).toEqual(1);
      });

      then('the not-ed skill is not listed (usecase 9)', () => {
        expect(result.stdout).not.toContain('wax.lib');
      });

      then('the mods dir is never listed as a repo or a role (usecase 11)', () => {
        expect(result.stdout).not.toContain('.mods');
        expect(result.stdout).toContain('repo=test');
        expect(result.stdout).toContain('role=surfer');
      });

      then('the list stdout and stderr match their snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });
  });

  given('[case14] a mod that nots a skill its role hook invokes (usecase 9)', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods' });

      // the published lifeguard, as its package loads: a boot hook that runs `rhx flags.raise`
      const pathRegistry = path.join(one.path, 'node_modules', 'rhachet-roles-test', 'dist', 'index.js');
      const registry = await fs.readFile(pathRegistry, 'utf-8');
      await fs.writeFile(
        pathRegistry,
        registry.replace(
          "purpose: 'test role no mod names',",
          "purpose: 'test role no mod names',\n      hooks: { onBrain: { onBoot: [{ command: 'rhx flags.raise', timeout: '5s' }] } },",
        ),
      );
      await fs.rm(path.join(one.path, '.agent', 'repo=.mods', 'role=surfer'), { recursive: true });
      const pathSpec = path.join(one.path, '.agent', 'repo=.mods', 'role=lifeguard', 'boot.yml');
      await fs.mkdir(path.dirname(pathSpec), { recursive: true });
      await fs.writeFile(pathSpec, 'of: test/lifeguard@1.0.0\nskills:\n  not:\n    - skills/flags.raise.sh\n');
      return one;
    });

    when('[t0] init renders the view', () => {
      const result = useBeforeAll(async () =>
        invoke({ args: ['init', '--roles', 'surfer', 'lifeguard'], cwd: repo.path, logOnError: false }),
      );

      then('init exits 0, and names the skipped mod (F01)', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('skipped, booted as published until cured');
        expect(result.stdout).toContain('the mod of role=lifeguard is refused');
      });

      then('the skip names its class once, and its fix once', () => {
        expect(result.stdout).not.toContain('ConstraintError: ✋ ConstraintError');
        expect(result.stdout.split('"fix":')).toHaveLength(1);
        expect(result.stdout.split('fix = ')).toHaveLength(2);
      });

      then('the boot of lifeguard boots as published, and names the hook and the shadow fix', async () => {
        const boot = await invoke({
          args: ['roles', 'boot', '--repo', 'test', '--role', 'lifeguard'],
          cwd: repo.path,
          logOnError: false,
        });
        expect(boot.status).toEqual(0);
        expect(boot.stdout).toContain('<mod.skipped of="lifeguard">');
        expect(boot.stdout).toContain("removes a skill one of the role's hooks invokes");
        expect(boot.stdout).toContain('rhx flags.raise');
        expect(boot.stdout).toContain('shadow skills/flags.raise.sh');
        expect({
          stdout: asSnapshotSafe(boot.stdout),
          stderr: asSnapshotSafe(boot.stderr),
        }).toMatchSnapshot();
      });

      then('the published skill is still there: the refused mod left no half view', async () => {
        const run = await invoke({
          args: ['run', '--skill', 'flags.raise'],
          cwd: repo.path,
          logOnError: false,
        });
        expect(run.status).toEqual(0);
        expect(run.stdout).toContain('flags raised');
      });

      then('init stdout and stderr match their snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });
  });

  given('[case15] a mod whose of names no version, of a role that moved (usecase 5)', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods' });
      await setModBootYml({
        repo: one.path,
        lines: [
          'of: test/surfer',
          'briefs:',
          '  say:',
          '    - briefs/rule.require.reef-etiquette.md',
          '  not:',
          '    - briefs/rule.forbid.wipeouts.md',
        ],
      });
      const init = await invoke({ args: ['init', '--roles', 'surfer'], cwd: one.path });
      return { path: one.path, init };
    });

    when('[t0] a session stops, with 1.0.0 installed', () => {
      const result = useBeforeAll(async () =>
        invoke({
          args: ['roles', 'cost', '--all', '--when', 'hook.onStop'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('the stop is clear: no pin, so no version pester', () => {
        expect(repo.init.status).toEqual(0);
        expect(result.status).toEqual(0);
        expect(result.stderr).not.toContain('the modded role moved');
      });

      then('the stop stdout and stderr match their snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });

    when('[t1] the not is retyped to a path the role does not hold', () => {
      const result = useBeforeAll(async () => {
        await setModBootYml({
          repo: repo.path,
          lines: [
            'of: test/surfer',
            'briefs:',
            '  not:',
            '    - briefs/rule.forbid.wipeoutz.md',
          ],
        });
        await invoke({ args: ['init', '--hooks'], cwd: repo.path, logOnError: false });
        return invoke({ args: ARGS_BOOT, cwd: repo.path, logOnError: false });
      });

      then('the refusals still apply: the mod is skipped, the role boots as published, and the skip names it', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('<mod.skipped of="surfer">');
        expect(result.stdout).toContain('the mod of role=surfer is refused');
        expect(result.stdout).toContain('published: a wipeout is forbidden');
      });

      then('the skipped boot stdout and stderr match their snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });
  });

  given('[case16] a stray entry under .agent/repo=.mods, beside a sound mod', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods' });
      const init = await invoke({ args: ['init', '--roles', 'surfer'], cwd: one.path });
      await fs.writeFile(
        path.join(one.path, '.agent', 'repo=.mods', 'readme.md'),
        'notes on our mods\n',
      );
      return { path: one.path, init };
    });

    when('[t0] the sweep prices every role', () => {
      const result = useBeforeAll(async () =>
        invoke({ args: ['roles', 'cost', '--all'], cwd: repo.path, logOnError: false }),
      );

      then('the report names the stray entry, and never refuses: exit 0', () => {
        expect(repo.init.status).toEqual(0);
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('an entry that names no role');
        expect(result.stdout).toContain('readme.md');
      });

      then('the report stdout matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] a session stops', () => {
      const result = useBeforeAll(async () =>
        invoke({
          args: ['roles', 'cost', '--all', '--when', 'hook.onStop'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then("the stop holds on the sound mod's moved pin, and on the stray with its fix (F02)", () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('role    = test/surfer');
        expect(result.stderr).toContain('a mods dir holds an entry that names no role');
        expect(result.stderr).toContain(
          'fix = rename .agent/repo=.mods/readme.md to .agent/repo=.mods/role=<slug>',
        );
      });

      then('the stop stdout and stderr match their snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });
  });

  given('[case17] a mod of a role whose package ships no boot.yml', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods' });
      await setPackageWithoutBootSpec({ repo: one.path, role: 'lifeguard' });
      const pathModDir = path.join(one.path, '.agent', 'repo=.mods', 'role=lifeguard');
      await fs.mkdir(path.join(pathModDir, 'briefs'), { recursive: true });
      await fs.writeFile(path.join(pathModDir, 'boot.yml'), 'of: test/lifeguard\n');
      await fs.writeFile(
        path.join(pathModDir, 'briefs', 'rule.require.whistle.md'),
        'modded: whistle twice, then wave\n',
      );
      const init = await invoke({
        args: ['init', '--roles', 'surfer', 'lifeguard'],
        cwd: one.path,
        logOnError: false,
      });
      return { path: one.path, init };
    });

    when('[t0] the sweep prices every role', () => {
      const result = useBeforeAll(async () =>
        invoke({ args: ['roles', 'cost', '--all'], cwd: repo.path, logOnError: false }),
      );

      then('the report names the modded role it could not price, and never refuses: exit 0', () => {
        expect(repo.init.status).toEqual(0);
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('[~] modded, with no boot.yml to cost');
        expect(result.stdout).toContain('test/lifeguard');
      });

      then('the report stdout matches its snapshot', () => {
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot();
      });
    });
  });
});

/**
 * .what = a copy of the installed `test` package whose `role` ships no boot.yml
 * .why = a role with no boot.yml has no row in the cost roster, so the sweep must name its mod apart
 */
const setPackageWithoutBootSpec = async (input: {
  repo: string;
  role: string;
}): Promise<void> => {
  const pathPackage = path.join(input.repo, 'node_modules', 'rhachet-roles-test');
  await fs.rm(path.join(pathPackage, 'roles', input.role, 'boot.yml'));
  const lineBoot = `boot: roles/${input.role}/boot.yml`;
  const pathManifest = path.join(pathPackage, 'rhachet.repo.yml');
  const manifest = await fs.readFile(pathManifest, 'utf-8');
  await fs.writeFile(
    pathManifest,
    manifest
      .split('\n')
      .filter((line) => line.trim() !== lineBoot)
      .join('\n'),
  );
  const pathDist = path.join(pathPackage, 'dist', 'index.js');
  const dist = await fs.readFile(pathDist, 'utf-8');
  await fs.writeFile(
    pathDist,
    dist
      .split('\n')
      .filter((line) => line.trim() !== `boot: { uri: 'roles/${input.role}/boot.yml' },`)
      .join('\n'),
  );
};

/**
 * .what = rewrite the mod's boot.yml of `surfer`
 */
const setModBootYml = (input: { repo: string; lines: string[] }): Promise<void> =>
  setRoleModBootYml({ ...input, role: 'surfer' });

/**
 * .what = a release of the installed `test/surfer` that removes some published briefs
 * .why = a mod pinned to the prior release must no longer apply where the path it names is gone
 *
 * .note = the role's boot.yml drops each removed brief too, as a real release would
 */
const setPackageRelease = async (input: {
  repo: string;
  removed: string[];
}): Promise<void> => {
  const roleDir = path.join(
    input.repo,
    'node_modules',
    'rhachet-roles-test',
    'roles',
    'surfer',
  );
  for (const name of input.removed)
    await fs.rm(path.join(roleDir, 'briefs', name), { force: true });
  const pathBootYml = path.join(roleDir, 'boot.yml');
  const bootYml = await fs.readFile(pathBootYml, 'utf-8');
  await fs.writeFile(
    pathBootYml,
    bootYml
      .split('\n')
      .filter((line) => !input.removed.some((name) => line.endsWith(`briefs/${name}`)))
      .join('\n'),
  );
};
