import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

import { getAllActorHashDirNames } from '@/blackbox/.test/infra/brainDirBootJourney';
import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { setupStubBrainPath } from '@/blackbox/.test/infra/setupStubBrainPath';

/**
 * .what = the cli, run in a HOME with no grove, so no brain dir arrow reaches the host
 */
const invoke = (
  input: Parameters<typeof invokeRhachetCliBinary>[0],
): ReturnType<typeof invokeRhachetCliBinary> =>
  invokeRhachetCliBinary({
    ...input,
    env: { HOME: genTempDir({ slug: 'enroll-mods-home' }), ...input.env },
  });

/**
 * .what = a temp repo from a fixture, its roles linked, a stub brain on its PATH
 * .why = enroll's last act spawns the brain; a stub that exits 0 lets the run finish and leaves
 *        the actor dir to assert on
 */
const genRepoEnrollable = async (input: {
  fixture: string;
  roles: string[];
}): Promise<{ path: string; stubPath: string }> => {
  const repo = await genTestTempRepo({ fixture: input.fixture });
  await invoke({
    args: ['init', '--roles', ...input.roles],
    cwd: repo.path,
    logOnError: false,
  });
  return { path: repo.path, stubPath: setupStubBrainPath({ dir: repo.path }) };
};

/**
 * .what = enroll a stub claude at a roleset
 */
const enroll = (input: { repo: { path: string; stubPath: string }; roles: string }) =>
  invoke({
    args: ['enroll', 'claude', '--roles', input.roles],
    cwd: input.repo.path,
    env: { PATH: input.repo.stubPath },
    logOnError: false,
  });

/**
 * .what = write the mod's boot.yml of `surfer`
 */
const setModBootYml = async (input: { repo: string; lines: string[] }): Promise<void> => {
  const pathSpec = path.join(input.repo, '.agent', 'repo=.mods', 'role=surfer', 'boot.yml');
  await fs.mkdir(path.dirname(pathSpec), { recursive: true });
  await fs.writeFile(pathSpec, `${input.lines.join('\n')}\n`);
};

/**
 * .what = the boot.md of each hash actor an enroll rendered, joined into one text
 * .why = a refused enroll may leave a hash dir with no boot.md; only a rendered boot is read
 */
const getOneActorBootMd = async (input: { repo: string }): Promise<string> => {
  const boots = await Promise.all(
    getAllActorHashDirNames({ dir: input.repo }).map((hashDir) =>
      fs
        .readFile(
          path.join(input.repo, '.agent', '.actors', hashDir, 'brain', '.claude', 'boot.md'),
          'utf-8',
        )
        .catch((error: unknown) => {
          // only an absent boot.md reads as empty; every other fault fails loud
          // structural, never instanceof: a node fs error fails `instanceof Error` in the jest realm
          const isAbsent =
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === 'ENOENT';
          if (isAbsent) return '';
          throw error;
        }),
    ),
  );
  // an absent boot reads as empty and is dropped, so the joined text closes as each boot does
  return boots.filter((boot) => boot.length > 0).join('\n');
};

