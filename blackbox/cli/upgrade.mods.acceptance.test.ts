import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { ConstraintError } from 'helpful-errors';
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
    env: { HOME: genTempDir({ slug: 'upgrade-mods-home' }), ...input.env },
  });

/**
 * .what = the proof that `rhx upgrade` names a mod pinned to a version its role moved off
 *         (usecase 5), and still exits 0
 * .note = the fixture's dep is a `file:` ref, so the upgrade installs naught and needs no network
 */
describe('rhx upgrade — a repo with .agent/repo=.mods', () => {
  given('[case1] a mod pinned to 0.9.0, of a role installed at 1.0.0', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods' });
      const linked = await invoke({ args: ['init', '--roles', 'surfer'], cwd: one.path });
      if (linked.status !== 0)
        throw new ConstraintError('init --roles surfer failed', {
          stderr: linked.stderr,
          hint: 'run `npm run build` so the fixture sees a fresh dist, then re-run',
        });
      return one;
    });

    when('[t0] `rhx upgrade --roles test/surfer --which local`', () => {
      const result = useBeforeAll(async () =>
        invoke({
          args: ['upgrade', '--roles', 'test/surfer', '--which', 'local'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it exits 0: a drifted mod is named, never a halt', () => {
        expect(result.status).toEqual(0);
      });

      then('it names the modded role, both versions, and the pin to set', () => {
        expect(result.stdout).toContain('🧢 the modded role moved');
        expect(result.stdout).toContain('0.9.0');
        expect(result.stdout).toContain('1.0.0');
        expect(result.stdout).toContain('of: test/surfer@1.0.0');
      });

      then('the drift notice matches its snapshot', () => {
        const notice = result.stdout.slice(result.stdout.indexOf('🧢 the modded role moved'));
        expect(asSnapshotSafe(notice)).toMatchSnapshot();
      });

      then('the whole upgrade output matches its snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });
  });

  given('[case1.1] two mods pinned to 0.9.0, of two roles installed at 1.0.0', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods' });

      // a second mod, of lifeguard, pinned to the same stale version
      const modDir = path.join(one.path, '.agent', 'repo=.mods', 'role=lifeguard');
      await fs.mkdir(path.join(modDir, 'briefs'), { recursive: true });
      await fs.writeFile(
        path.join(modDir, 'boot.yml'),
        [
          'of: test/lifeguard@0.9.0',
          'briefs:',
          '  say:',
          '    - briefs/rule.require.rip-currents.md',
          '',
        ].join('\n'),
      );
      await fs.writeFile(
        path.join(modDir, 'briefs', 'rule.require.rip-currents.md'),
        'modded: point out the rip currents\n',
      );

      const linked = await invoke({
        args: ['init', '--roles', 'surfer', 'lifeguard'],
        cwd: one.path,
      });
      if (linked.status !== 0)
        throw new ConstraintError('init --roles surfer lifeguard failed', {
          stderr: linked.stderr,
          hint: 'run `npm run build` so the fixture sees a fresh dist, then re-run',
        });
      return one;
    });

    when('[t0] `rhx upgrade --roles test/* --which local`', () => {
      const result = useBeforeAll(async () =>
        invoke({
          args: ['upgrade', '--roles', 'test/*', '--which', 'local'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it exits 0: two drifted mods are named, never a halt', () => {
        expect(result.status).toEqual(0);
      });

      then('it names each modded role and the pin to set for each', () => {
        expect(result.stdout).toContain('of: test/surfer@1.0.0');
        expect(result.stdout).toContain('of: test/lifeguard@1.0.0');
      });

      then('the drift notice matches its snapshot', () => {
        const notice = result.stdout.slice(result.stdout.indexOf('🧢 the modded role moved'));
        expect(asSnapshotSafe(notice)).toMatchSnapshot();
      });

      then('the whole upgrade output matches its snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });
  });

  given('[case2] a release that drops the path a mod nots', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods' });
      const linked = await invoke({ args: ['init', '--roles', 'surfer'], cwd: one.path });
      if (linked.status !== 0)
        throw new ConstraintError('init --roles surfer failed', {
          stderr: linked.stderr,
          hint: 'run `npm run build` so the fixture sees a fresh dist, then re-run',
        });
      await setPackageReleaseWithout({ repo: one.path, brief: 'rule.forbid.wipeouts.md' });
      return one;
    });

    when('[t0] `rhx upgrade --roles test/surfer --which local`', () => {
      const result = useBeforeAll(async () =>
        invoke({
          args: ['upgrade', '--roles', 'test/surfer', '--which', 'local'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it exits 2: the brain dir sync refuses the boot the mod would break', () => {
        expect(result.status).toEqual(2);
      });

      then('it names the mod that no longer applies, at the upgrade', () => {
        expect(result.stdout).toContain('🧢 a mod no longer applies');
        expect(result.stdout).toContain('role=surfer');
      });

      then('the refusal readout matches its snapshot', () => {
        const readout = result.stdout.slice(
          result.stdout.indexOf('🧢 a mod no longer applies'),
        );
        expect({ status: result.status, readout: asSnapshotSafe(readout) }).toMatchSnapshot();
      });

      then('the refusal stderr matches its snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });

      then('the whole upgrade output matches its snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });
  });
});

/**
 * .what = a release of the installed `test/surfer` that removes one published brief
 * .why = a mod that nots the removed path no longer applies; the upgrade must say so
 *
 * .note = the role's boot.yml drops the brief too, as a real release would
 */
const setPackageReleaseWithout = async (input: {
  repo: string;
  brief: string;
}): Promise<void> => {
  const roleDir = path.join(input.repo, 'node_modules', 'rhachet-roles-test', 'roles', 'surfer');
  await fs.rm(path.join(roleDir, 'briefs', input.brief));
  const pathBootYml = path.join(roleDir, 'boot.yml');
  const bootYml = await fs.readFile(pathBootYml, 'utf-8');
  await fs.writeFile(
    pathBootYml,
    bootYml
      .split('\n')
      .filter((line) => !line.endsWith(`briefs/${input.brief}`))
      .join('\n'),
  );
};
