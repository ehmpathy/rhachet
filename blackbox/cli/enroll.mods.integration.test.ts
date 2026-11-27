import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { MalfunctionError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

import { asAmbientBrainPath } from '@/blackbox/.test/infra/asAmbientBrainPath';
import { asModsPath } from '@/blackbox/.test/infra/asModsPath';
import {
  getAllActorHashDirNames,
  setupBrainHooksAdapterPackage,
} from '@/blackbox/.test/infra/brainDirBootJourney';
import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { setRoleModBootYml } from '@/blackbox/.test/infra/setRoleModBootYml';
import { setupStubBrainPath } from '@/blackbox/.test/infra/setupStubBrainPath';

/**
 * .what = the root of the rhachet this repo builds
 */
const REPO_ROOT = path.join(__dirname, '..', '..');

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
const setModBootYml = (input: { repo: string; lines: string[] }): Promise<void> =>
  setRoleModBootYml({ ...input, role: 'surfer' });

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

/**
 * .what = the text of each sound mod file, by which mod and how it changes its role
 */
const MOD_SURFER_SHADOW = 'modded: wax the board, then wax the rails';
const MOD_SURFER_ADD = 'modded: mind the reef, yield to the inside surfer';
const MOD_LIFEGUARD_SHADOW = 'modded: whistle twice, then wave';

/**
 * .what = the body of the sound surfer mod spec, below its `of:`
 */
const LINES_SURFER_SPEC_BODY = [
  'briefs:',
  '  say:',
  '    - briefs/rule.require.reef-etiquette.md',
  '  not:',
  '    - briefs/rule.forbid.wipeouts.md',
];

/**
 * .what = two sound mods, each pinned to the installed version: surfer (a shadow, an add, a not)
 *   and lifeguard (a shadow)
 * .why = a fault row breaks one; the other is the sound neighbor the boot must still carry. a pin
 *        at the installed version arms no drift, so the stop holds on the fault alone
 * .note = idempotent: it replaces whatever the mods path holds, a file there included, so it is
 *   also each row's cure
 */
const setSoundMods = async (input: { repo: string }): Promise<void> => {
  await fs.rm(path.join(input.repo, '.agent', 'repo=.mods'), { recursive: true, force: true });
  await fs.mkdir(asModsPath({ repo: input.repo, rel: 'role=surfer/briefs' }), { recursive: true });
  await fs.mkdir(asModsPath({ repo: input.repo, rel: 'role=lifeguard/briefs' }), { recursive: true });
  await fs.writeFile(
    asModsPath({ repo: input.repo, rel: 'role=surfer/boot.yml' }),
    `${['of: test/surfer@1.0.0', ...LINES_SURFER_SPEC_BODY].join('\n')}\n`,
  );
  await fs.writeFile(
    asModsPath({ repo: input.repo, rel: 'role=surfer/briefs/rule.require.surf-wax.md' }),
    `${MOD_SURFER_SHADOW}\n`,
  );
  await fs.writeFile(
    asModsPath({ repo: input.repo, rel: 'role=surfer/briefs/rule.require.reef-etiquette.md' }),
    `${MOD_SURFER_ADD}\n`,
  );
  await fs.writeFile(
    asModsPath({ repo: input.repo, rel: 'role=lifeguard/boot.yml' }),
    'of: test/lifeguard@1.0.0\n',
  );
  await fs.writeFile(
    asModsPath({ repo: input.repo, rel: 'role=lifeguard/briefs/rule.require.whistle.md' }),
    `${MOD_LIFEGUARD_SHADOW}\n`,
  );
};

/**
 * .what = the path of the repo actor's boot.md
 */
const asRepoActorBootPath = (input: { repo: string }): string =>
  asAmbientBrainPath({ repo: input.repo, file: 'boot.md' });

/**
 * .what = the boot.md an enroll of the whole linked set rendered: the repo actor's, or a hash
 *   actor's, joined
 * .why = whether that roleset lands on the repo actor or a hash one is enroll's call; the caller
 *        removed the repo actor's boot.md first, so either read is this enroll's render
 */
const getOneEnrolledBootMd = async (input: { repo: string }): Promise<string> => {
  const bootRepoActor = await fs
    .readFile(asRepoActorBootPath({ repo: input.repo }), 'utf-8')
    .catch((error: unknown) => {
      // only an absent boot.md reads as empty; every other fault fails loud
      const isAbsent =
        typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
      if (isAbsent) return '';
      throw error;
    });
  const bootHashActors = await getOneActorBootMd({ repo: input.repo });
  const boot = [bootRepoActor, bootHashActors].filter((one) => one.length > 0).join('\n');
  if (boot.length === 0)
    throw new MalfunctionError('the enroll rendered no boot.md', { repo: input.repo });
  return boot;
};

/**
 * .what = the stop hook sweep, as a session stop runs it
 */
const stopSession = (input: { repo: string }) =>
  invoke({
    args: ['roles', 'cost', '--all', '--when', 'hook.onStop'],
    cwd: input.repo,
    logOnError: false,
  });

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

      then('it exits 0, and names the skipped mod (F01)', () => {
        expect(result.status).toEqual(0);
        expect(result.stderr).toContain('skipped, booted as published until cured');
        expect(result.stderr).toContain('role=surfer');
      });

      const actor = useThen('the actor boot is read', async () => ({
        boot: await getOneActorBootMd({ repo: repo.path }),
      }));

      then('the actor boot carries the role as published, with the skip notice', () => {
        expect(actor.boot).toContain('<mod.skipped of="surfer">');
        expect(actor.boot).toContain('a wipeout is forbidden');
        expect(actor.boot).not.toContain('<mod of=');
      });

      then('the enroll stderr matches its snapshot', () => {
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] a clone is enrolled without the modded role (usecase 12)', () => {
      const result = useBeforeAll(async () => {
        const hashDirsPrior = getAllActorHashDirNames({ dir: repo.path });
        const enrolled = await enroll({ repo, roles: 'lifeguard' });
        return { ...enrolled, hashDirsPrior };
      });

      then('it exits 0: a bad mod blocks no actor, the one that lacks its role included', () => {
        expect(result.status).toEqual(0);
      });

      // the boot of the one actor this enroll made, never joined with the [t0] actor's boot
      const actor = useThen('the lifeguard actor boot is read', async () => {
        const hashDir = getAllActorHashDirNames({ dir: repo.path }).find(
          (dir) => !result.hashDirsPrior.includes(dir),
        );
        if (!hashDir)
          throw new MalfunctionError('the enroll made no new hash actor', { repo: repo.path });
        return {
          boot: await fs.readFile(
            path.join(repo.path, '.agent', '.actors', hashDir, 'brain', '.claude', 'boot.md'),
            'utf-8',
          ),
        };
      });

      then('the actor boot carries the role, and no mod and no notice of the surfer mod', () => {
        expect(actor.boot).toContain('blow the whistle before a swimmer passes the flags');
        expect(actor.boot).not.toContain('<mod of=');
        expect(actor.boot).not.toContain('<mod.skipped');
      });

      then('the lifeguard actor boot.md matches its snapshot', () => {
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
      // lifeguard linked too, so `--roles surfer` differs from the ambient set: a hash actor
      const one = await genRepoEnrollable({
        fixture: 'with-mods',
        roles: ['surfer', 'lifeguard'],
      });
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

      then('it exits 0, and names the unlinked of (F01)', () => {
        expect(result.status).toEqual(0);
        expect(result.stderr).toContain('skipped, booted as published until cured');
        expect(result.stderr).toContain('ghost/surfer');
      });

      const actor = useThen('the actor boot is read', async () => ({
        boot: await getOneActorBootMd({ repo: repo.path }),
      }));

      then('the actor boot carries the role as published, with the skip notice', () => {
        expect(actor.boot).toContain('<mod.skipped of="surfer">');
        expect(actor.boot).toContain('a wipeout is forbidden');
      });

      then('the enroll stderr matches its snapshot', () => {
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

      then('it exits 0 (F01)', () => {
        expect(result.status).toEqual(0);
      });

      then('the skip is the mod own, never an absent role', () => {
        expect(result.stderr).toContain('names a role this repo owns');
        expect(result.stderr).not.toContain("role 'surfer' not found");
      });

      then('the skip names the in-place edit', () => {
        expect(result.stderr).toContain(
          "edit .agent/repo=.this/role=surfer/ in place, then delete the mod with your human's ok",
        );
      });

      const actor = useThen('the actor boot is read', async () => ({
        boot: await getOneActorBootMd({ repo: repo.path }),
      }));

      then('the actor boot carries the native role, with no mod file', () => {
        expect(actor.boot).toContain('native: wax the board');
        expect(actor.boot).not.toContain('<mod of=');
      });

      then('the enroll stderr matches its snapshot', () => {
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

      then('it exits 0, and names the ambiguous of with each linked form (F01)', () => {
        expect(result.status).toEqual(0);
        expect(result.stderr).toContain('skipped, booted as published until cured');
        expect(result.stderr).toContain('alpha/surfer');
        expect(result.stderr).toContain('beta/surfer');
      });

      const actor = useThen('the actor boot is read', async () => ({
        boot: await getOneActorBootMd({ repo: repo.path }),
      }));

      then('the actor boot carries both roles as published, with no mod file', () => {
        expect(actor.boot).toContain('alpha: ride a longboard on small days');
        expect(actor.boot).toContain('beta: ride a shortboard on big days');
        expect(actor.boot).not.toContain('modded: mind the reef');
      });

      then('the enroll stderr matches its snapshot', () => {
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

  /**
   * .what = one fault class per row, C0–C13 of the vision's fault axis, each enrolled beside a
   *   sound mod
   * .why = the wish: per class, enroll exits 0, the faulty mod is absent from the boot, a sound mod
   *        beside it is present, and the fault with its fix is named at boot and by the stop hook,
   *        until it is cured. the two 2026-11-26 lockouts were C4 and C1 on an enroll resume
   *
   * .note = each mod pins the installed version, so no drift holds the stop and the cure is seen
   * .note = the enroll is of the whole linked set; the repo actor's boot.md is removed first, so the
   *   boot read is the one this enroll rendered
   * .note = C12 (a stale view) is no fault at enroll: the sync re-renders it. it is its own case
   */
  const CASES_FAULT_CLASSES: Array<{
    slug: string;
    title: string;
    stage: 'render' | 'boot';
    plant: (input: { repo: string }) => Promise<void>;
    cure: (input: { repo: string }) => Promise<void>;
    named: string;
    booted: string;
    fix: string;
    present: string[];
    absent: string[];
  }> = [
    {
      slug: 'case8.c0',
      title: 'C0: a stray entry under .agent/repo=.mods',
      stage: 'render',
      plant: async ({ repo }) => fs.writeFile(asModsPath({ repo, rel: 'readme.md' }), 'notes on our mods\n'),
      cure: async ({ repo }) => fs.rm(asModsPath({ repo, rel: 'readme.md' })),
      named: 'a mods dir holds an entry that names no role',
      booted: '<mods.skipped>',
      fix: 'or move it out of .agent/repo=.mods/',
      present: [MOD_SURFER_SHADOW, MOD_LIFEGUARD_SHADOW],
      absent: [],
    },
    {
      slug: 'case8.c1',
      title: 'C1: a mod dir with no boot.yml',
      stage: 'render',
      plant: async ({ repo }) => fs.rm(asModsPath({ repo, rel: 'role=surfer/boot.yml' })),
      cure: setSoundMods,
      named: 'it holds no boot.yml',
      booted: '<mod.skipped of="surfer">',
      fix: 'add .agent/repo=.mods/role=surfer/boot.yml',
      present: [MOD_LIFEGUARD_SHADOW, 'a wipeout is forbidden'],
      absent: [MOD_SURFER_SHADOW, MOD_SURFER_ADD],
    },
    {
      slug: 'case8.c2',
      title: 'C2: a boot.yml the parser refuses (a budget)',
      stage: 'render',
      plant: async ({ repo }) =>
        setModBootYml({
          repo,
          lines: ['of: test/surfer@1.0.0', 'budget:', '  tokens: 5000', ...LINES_SURFER_SPEC_BODY],
        }),
      cure: setSoundMods,
      named: 'declares a `budget:`',
      booted: '<mod.skipped of="surfer">',
      fix: 'delete the `budget:` key',
      present: [MOD_LIFEGUARD_SHADOW, 'a wipeout is forbidden'],
      absent: [MOD_SURFER_SHADOW, MOD_SURFER_ADD],
    },
    {
      slug: 'case8.c3',
      title: 'C3: an of to a role no package links',
      stage: 'render',
      plant: async ({ repo }) =>
        setModBootYml({ repo, lines: ['of: ghost/surfer', ...LINES_SURFER_SPEC_BODY] }),
      cure: setSoundMods,
      named: 'ghost/surfer',
      booted: '<mod.skipped of="surfer">',
      fix: 'link it first (rhx init --roles ghost/surfer)',
      present: [MOD_LIFEGUARD_SHADOW, 'a wipeout is forbidden'],
      absent: [MOD_SURFER_SHADOW, MOD_SURFER_ADD],
    },
    {
      slug: 'case8.c4',
      title: 'C4: a mod file at an unheld path no say or ref names',
      stage: 'render',
      plant: async ({ repo }) =>
        fs.writeFile(
          asModsPath({ repo, rel: 'role=surfer/briefs/rule.require.surf-wux.md' }),
          'a typo of a held path\n',
        ),
      cure: setSoundMods,
      named: 'rule.require.surf-wux.md',
      booted: '<mod.skipped of="surfer">',
      fix: 'to shadow, move it to the held path',
      present: [MOD_LIFEGUARD_SHADOW, 'a wipeout is forbidden'],
      absent: [MOD_SURFER_SHADOW, MOD_SURFER_ADD, 'a typo of a held path'],
    },
    {
      slug: 'case8.c5',
      title: 'C5: an orphan .md.min in the mod',
      stage: 'render',
      plant: async ({ repo }) =>
        fs.writeFile(
          asModsPath({ repo, rel: 'role=surfer/briefs/rule.require.tide-charts.md.min' }),
          'an orphan minification\n',
        ),
      cure: setSoundMods,
      named: 'rule.require.tide-charts.md.min',
      booted: '<mod.skipped of="surfer">',
      fix: 'add briefs/rule.require.tide-charts.md beside it',
      present: [MOD_LIFEGUARD_SHADOW, 'a wipeout is forbidden'],
      absent: [MOD_SURFER_SHADOW, MOD_SURFER_ADD, 'an orphan minification'],
    },
    {
      slug: 'case8.c6',
      title: 'C6: a mod file of a kind a mod cannot change (a readme)',
      stage: 'render',
      plant: async ({ repo }) =>
        fs.writeFile(asModsPath({ repo, rel: 'role=surfer/readme.md' }), '# modded readme\n'),
      cure: setSoundMods,
      named: 'a kind a mod cannot change',
      booted: '<mod.skipped of="surfer">',
      fix: 'a mod holds only briefs/ and skills/ files',
      present: [MOD_LIFEGUARD_SHADOW, 'a wipeout is forbidden'],
      absent: [MOD_SURFER_SHADOW, MOD_SURFER_ADD, '# modded readme'],
    },
    {
      slug: 'case8.c7',
      title: 'C7: a not that removes a path the mod also shadows',
      stage: 'render',
      plant: async ({ repo }) =>
        setModBootYml({
          repo,
          lines: [
            'of: test/surfer@1.0.0',
            'briefs:',
            '  say:',
            '    - briefs/rule.require.reef-etiquette.md',
            '  not:',
            '    - briefs/rule.require.surf-wax.md',
          ],
        }),
      cure: setSoundMods,
      named: 'a path the mod also shadows',
      booted: '<mod.skipped of="surfer">',
      fix: 'narrow the not so it leaves briefs/rule.require.surf-wax.md',
      present: [MOD_LIFEGUARD_SHADOW, 'a wipeout is forbidden'],
      absent: [MOD_SURFER_SHADOW, MOD_SURFER_ADD],
    },
    {
      slug: 'case8.c8',
      title: 'C8: a mod in subject mode, of a role in simple mode',
      stage: 'render',
      plant: async ({ repo }) =>
        setModBootYml({
          repo,
          lines: [
            'of: test/surfer@1.0.0',
            'always:',
            '  briefs:',
            '    say:',
            '      - briefs/rule.require.reef-etiquette.md',
          ],
        }),
      cure: setSoundMods,
      named: 'in subject mode',
      booted: '<mod.skipped of="surfer">',
      fix: 'write the mod with top-level',
      present: [MOD_LIFEGUARD_SHADOW, 'a wipeout is forbidden'],
      absent: [MOD_SURFER_SHADOW, MOD_SURFER_ADD],
    },
    {
      slug: 'case8.c9',
      title: 'C9: a not of a skill a hook invokes, beside a sound surfer mod',
      stage: 'render',
      plant: async ({ repo }) => {
        // the published lifeguard, as its package loads: a boot hook that runs `rhx flags.raise`
        const pathRegistry = path.join(repo, 'node_modules', 'rhachet-roles-test', 'dist', 'index.js');
        const registry = await fs.readFile(pathRegistry, 'utf-8');
        await fs.writeFile(
          pathRegistry,
          registry.replace(
            "purpose: 'test role no mod names',",
            "purpose: 'test role no mod names',\n      hooks: { onBrain: { onBoot: [{ command: 'rhx flags.raise', timeout: '5s' }] } },",
          ),
        );
        await fs.writeFile(
          asModsPath({ repo, rel: 'role=lifeguard/boot.yml' }),
          'of: test/lifeguard@1.0.0\nskills:\n  not:\n    - skills/flags.raise.sh\n',
        );
      },
      cure: setSoundMods,
      // the conflict itself, on both surfaces: a stop that cannot read the hooks names another fault
      named: "removes a skill one of the role's hooks invokes",
      booted: '<mod.skipped of="lifeguard">',
      fix: 'shadow skills/flags.raise.sh rather than not it',
      present: [MOD_SURFER_SHADOW, MOD_SURFER_ADD, 'blow the whistle before a swimmer passes the flags'],
      absent: [MOD_LIFEGUARD_SHADOW],
    },
    {
      slug: 'case8.c10',
      title: 'C10: a role kind dir that holds a file no link made',
      stage: 'boot',
      plant: async ({ repo }) =>
        fs.writeFile(
          path.join(repo, '.agent', 'repo=test', 'role=surfer', 'briefs', 'rule.require.hand-wax.md'),
          'a brief no link made\n',
        ),
      cure: async ({ repo }) =>
        fs.rm(path.join(repo, '.agent', 'repo=test', 'role=surfer', 'briefs', 'rule.require.hand-wax.md')),
      named: 'a linked role dir holds a file no link made',
      booted: '<mod.skipped of="surfer">',
      fix: 'move the file out',
      present: [MOD_LIFEGUARD_SHADOW, 'a wipeout is forbidden'],
      absent: [MOD_SURFER_SHADOW, MOD_SURFER_ADD, 'a brief no link made'],
    },
    {
      slug: 'case8.c11',
      title: 'C11: a corrupt modded view record',
      stage: 'boot',
      plant: async ({ repo }) =>
        fs.writeFile(path.join(repo, '.agent', 'repo=test', 'role=surfer', '.modded.json'), '{ not json'),
      cure: async ({ repo }) => {
        // the fix the notice names, verbatim: delete the record, then re-link the role
        await fs.rm(path.join(repo, '.agent', 'repo=test', 'role=surfer', '.modded.json'));
        await invoke({ args: ['init', '--roles', '+test/surfer'], cwd: repo, logOnError: false });
      },
      named: 'the modded view record is unreadable',
      booted: '<mod.skipped of="surfer">',
      fix: 'then run rhx init --roles +test/surfer to re-link the role',
      present: [MOD_LIFEGUARD_SHADOW, 'a wipeout is forbidden'],
      absent: [MOD_SURFER_SHADOW, MOD_SURFER_ADD],
    },
    {
      slug: 'case8.c11.orphan',
      title: 'C11: a corrupt modded view record, whose mod is gone',
      stage: 'boot',
      plant: async ({ repo }) => {
        // the mod is removed, yet its view and a corrupt record of it remain
        await fs.rm(asModsPath({ repo, rel: 'role=surfer' }), { recursive: true });
        await fs.writeFile(path.join(repo, '.agent', 'repo=test', 'role=surfer', '.modded.json'), '{ not json');
      },
      cure: async ({ repo }) => {
        // the fix the notice names, verbatim: delete the record, then re-link the role
        await fs.rm(path.join(repo, '.agent', 'repo=test', 'role=surfer', '.modded.json'));
        await invoke({ args: ['init', '--roles', '+test/surfer'], cwd: repo, logOnError: false });
      },
      named: 'the modded view record is unreadable',
      booted: '<mod.skipped of="surfer">',
      fix: 'then run rhx init --roles +test/surfer to re-link the role',
      present: [MOD_LIFEGUARD_SHADOW, 'a wipeout is forbidden'],
      absent: [MOD_SURFER_SHADOW, MOD_SURFER_ADD],
    },
    {
      slug: 'case8.c13',
      title: 'C13: a file where the mods dir belongs',
      stage: 'render',
      plant: async ({ repo }) => {
        const pathMods = path.join(repo, '.agent', 'repo=.mods');
        await fs.rm(pathMods, { recursive: true });
        await fs.writeFile(pathMods, 'not a dir\n');
      },
      cure: setSoundMods,
      named: 'the mods path cannot be read',
      booted: '<mods.skipped>',
      fix: 'move the file aside',
      present: ['a wipeout is forbidden', 'blow the whistle before a swimmer passes the flags'],
      absent: [MOD_SURFER_SHADOW, MOD_SURFER_ADD, MOD_LIFEGUARD_SHADOW],
    },
  ];
  CASES_FAULT_CLASSES.map((thisCase) =>
    given(`[${thisCase.slug}] ${thisCase.title}`, () => {
      const repo = useBeforeAll(async () => {
        const one = await genTestTempRepo({ fixture: 'with-mods' });
        await setSoundMods({ repo: one.path });
        if (thisCase.stage === 'render') await thisCase.plant({ repo: one.path });
        await invoke({
          args: ['init', '--roles', 'surfer', 'lifeguard'],
          cwd: one.path,
          logOnError: false,
        });
        if (thisCase.stage === 'boot') await thisCase.plant({ repo: one.path });

        // the repo actor's boot.md, removed, so the boot read below is the one the enroll wrote
        await fs.rm(asRepoActorBootPath({ repo: one.path }), { force: true });
        return { path: one.path, stubPath: setupStubBrainPath({ dir: one.path }) };
      });

      when('[t0] a clone is enrolled, then a session stops', () => {
        const result = useBeforeAll(async () => {
          const enrolled = await enroll({ repo, roles: 'surfer,lifeguard' });
          const boot = await getOneEnrolledBootMd({ repo: repo.path });
          const stop = await stopSession({ repo: repo.path });
          return { enrolled, boot, stop };
        });

        then('enroll exits 0, and names the fault with its fix (F01)', () => {
          expect(result.enrolled.status).toEqual(0);
          expect(result.enrolled.stderr).toContain(thisCase.named);
          expect(result.enrolled.stderr).toContain(thisCase.fix);
        });

        then('the boot carries the notice, the fault, and its fix', () => {
          expect(result.boot).toContain(thisCase.booted);
          expect(result.boot).toContain(thisCase.named);
          expect(result.boot).toContain(thisCase.fix);
        });

        then('the boot holds no file of the faulty mod, and the sound mod beside it', () => {
          for (const text of thisCase.present) expect(result.boot).toContain(text);
          for (const text of thisCase.absent) expect(result.boot).not.toContain(text);
        });

        then('the stop holds, exit 2, and names the same fault with the same fix (F02)', () => {
          expect(result.stop.status).toEqual(2);
          expect(result.stop.stderr).toContain('held at the first stop of each turn until cured');
          expect(result.stop.stderr).toContain(thisCase.named);
          expect(result.stop.stderr).toContain(thisCase.fix);
        });

        then('the enroll and stop stderr match their snapshot', () => {
          expect({
            enroll: asSnapshotSafe(result.enrolled.stderr),
            stop: asSnapshotSafe(result.stop.stderr),
          }).toMatchSnapshot();
        });
      });

      when('[t1] the fault is cured, then a session stops', () => {
        const stop = useBeforeAll(async () => {
          await thisCase.cure({ repo: repo.path });
          return stopSession({ repo: repo.path });
        });

        then('the stop passes, exit 0, and names no fault', () => {
          expect(stop.status).toEqual(0);
          expect(stop.stderr).not.toContain('held at the first stop of each turn until cured');
          expect(stop.stderr).not.toContain(thisCase.named);
        });
      });
    }),
  );

  given('[case11] a C4 fault, and an enroll that resumes a session (the lockout shape)', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods' });
      await setSoundMods({ repo: one.path });
      await fs.writeFile(
        asModsPath({ repo: one.path, rel: 'role=surfer/briefs/rule.require.surf-wux.md' }),
        'a typo of a held path\n',
      );
      await invoke({
        args: ['init', '--roles', 'surfer', 'lifeguard'],
        cwd: one.path,
        logOnError: false,
      });
      await fs.rm(asRepoActorBootPath({ repo: one.path }), { force: true });
      return { path: one.path, stubPath: setupStubBrainPath({ dir: one.path }) };
    });

    when('[t0] a clone is enrolled with --resume', () => {
      const result = useBeforeAll(async () => {
        const enrolled = await invoke({
          args: ['enroll', 'claude', '--roles', 'surfer,lifeguard', '--resume', 'director'],
          cwd: repo.path,
          env: { PATH: repo.stubPath },
          logOnError: false,
        });
        const boot = await getOneEnrolledBootMd({ repo: repo.path });
        return { enrolled, boot };
      });

      then('enroll exits 0, and names the fault with its fix, as a fresh enroll does', () => {
        expect(result.enrolled.status).toEqual(0);
        expect(result.enrolled.stderr).toContain('rule.require.surf-wux.md');
        expect(result.enrolled.stderr).toContain('to shadow, move it to the held path');
      });

      then('the boot holds the sound mod and none of the faulty one', () => {
        expect(result.boot).toContain('<mod.skipped of="surfer">');
        expect(result.boot).toContain(MOD_LIFEGUARD_SHADOW);
        expect(result.boot).not.toContain(MOD_SURFER_SHADOW);
      });

      then('the enroll stderr matches its snapshot', () => {
        expect(asSnapshotSafe(result.enrolled.stderr)).toMatchSnapshot();
      });

      then('the enrolled boot, its sound mod beside the skip notice, matches its snapshot', () => {
        expect(asSnapshotSafe(result.boot)).toMatchSnapshot();
      });
    });

    when('[t1] the session stops, then stops again after claude held it once', () => {
      const result = useBeforeAll(async () => ({
        first: await stopSession({ repo: repo.path }),
        again: await invoke({
          args: ['roles', 'cost', '--all', '--when', 'hook.onStop'],
          cwd: repo.path,
          env: { RHACHET_HOOKS_STOP_HELD: '1' },
          logOnError: false,
        }),
      }));

      then('the first stop holds (exit 2), and names the fault with its fix', () => {
        expect(result.first.status).toEqual(2);
        expect(result.first.stderr).toContain('rule.require.surf-wux.md');
      });

      then('a stop claude already held passes (exit 0), so a fault never loops the seat', () => {
        expect(result.again.status).toEqual(0);
        expect(result.again.stderr).toEqual('');
      });

      then('the held stop and the stop that passes match their snapshot', () => {
        expect({
          first: {
            status: result.first.status,
            stdout: asSnapshotSafe(result.first.stdout),
            stderr: asSnapshotSafe(result.first.stderr),
          },
          again: {
            status: result.again.status,
            stdout: asSnapshotSafe(result.again.stdout),
            stderr: asSnapshotSafe(result.again.stderr),
          },
        }).toMatchSnapshot();
      });
    });
  });

  given('[case12] a mod spec with no read access (an errno inside the render)', () => {
    const repo = useBeforeAll(async () => {
      const one = await genRepoEnrollable({
        fixture: 'with-mods',
        roles: ['surfer', 'lifeguard'],
      });
      await setSoundMods({ repo: one.path });
      await fs.chmod(asModsPath({ repo: one.path, rel: 'role=surfer/boot.yml' }), 0o000);
      return one;
    });
    afterAll(async () => {
      await fs.chmod(asModsPath({ repo: repo.path, rel: 'role=surfer/boot.yml' }), 0o644);
    });

    when('[t0] a clone is enrolled with both modded roles', () => {
      const result = useBeforeAll(async () => {
        // a root process reads through any mode, so this case cannot observe EACCES as root
        if (process.getuid?.() === 0)
          throw new MalfunctionError('this case needs a non-root user', {
            hint: 'run the suite as a non-root user, as ci does',
          });
        await fs.rm(asRepoActorBootPath({ repo: repo.path }), { force: true });
        return { enrolled: await enroll({ repo, roles: 'surfer,lifeguard' }) };
      });

      then('enroll exits 0, and names the unreadable mod with its errno', () => {
        expect({ status: result.enrolled.status, stderr: result.enrolled.stderr }).toEqual({
          status: 0,
          stderr: expect.stringContaining('EACCES'),
        });
      });

      then('the errno and its fix each name the path repo-relative, never by the host path', () => {
        expect(result.enrolled.stderr).toContain(
          "open '.agent/repo=.mods/role=surfer/boot.yml'",
        );
        expect(result.enrolled.stderr).toContain(
          'chmod u+r .agent/repo=.mods/role=surfer/boot.yml',
        );
        expect(result.enrolled.stderr).not.toContain(repo.path);
      });

      const boot = useThen('the enrolled boot is read', async () => ({
        text: await getOneEnrolledBootMd({ repo: repo.path }),
      }));

      then('the boot holds the sound mod and none of the unreadable one', () => {
        expect(boot.text).toContain('<mod.skipped of="surfer">');
        expect(boot.text).toContain(MOD_LIFEGUARD_SHADOW);
        expect(boot.text).not.toContain(MOD_SURFER_SHADOW);
      });

      then('the enroll stderr matches its snapshot, the errno readout and its fix', () => {
        expect(asSnapshotSafe(result.enrolled.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case13] a C4 fault, and a clone whose actor holds no .this role', () => {
    const repo = useBeforeAll(async () => {
      // the mods land before init, so init's hook sync arms the sweep on the repo actor
      const one = await genTestTempRepo({ fixture: 'with-mods' });
      await setSoundMods({ repo: one.path });

      // a brain package, declared, so init finds a brain to sync hooks for
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
      await fs.writeFile(
        asModsPath({ repo: one.path, rel: 'role=surfer/briefs/rule.require.surf-wux.md' }),
        'a typo of a held path\n',
      );
      await invoke({
        args: ['init', '--roles', 'surfer', 'lifeguard'],
        cwd: one.path,
        logOnError: false,
      });
      await invoke({ args: ['init', '--hooks'], cwd: one.path, logOnError: false });

      // the rhachet this repo builds, reached as a consumer reaches it, so the actor's own
      //   dispatcher and its stop rule both run
      await fs.mkdir(path.join(one.path, 'node_modules', '.bin'), { recursive: true });
      await fs.symlink(
        path.join(REPO_ROOT, 'bin', 'run'),
        path.join(one.path, 'node_modules', '.bin', 'rhachet'),
      );
      await fs.symlink(REPO_ROOT, path.join(one.path, 'node_modules', 'rhachet'));
      return { path: one.path, stubPath: setupStubBrainPath({ dir: one.path }) };
    });

    /**
     * .what = enroll one role, then stop the new seat twice through its own manifest + dispatcher
     * .why = the seat's real stop path, never a hand-set env; the second stop is one claude held
     */
    const enrollThenStopTwice = async (input: { roles: string; hashDirsPrior: string[] }) => {
      const enrolled = await enroll({ repo, roles: input.roles });
      const hashDir = getAllActorHashDirNames({ dir: repo.path }).find(
        (dir) => !input.hashDirsPrior.includes(dir),
      );
      if (!hashDir)
        throw new MalfunctionError('the enroll made no new hash actor', {
          repo: repo.path,
          roles: input.roles,
        });
      const manifestRel = path.join(
        '.agent',
        '.actors',
        hashDir,
        'brain',
        '.claude',
        'hooks.dispatch.manifest',
      );
      const manifest = await fs.readFile(path.join(repo.path, manifestRel), 'utf-8');
      const stopAs = (stop: { isHeld: boolean }) =>
        spawnSync(
          '/bin/sh',
          ['-c', `bash ./node_modules/rhachet/bin/hooks.dispatch.sh ${manifestRel} Stop`],
          {
            cwd: repo.path,
            input: JSON.stringify({ hook_event_name: 'Stop', stop_hook_active: stop.isHeld }),
            encoding: 'utf-8',
            timeout: 60_000,
            env: { ...process.env, HOME: genTempDir({ slug: 'enroll-mods-stop-home' }) },
          },
        );
      return {
        hashDir,
        enrolled,
        manifest,
        first: stopAs({ isHeld: false }),
        again: stopAs({ isHeld: true }),
      };
    };

    when('[t0] a clone is enrolled with surfer alone, then its seat stops twice', () => {
      const result = useBeforeAll(async () =>
        enrollThenStopTwice({ roles: 'surfer', hashDirsPrior: [] }),
      );

      then('enroll exits 0', () => {
        // the stderr rides along, so a non-zero exit names its own cause
        expect({ status: result.enrolled.status, stderr: result.enrolled.stderr }).toEqual({
          status: 0,
          stderr: expect.not.stringContaining('MalfunctionError'),
        });
      });

      then("the actor's manifest carries the stop sweep, though it holds no .this role", () => {
        expect(result.manifest).toContain('roles cost --all --when hook.onStop');
      });

      then("the seat's first stop holds (exit 2), and names the fault with its fix", () => {
        expect(result.first.status).toEqual(2);
        expect(result.first.stderr).toContain('rule.require.surf-wux.md');
        expect(result.first.stderr).toContain('to shadow, move it to the held path');
      });

      then('a stop claude already held passes, so the seat never loops', () => {
        expect(result.again.status).toEqual(0);
      });

      then("the seat's held stop and the stop that passes match their snapshot", () => {
        expect({
          first: {
            status: result.first.status,
            stdout: asSnapshotSafe(result.first.stdout),
            stderr: asSnapshotSafe(result.first.stderr),
          },
          again: {
            status: result.again.status,
            stdout: asSnapshotSafe(result.again.stdout),
            stderr: asSnapshotSafe(result.again.stderr),
          },
        }).toMatchSnapshot();
      });
    });

    when('[t1] a clone is enrolled with lifeguard alone, a seat that holds no faulty role', () => {
      const result = useBeforeAll(async () =>
        enrollThenStopTwice({
          roles: 'lifeguard',
          hashDirsPrior: getAllActorHashDirNames({ dir: repo.path }),
        }),
      );

      then('enroll exits 0', () => {
        expect({ status: result.enrolled.status, stderr: result.enrolled.stderr }).toEqual({
          status: 0,
          stderr: expect.not.stringContaining('MalfunctionError'),
        });
      });

      then("the seat's boot carries its sound mod, and no notice: the faulty role is not its own (vision row 5)", async () => {
        const boot = await fs.readFile(
          path.join(repo.path, '.agent', '.actors', result.hashDir, 'brain', '.claude', 'boot.md'),
          'utf-8',
        );
        expect(boot).toContain(MOD_LIFEGUARD_SHADOW);
        expect(boot).not.toContain('<mod.skipped');
        expect(boot).not.toContain('<mods.skipped');
        expect(boot).not.toContain('role=surfer');
      });

      then("the seat's first stop holds too: the sweep is repo-wide, so it names the surfer fault", () => {
        expect(result.first.status).toEqual(2);
        expect(result.first.stderr).toContain('rule.require.surf-wux.md');
      });

      then('the stop stderr matches its snapshot', () => {
        expect(asSnapshotSafe(result.first.stderr)).toMatchSnapshot();
      });

      then('a stop claude already held passes', () => {
        expect(result.again.status).toEqual(0);
      });
    });
  });

  given('[case14] a C4 fault beside a sound mod, at the edges of the contract', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods' });
      await setSoundMods({ repo: one.path });
      await fs.writeFile(
        asModsPath({ repo: one.path, rel: 'role=surfer/briefs/rule.require.surf-wux.md' }),
        'a typo of a held path\n',
      );
      await invoke({
        args: ['init', '--roles', 'surfer', 'lifeguard'],
        cwd: one.path,
        logOnError: false,
      });
      return { path: one.path, stubPath: setupStubBrainPath({ dir: one.path }) };
    });

    when('[t0] a clone is enrolled with --output json', () => {
      const result = useBeforeAll(async () =>
        invoke({
          args: ['enroll', 'claude', '--roles', 'surfer,lifeguard', '--output', 'json'],
          cwd: repo.path,
          env: { PATH: repo.stubPath },
          logOnError: false,
        }),
      );

      then('enroll exits 0', () => {
        expect({ status: result.status, stderr: result.stderr }).toEqual({
          status: 0,
          stderr: expect.not.stringContaining('MalfunctionError'),
        });
      });

      then('🔴 stdout stays one json document: the fault never lands on it', () => {
        expect(() => JSON.parse(result.stdout)).not.toThrow();
        expect(result.stdout).not.toContain('surf-wux');
      });

      then('stderr names the fault with its fix', () => {
        expect(result.stderr).toContain('rule.require.surf-wux.md');
        expect(result.stderr).toContain('to shadow, move it to the held path');
      });

      then('the json stdout and the fault stderr match their snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });

    when('[t1] a clone is enrolled, attended', () => {
      const result = useBeforeAll(async () => enroll({ repo, roles: 'surfer,lifeguard' }));

      then('the carried fault is named once across the enroll and its host', () => {
        const output = [result.stdout, result.stderr].join('\n');
        const mentions = output.split('to shadow, move it to the held path');
        expect(mentions.length - 1).toEqual(1);
      });

      then('the attended enroll output matches its snapshot', () => {
        expect({
          stdout: asSnapshotSafe(result.stdout),
          stderr: asSnapshotSafe(result.stderr),
        }).toMatchSnapshot();
      });
    });
  });

  given('[case15] fifty sound mods beside one faulty mod (the stop sweep at scale)', () => {
    /**
     * .what = the extra linked roles, each with a sound mod
     * .why = the sweep re-reads each mod's spec, plan, hook basis and record on every stop; the
     *        bound below proves that walk stays well inside the 60s hook timeout
     */
    const slugsExtra = Array.from(
      { length: 50 },
      (_, index) => `wave${String(index).padStart(2, '0')}`,
    );

    /**
     * .what = one role entry of the fixture package registry
     */
    const asRoleEntry = (input: { slug: string; purpose: string }) => ({
      slug: input.slug,
      name: input.slug,
      purpose: input.purpose,
      readme: { uri: `roles/${input.slug}/readme.md` },
      boot: { uri: `roles/${input.slug}/boot.yml` },
      traits: [],
      skills: { dirs: { uri: `roles/${input.slug}/skills` }, refs: [] },
      briefs: { dirs: { uri: `roles/${input.slug}/briefs` } },
    });

    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods' });
      const pkg = path.join(one.path, 'node_modules', 'rhachet-roles-test');

      // fifty more roles in the fixture package, declared in both of its registries
      for (const slug of slugsExtra) {
        await fs.mkdir(path.join(pkg, 'roles', slug, 'briefs'), { recursive: true });
        await fs.mkdir(path.join(pkg, 'roles', slug, 'skills'), { recursive: true });
        await fs.writeFile(path.join(pkg, 'roles', slug, 'readme.md'), `# ${slug}\n`);
        await fs.writeFile(
          path.join(pkg, 'roles', slug, 'boot.yml'),
          'briefs:\n  say:\n    - briefs/rule.require.swell.md\n',
        );
        await fs.writeFile(
          path.join(pkg, 'roles', slug, 'briefs', 'rule.require.swell.md'),
          `read the swell before ${slug}\n`,
        );
      }
      const registry = {
        slug: 'test',
        readme: { uri: 'readme.md' },
        roles: [
          asRoleEntry({ slug: 'surfer', purpose: 'test role a repo mods' }),
          asRoleEntry({ slug: 'lifeguard', purpose: 'test role no mod names' }),
          ...slugsExtra.map((slug) =>
            asRoleEntry({ slug, purpose: 'test role a repo mods, one of many' }),
          ),
        ],
      };
      await fs.writeFile(
        path.join(pkg, 'dist', 'index.js'),
        `const getRoleRegistry = () => (${JSON.stringify(registry)});\nmodule.exports = { getRoleRegistry };\n`,
      );
      await fs.writeFile(
        path.join(pkg, 'rhachet.repo.yml'),
        `slug: test\nreadme: readme.md\nroles:\n${registry.roles
          .map((role) =>
            [
              `  - slug: ${role.slug}`,
              `    name: ${role.name}`,
              `    purpose: ${role.purpose}`,
              `    readme: ${role.readme.uri}`,
              `    boot: ${role.boot.uri}`,
              '    briefs:',
              `      dirs: ${role.briefs.dirs.uri}`,
              '    skills:',
              `      dirs: ${role.skills.dirs.uri}`,
            ].join('\n'),
          )
          .join('\n')}\n`,
      );

      // a sound mod over each, and the C4 fault on surfer
      await setSoundMods({ repo: one.path });
      for (const slug of slugsExtra) {
        await setRoleModBootYml({ repo: one.path, role: slug, lines: [`of: test/${slug}@1.0.0`] });
        await fs.mkdir(asModsPath({ repo: one.path, rel: `role=${slug}/briefs` }), {
          recursive: true,
        });
        await fs.writeFile(
          asModsPath({ repo: one.path, rel: `role=${slug}/briefs/rule.require.swell.md` }),
          `modded: read the swell twice before ${slug}\n`,
        );
      }
      await fs.writeFile(
        asModsPath({ repo: one.path, rel: 'role=surfer/briefs/rule.require.surf-wux.md' }),
        'a typo of a held path\n',
      );
      const init = await invoke({
        args: ['init', '--roles', 'surfer', 'lifeguard', ...slugsExtra],
        cwd: one.path,
        logOnError: false,
      });
      return { path: one.path, init };
    });

    when('[t0] a session stops', () => {
      const result = useBeforeAll(async () => {
        const since = Date.now();
        const stop = await stopSession({ repo: repo.path });
        return { stop, elapsedMs: Date.now() - since };
      });

      then('init linked all fifty-two roles, and exits 0', () => {
        expect(repo.init.status).toEqual(0);
        expect(repo.init.stdout).toContain('role=wave49');
      });

      then('the stop holds (exit 2), and names the one faulty mod alone', () => {
        expect(result.stop.status).toEqual(2);
        expect(result.stop.stderr).toContain('1 mod fault, held at the first stop of each turn until cured');
        expect(result.stop.stderr).toContain('rule.require.surf-wux.md');
      });

      then('🔴 the sweep of 52 mods ends well inside the 60s hook timeout', () => {
        expect(result.elapsedMs).toBeLessThan(30_000);
      });

      then('the stop stderr matches its snapshot', () => {
        expect(asSnapshotSafe(result.stop.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case10] two faulty mods in one walk, cured one at a time (vision case=8)', () => {
    const PATH_TYPO = 'role=surfer/briefs/rule.require.surf-wux.md';
    const PATH_ORPHAN = 'role=lifeguard/briefs/rule.require.tide-charts.md.min';
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods' });
      await setSoundMods({ repo: one.path });
      await fs.writeFile(asModsPath({ repo: one.path, rel: PATH_TYPO }), 'a typo of a held path\n');
      await fs.writeFile(asModsPath({ repo: one.path, rel: PATH_ORPHAN }), 'an orphan minification\n');
      await invoke({
        args: ['init', '--roles', 'surfer', 'lifeguard'],
        cwd: one.path,
        logOnError: false,
      });
      await fs.rm(asRepoActorBootPath({ repo: one.path }), { force: true });
      return { path: one.path, stubPath: setupStubBrainPath({ dir: one.path }) };
    });

    when('[t0] a clone is enrolled', () => {
      const result = useBeforeAll(async () => {
        const enrolled = await enroll({ repo, roles: 'surfer,lifeguard' });
        const boot = await getOneEnrolledBootMd({ repo: repo.path });
        return { enrolled, boot };
      });

      then('it exits 0, and names both skipped mods, each with its fault', () => {
        expect(result.enrolled.status).toEqual(0);
        expect(result.enrolled.stderr).toContain('role=surfer');
        expect(result.enrolled.stderr).toContain('rule.require.surf-wux.md');
        expect(result.enrolled.stderr).toContain('role=lifeguard');
        expect(result.enrolled.stderr).toContain('rule.require.tide-charts.md.min');
      });

      then('each role section carries its own skip notice and fix, and no file of its mod', () => {
        expect(result.boot).toContain('<mod.skipped of="surfer">');
        expect(result.boot).toContain('<mod.skipped of="lifeguard">');
        expect(result.boot.split('fix = ').length - 1).toBeGreaterThanOrEqual(2);
        for (const text of [
          'a typo of a held path',
          'an orphan minification',
          MOD_SURFER_SHADOW,
          MOD_LIFEGUARD_SHADOW,
        ])
          expect(result.boot).not.toContain(text);
      });
    });

    when('[t1] a session stops', () => {
      const stop = useBeforeAll(async () => stopSession({ repo: repo.path }));

      then('it holds under one header that counts 2, one branch per role', () => {
        expect(stop.status).toEqual(2);
        expect(stop.stderr).toContain('2 mod faults, held at the first stop of each turn until cured');
        expect(stop.stderr).toContain('role=surfer');
        expect(stop.stderr).toContain('role=lifeguard');
      });

      then('the stop stderr matches its snapshot', () => {
        expect(asSnapshotSafe(stop.stderr)).toMatchSnapshot();
      });
    });

    when('[t2] only the surfer mod is cured, then a session stops', () => {
      const stop = useBeforeAll(async () => {
        await fs.rm(asModsPath({ repo: repo.path, rel: PATH_TYPO }));
        return stopSession({ repo: repo.path });
      });

      then('it still holds, on the lifeguard mod alone', () => {
        expect(stop.status).toEqual(2);
        expect(stop.stderr).toContain('1 mod fault, held at the first stop of each turn until cured');
        expect(stop.stderr).toContain('role=lifeguard');
        expect(stop.stderr).not.toContain('role=surfer');
      });

      then('the stop that still holds matches its snapshot', () => {
        expect({ status: stop.status, stderr: asSnapshotSafe(stop.stderr) }).toMatchSnapshot();
      });
    });

    when('[t3] the lifeguard mod is cured too, then a session stops', () => {
      const stop = useBeforeAll(async () => {
        await fs.rm(asModsPath({ repo: repo.path, rel: PATH_ORPHAN }));
        return stopSession({ repo: repo.path });
      });

      then('it passes, exit 0, and names no fault', () => {
        expect(stop.status).toEqual(0);
        expect(stop.stderr).not.toContain('held at the first stop of each turn until cured');
      });

      then('the stop that clears matches its snapshot', () => {
        expect({
          status: stop.status,
          stdout: asSnapshotSafe(stop.stdout),
          stderr: asSnapshotSafe(stop.stderr),
        }).toMatchSnapshot();
      });
    });

    when('[t4] a clone is enrolled again', () => {
      const result = useBeforeAll(async () => {
        await fs.rm(asRepoActorBootPath({ repo: repo.path }), { force: true });
        const enrolled = await enroll({ repo, roles: 'surfer,lifeguard' });
        const boot = await getOneEnrolledBootMd({ repo: repo.path });
        return { enrolled, boot };
      });

      then('it exits 0, both roles boot modded, and no skip notice remains', () => {
        expect(result.enrolled.status).toEqual(0);
        expect(result.boot).toContain(MOD_SURFER_SHADOW);
        expect(result.boot).toContain(MOD_LIFEGUARD_SHADOW);
        expect(result.boot).not.toContain('<mod.skipped');
      });
    });
  });

  given('[case9] C12: a mod edited after the last render', () => {
    const repo = useBeforeAll(async () => {
      const one = await genTestTempRepo({ fixture: 'with-mods' });
      await setSoundMods({ repo: one.path });
      await invoke({
        args: ['init', '--roles', 'surfer', 'lifeguard'],
        cwd: one.path,
        logOnError: false,
      });
      await fs.writeFile(
        asModsPath({ repo: one.path, rel: 'role=surfer/briefs/rule.require.surf-wax.md' }),
        'modded again: wax the board in cold water\n',
      );
      await fs.rm(asRepoActorBootPath({ repo: one.path }), { force: true });
      return { path: one.path, stubPath: setupStubBrainPath({ dir: one.path }) };
    });

    when('[t0] a clone is enrolled', () => {
      const result = useBeforeAll(async () => {
        const enrolled = await enroll({ repo, roles: 'surfer,lifeguard' });
        const boot = await getOneEnrolledBootMd({ repo: repo.path });
        return { enrolled, boot };
      });

      then('enroll exits 0: its sync renders the edit, so the stale view never meets the boot', () => {
        expect(result.enrolled.status).toEqual(0);
        expect(result.boot).toContain('modded again: wax the board in cold water');
        expect(result.boot).not.toContain(MOD_SURFER_SHADOW);
        expect(result.boot).not.toContain('<mod.skipped');
      });

      then('the enroll stderr and the re-rendered boot match their snapshot', () => {
        expect({
          stderr: asSnapshotSafe(result.enrolled.stderr),
          boot: asSnapshotSafe(result.boot),
        }).toMatchSnapshot();
      });
    });
  });
});