describe('rhx enroll — a role modded via .agent/repo=.mods', () => {
  given('[case1] a mod whose of names its linked role', () => {
    const repo = useBeforeAll(async () =>
      genRepoEnrollable({ fixture: 'with-mods', roles: ['surfer', 'lifeguard'] }),
    );

    when('[t0] a clone is enrolled with the modded role', () => {
      const result = useBeforeAll(async () => enroll({ repo, roles: 'surfer' }));

      then('it exits 0', () => {
        expect(result.status).toEqual(0);
      });

      const actor = useThen('the actor boot is read', async () => ({
        boot: await getOneActorBootMd({ repo: repo.path }),
      }));

      then('the actor boot carries the mod notice, the shadow, and no not-ed brief', () => {
        expect(actor.boot).toContain('<mod of="test/surfer@0.9.0 (installed 1.0.0)">');
        expect(actor.boot).toContain('modded: wax the board, then wax the rails');
        expect(actor.boot).not.toContain('a wipeout is forbidden');
      });

      then('the actor boot.md matches its snapshot', () => {
        expect(asSnapshotSafe(actor.boot)).toMatchSnapshot();
      });

      then('the enroll output matches its snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });
  });

  given('[case2] a mod with no of', () => {
    const repo = useBeforeAll(async () => {
      const one = await genRepoEnrollable({
        fixture: 'with-mods',
        roles: ['surfer', 'lifeguard'],
      });
      await setModBootYml({
        repo: one.path,
        lines: ['briefs:', '  say:', '    - briefs/rule.require.reef-etiquette.md'],
      });
      return one;
    });

    when('[t0] a clone is enrolled with the modded role', () => {
      const result = useBeforeAll(async () => enroll({ repo, roles: 'surfer' }));

      then('it is refused as a constraint, exit 2', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal names the absent of', () => {
        expect(result.stderr).toContain('of');
        expect(result.stderr).toContain('role=surfer');
      });

      then('the refusal stderr matches its snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] a clone is enrolled without the modded role (usecase 12)', () => {
      const result = useBeforeAll(async () => enroll({ repo, roles: 'lifeguard' }));

      then('it exits 0: a bad mod fails only the actor that carries its role', () => {
        expect(result.status).toEqual(0);
      });

      const actor = useThen('the actor boot is read', async () => ({
        boot: await getOneActorBootMd({ repo: repo.path }),
      }));

      then('the actor boot carries the role, and no mod', () => {
        expect(actor.boot).toContain('blow the whistle before a swimmer passes the flags');
        expect(actor.boot).not.toContain('<mod of=');
      });

      then('the actor boot.md matches its snapshot', () => {
        expect(asSnapshotSafe(actor.boot)).toMatchSnapshot();
      });

      then('the enroll output matches its snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });
  });

  given('[case3] a mod whose of names no linked role', () => {
    const repo = useBeforeAll(async () => {
      const one = await genRepoEnrollable({ fixture: 'with-mods', roles: ['surfer'] });
      await setModBootYml({
        repo: one.path,
        lines: [
          'of: ghost/surfer',
          'briefs:',
          '  say:',
          '    - briefs/rule.require.reef-etiquette.md',
        ],
      });
      return one;
    });

    when('[t0] a clone is enrolled with the role', () => {
      const result = useBeforeAll(async () => enroll({ repo, roles: 'surfer' }));

      then('it is refused, exit 2, and names the unlinked of', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('ghost/surfer');
      });

      then('the refusal stderr matches its snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case4] a mod of a .this role (F18)', () => {
    const repo = useBeforeAll(async () => {
      const one = await genRepoEnrollable({ fixture: 'with-mods', roles: ['lifeguard'] });
      const roleDir = path.join(one.path, '.agent', 'repo=.this', 'role=surfer');
      await fs.mkdir(path.join(roleDir, 'briefs'), { recursive: true });
      await fs.writeFile(path.join(roleDir, 'readme.md'), '# surfer, native\n');
      await fs.writeFile(
        path.join(roleDir, 'briefs', 'rule.require.surf-wax.md'),
        'native: wax the board\n',
      );

      // a boot.yml makes the native role a linked role, so the enroll finds it and its boot
      //   is what refuses the mod, never an absent role
      await fs.writeFile(
        path.join(roleDir, 'boot.yml'),
        ['briefs:', '  say:', '    - briefs/rule.require.surf-wax.md', ''].join('\n'),
      );
      await fs.rm(path.join(one.path, '.agent', 'repo=test', 'role=surfer'), {
        recursive: true,
        force: true,
      });
      await setModBootYml({
        repo: one.path,
        lines: [
          'of: .this/surfer',
          'briefs:',
          '  say:',
          '    - briefs/rule.require.reef-etiquette.md',
        ],
      });
      return one;
    });

    when('[t0] a clone is enrolled with the .this role', () => {
      const result = useBeforeAll(async () => enroll({ repo, roles: 'surfer' }));

      then('it is refused, exit 2', () => {
        expect(result.status).toEqual(2);
      });

      then('the refusal is the mod own, never an absent role', () => {
        expect(result.stderr).toContain('names a role this repo owns');
        expect(result.stderr).not.toContain("role 'surfer' not found");
      });

      then('the refusal names the in-place edit', () => {
        expect(result.stderr).toContain(
          'edit .agent/repo=.this/role=surfer/ in place, and delete the mod',
        );
      });

      then('the refusal stderr matches its snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case5] two linked roles of one slug, a mod whose bare of names both', () => {
    const repo = useBeforeAll(async () => {
      const one = await genRepoEnrollable({
        fixture: 'with-same-slug-roles',
        roles: ['alpha/surfer', 'beta/surfer'],
      });
      await setModBootYml({
        repo: one.path,
        lines: [
          'of: surfer',
          'briefs:',
          '  say:',
          '    - briefs/rule.require.reef-etiquette.md',
        ],
      });
      const modBriefs = path.join(one.path, '.agent', 'repo=.mods', 'role=surfer', 'briefs');
      await fs.mkdir(modBriefs, { recursive: true });
      await fs.writeFile(
        path.join(modBriefs, 'rule.require.reef-etiquette.md'),
        'modded: mind the reef\n',
      );
      return one;
    });

    when('[t0] a clone is enrolled with both', () => {
      const result = useBeforeAll(async () =>
        enroll({ repo, roles: 'alpha/surfer,beta/surfer' }),
      );

      then('it is refused as ambiguous, exit 2, and names each linked form', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('alpha/surfer');
        expect(result.stderr).toContain('beta/surfer');
      });

      then('the refusal stderr matches its snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] the of pins one of the two, and a clone is enrolled with both', () => {
      const result = useBeforeAll(async () => {
        await setModBootYml({
          repo: repo.path,
          lines: [
            'of: beta/surfer',
            'briefs:',
            '  say:',
            '    - briefs/rule.require.reef-etiquette.md',
          ],
        });
        await invoke({ args: ['init', '--hooks'], cwd: repo.path, logOnError: false });
        return enroll({ repo, roles: 'alpha/surfer,beta/surfer' });
      });

      then('it exits 0', () => {
        expect(result.status).toEqual(0);
      });

      const actor = useThen('the actor boot is read', async () => ({
        boot: await getOneActorBootMd({ repo: repo.path }),
      }));

      then('the mod applies to the pinned role alone', () => {
        expect(actor.boot).toContain('<mod of="beta/surfer');
        expect(actor.boot).toContain('modded: mind the reef');
        expect(actor.boot).toContain('alpha: ride a longboard on small days');
        expect(actor.boot).toContain('beta: ride a shortboard on big days');
      });

      then('the actor boot.md matches its snapshot', () => {
        expect(asSnapshotSafe(actor.boot)).toMatchSnapshot();
      });

      then('the enroll output matches its snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });
  });

  given('[case6] a mod deleted, then a clone re-enrolled (usecase 7)', () => {
    const repo = useBeforeAll(async () => {
      // lifeguard linked too, so `--roles surfer` differs from the ambient set: a hash actor
      const one = await genRepoEnrollable({
        fixture: 'with-mods',
        roles: ['surfer', 'lifeguard'],
      });
      await fs.rm(path.join(one.path, '.agent', 'repo=.mods'), { recursive: true });
      return one;
    });

    when('[t0] a clone is enrolled with the role', () => {
      const result = useBeforeAll(async () => enroll({ repo, roles: 'surfer' }));

      then('it exits 0', () => {
        expect(result.status).toEqual(0);
      });

      const actor = useThen('the actor boot is read', async () => ({
        boot: await getOneActorBootMd({ repo: repo.path }),
      }));

      then('the role boots as published: no notice, the not-ed brief back', () => {
        expect(actor.boot).not.toContain('<mod of=');
        expect(actor.boot).toContain('a wipeout is forbidden');
      });

      then('the actor boot.md matches its snapshot', () => {
        expect(asSnapshotSafe(actor.boot)).toMatchSnapshot();
      });

      then('the enroll names the role returned to published', () => {
        expect(`${result.stdout}\n${result.stderr}`).toContain(
          'returned to published, its mod gone',
        );
      });

      then('the enroll output matches its snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });
  });

  given('[case7] a stray entry under .agent/repo=.mods (usecase 12)', () => {
    const repo = useBeforeAll(async () => {
      const one = await genRepoEnrollable({
        fixture: 'with-mods',
        roles: ['surfer', 'lifeguard'],
      });
      await fs.writeFile(
        path.join(one.path, '.agent', 'repo=.mods', 'readme.md'),
        'notes on our mods\n',
      );
      return one;
    });

    when('[t0] a clone is enrolled with no modded role', () => {
      const result = useBeforeAll(async () => enroll({ repo, roles: 'lifeguard' }));

      then('it exits 0: a stray holds no mod, so it blocks no enroll', () => {
        expect(result.status).toEqual(0);
      });

      then('the render names the stray, with the rename fix', () => {
        const output = [result.stdout, result.stderr].join('\n');
        expect(output).toContain('.agent/repo=.mods/readme.md');
        expect(output).toContain('role=<slug>');
      });

      then('the stray is named once, never again by the detached host', () => {
        const mentions = result.stderr.split('a mods dir holds an entry that names no role');
        expect(mentions.length - 1).toEqual(1);
      });

      then('the actor boot carries the role', async () => {
        const boot = await getOneActorBootMd({ repo: repo.path });
        expect(boot).toContain('blow the whistle before a swimmer passes the flags');
      });

      then('the enroll stderr matches its snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });
  });
});
