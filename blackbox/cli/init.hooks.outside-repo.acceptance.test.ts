import * as fs from 'fs/promises';
import { ConstraintError } from 'helpful-errors';
import * as path from 'path';

import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = the hash of the actor each scene seeds on disk
 */
const ACTOR_HASH = '7dcf1989';

/**
 * .what = a temp repo with the tester role linked and one enrolled actor on disk, plus a HOME
 *   whose `.claude/settings.json` holds known bytes at a chosen mode
 * .why = every scene in this file asks one question: does `init --hooks` ever write outside the
 *   repo? the home settings file is the outside file a brain dir's grove arrow reaches
 */
const genSceneRepoWithActorAndHome = async (input: {
  homeSettingsMode: number;
  isArrowToHomeLaid?: boolean;
  isAdapterLegacy?: boolean;
}): Promise<{
  repoPath: string;
  home: string;
  homeSettingsPath: string;
  homeSettingsBytes: string;
  homeSettingsStatBefore: { ino: number; mode: number; mtimeMs: number };
  actorBrainClaudeDir: string;
}> => {
  const repo = await genTestTempRepo({ fixture: 'with-role-hooks' });
  if (input.isAdapterLegacy)
    await setLegacyAnthropicAdapter({ repoPath: repo.path });

  // the human's home settings: known bytes, at the chosen mode
  const home = genTempDir({ slug: 'init-outside-home' });
  const homeSettingsPath = path.join(home, '.claude', 'settings.json');
  const homeSettingsBytes = `${JSON.stringify({ model: 'opus', hooks: {} }, null, 2)}\n`;
  await fs.mkdir(path.dirname(homeSettingsPath), { recursive: true });
  await fs.writeFile(homeSettingsPath, homeSettingsBytes, 'utf-8');
  await fs.chmod(homeSettingsPath, input.homeSettingsMode);
  const homeSettingsStatBefore = asFileIdentity(
    await fs.stat(homeSettingsPath),
  );

  // link the tester role, so the hook sync has role hooks to place
  invokeRhachetCliBinary({
    args: ['init', '--roles', 'tester'],
    cwd: repo.path,
    env: { HOME: home },
  });

  // one enrolled actor on disk: a manifest and a brain dir
  const actorDir = path.join(
    repo.path,
    '.agent/.actors',
    `actor.via.hash=${ACTOR_HASH}`,
  );
  await fs.mkdir(actorDir, { recursive: true });
  await fs.writeFile(
    path.join(actorDir, 'actor.json'),
    `${JSON.stringify({ schemaVersion: 1, brain: 'claude-code', roles: ['tester'] })}\n`,
    'utf-8',
  );
  const actorBrainClaudeDir = path.join(actorDir, 'brain', '.claude');

  // lay the actor's grove arrow as an enroll leaves it on a human's box:
  //   settings.json → settings.of.grove.json → <home>/.claude/settings.json. the scene then forms
  //   on any build, so the same test can run red on the release the defect was reported against
  if (input.isArrowToHomeLaid) {
    await fs.mkdir(actorBrainClaudeDir, { recursive: true });
    await fs.symlink(
      homeSettingsPath,
      path.join(actorBrainClaudeDir, 'settings.of.grove.json'),
    );
    await fs.symlink(
      'settings.of.grove.json',
      path.join(actorBrainClaudeDir, 'settings.json'),
    );
  }
  return {
    repoPath: repo.path,
    home,
    homeSettingsPath,
    homeSettingsBytes,
    homeSettingsStatBefore,
    actorBrainClaudeDir,
  };
};

/**
 * .what = swap the fixture's test brain for the real `rhachet-brains-anthropic@0.4.3`
 * .why = 0.4.3 is the adapter the defect was reported with: its hooks dao writes
 *   `.claude/settings.json` by name, via `fs.writeFile`, which follows the grove arrow to the
 *   human's home file. the fixture's test brain writes `settings.of.repo.json`, a shape that
 *   never followed the arrow, so only the real legacy adapter reproduces the report
 * .note = the package is linked from this repo's own install (pinned 0.4.3), so its deps
 *   load from its pnpm store dir and the scene needs no network
 */
const setLegacyAnthropicAdapter = async (input: {
  repoPath: string;
}): Promise<void> => {
  const adapterReal = await fs.realpath(
    path.join(__dirname, '../../node_modules/rhachet-brains-anthropic'),
  );
  const adapterVersion = JSON.parse(
    await fs.readFile(path.join(adapterReal, 'package.json'), 'utf-8'),
  ).version;
  if (adapterVersion !== '0.4.3')
    throw new ConstraintError('the legacy adapter scene needs rhachet-brains-anthropic@0.4.3', {
      found: adapterVersion,
      hint: 'pin rhachet-brains-anthropic to 0.4.3 in devDependencies, then pnpm install',
    });

  // the fixture's test brain also answers anthropic/claude/code; two adapters is ambiguous
  await fs.rm(path.join(input.repoPath, 'node_modules', 'rhachet-brains-test'), {
    recursive: true,
    force: true,
  });
  await fs.symlink(
    adapterReal,
    path.join(input.repoPath, 'node_modules', 'rhachet-brains-anthropic'),
  );
  // 0.4.3 parses a hook timeout as an iso duration only; the fixture role's `10s` shorthand
  //   fails its parse, so this temp copy declares the same timeouts in iso form
  const roleIndexPath = path.join(
    input.repoPath,
    'node_modules/rhachet-roles-test/dist/index.js',
  );
  const roleIndex = await fs.readFile(roleIndexPath, 'utf-8');
  await fs.writeFile(
    roleIndexPath,
    roleIndex.replace(/timeout: '(\d+)s'/g, "timeout: 'PT$1S'"),
    'utf-8',
  );

  const packageJsonPath = path.join(input.repoPath, 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
  const { 'rhachet-brains-test': _testBrain, ...dependenciesOther } =
    packageJson.dependencies;
  await fs.writeFile(
    packageJsonPath,
    `${JSON.stringify(
      {
        ...packageJson,
        dependencies: {
          ...dependenciesOther,
          'rhachet-brains-anthropic': '0.4.3',
        },
      },
      null,
      2,
    )}\n`,
    'utf-8',
  );
};

/**
 * .what = the facts that prove a file was never rewritten: its inode, its mode, its mtime
 * .why = same bytes alone would pass a temp-and-rename rewrite, which swaps the inode and can
 *   reset the mode; all three hold only for a file no write touched
 */
const asFileIdentity = (stat: {
  ino: number;
  mode: number;
  mtimeMs: number;
}): { ino: number; mode: number; mtimeMs: number } => ({
  ino: stat.ino,
  mode: stat.mode & 0o777,
  mtimeMs: stat.mtimeMs,
});

/**
 * .what = fail fast where the process runs as root, which ignores file modes
 * .why = a read-only scene proves naught under root: every write succeeds. the test must fail
 *   loud rather than pass on a scene that never formed (rule.require.failfast)
 */
const assertNotRoot = (): void => {
  if (process.getuid?.() === 0)
    throw new ConstraintError('a read-only scene cannot form under root', {
      hint: 'run the acceptance suite as a non-root user',
    });
};

/**
 * .what = stdout with the temp home and outside dir masked, for a stable snapshot
 */
const asStdoutMasked = (input: {
  stdout: string;
  home: string;
  outsideDir: string | null;
}): string => {
  const maskedHome = asSnapshotSafe(input.stdout)
    .split(input.home)
    .join('/TMP_HOME');
  if (!input.outsideDir) return maskedHome;
  return maskedHome.split(input.outsideDir).join('/TMP_OUTSIDE');
};

describe('rhachet init --hooks never writes outside the repo', () => {
  given('[case1] an actor whose settings.json arrow reaches a 0444 home file', () => {
    const scene = useBeforeAll(async () => {
      assertNotRoot();
      const setup = await genSceneRepoWithActorAndHome({
        homeSettingsMode: 0o444,
        isArrowToHomeLaid: true,
      });
      const result = invokeRhachetCliBinary({
        args: ['init', '--hooks'],
        cwd: setup.repoPath,
        env: { HOME: setup.home },
        logOnError: false,
      });
      const homeSettingsAfter = await fs.readFile(
        setup.homeSettingsPath,
        'utf-8',
      );
      const homeSettingsStatAfter = asFileIdentity(
        await fs.stat(setup.homeSettingsPath),
      );
      const arrowTarget = await fs.realpath(
        path.join(setup.actorBrainClaudeDir, 'settings.json'),
      );
      return {
        ...setup,
        result,
        homeSettingsAfter,
        homeSettingsStatAfter,
        arrowTarget,
      };
    });

    when('[t0] init --hooks runs', () => {
      then('the arrow does reach the home file, so the scene formed', async () => {
        expect(scene.arrowTarget).toEqual(
          await fs.realpath(scene.homeSettingsPath),
        );
      });

      then('it exits 0', () => {
        expect(scene.result.status).toEqual(0);
      });

      then('the home file holds the same bytes it held before', () => {
        expect(scene.homeSettingsAfter).toEqual(scene.homeSettingsBytes);
      });

      then('the home file is never rewritten: same inode, still 0444, same mtime', () => {
        expect(scene.homeSettingsStatAfter).toEqual(scene.homeSettingsStatBefore);
        expect(scene.homeSettingsStatAfter.mode).toEqual(0o444);
      });

      then('the read-only note names the arrow and where it lands', () => {
        expect(scene.result.stdout).toContain(
          '⚠️ left a read-only file outside the repo untouched',
        );
        // one note per home file: the repo actor and the hash actor reach the same file, and
        //   the repo actor is probed first, so its arrow is the one named
        expect(scene.result.stdout).toContain(
          'path = .agent/.actors/actor.via.repo=ambient/brain/.claude/settings.json',
        );
        expect(scene.result.stdout).toContain('(read-only)');
      });

      then('the note prints once for the one target', () => {
        const count = scene.result.stdout.split(
          'left a read-only file outside the repo untouched',
        ).length;
        expect(count - 1).toEqual(1);
      });

      then('the actor hooks land in its own settings.of.repo.json', async () => {
        const config = JSON.parse(
          await fs.readFile(
            path.join(scene.actorBrainClaudeDir, 'settings.of.repo.json'),
            'utf-8',
          ),
        );
        expect(config.hooks.SessionStart.length).toBeGreaterThan(0);
      });

      then('the stdout is locked', () => {
        expect(
          asStdoutMasked({
            stdout: scene.result.stdout,
            home: scene.home,
            outsideDir: null,
          }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case2] an actor whose settings.json arrow reaches a writable home file', () => {
    const scene = useBeforeAll(async () => {
      const setup = await genSceneRepoWithActorAndHome({
        homeSettingsMode: 0o644,
      });
      const result = invokeRhachetCliBinary({
        args: ['init', '--hooks'],
        cwd: setup.repoPath,
        env: { HOME: setup.home },
        logOnError: false,
      });
      const homeSettingsAfter = await fs.readFile(
        setup.homeSettingsPath,
        'utf-8',
      );
      const homeSettingsStatAfter = asFileIdentity(
        await fs.stat(setup.homeSettingsPath),
      );
      const arrowTarget = await fs.realpath(
        path.join(setup.actorBrainClaudeDir, 'settings.json'),
      );
      return {
        ...setup,
        result,
        homeSettingsAfter,
        homeSettingsStatAfter,
        arrowTarget,
      };
    });

    when('[t0] init --hooks runs', () => {
      then('the actor arrow does reach the home file, so the scene formed', async () => {
        expect(scene.arrowTarget).toEqual(
          await fs.realpath(scene.homeSettingsPath),
        );
      });

      then('it exits 0', () => {
        expect(scene.result.status).toEqual(0);
      });

      then('the home file holds the same bytes it held before', () => {
        expect(scene.homeSettingsAfter).toEqual(scene.homeSettingsBytes);
      });

      then('the home file is never rewritten, though it is writable: same inode, mode, mtime', () => {
        expect(scene.homeSettingsStatAfter).toEqual(scene.homeSettingsStatBefore);
      });

      then('no note prints, since naught is locked', () => {
        expect(scene.result.stdout).not.toContain('outside the repo');
      });

      then('the stdout is locked', () => {
        expect(
          asStdoutMasked({
            stdout: scene.result.stdout,
            home: scene.home,
            outsideDir: null,
          }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case3] an actor brain dir that is read-only inside the repo', () => {
    const scene = useBeforeAll(async () => {
      assertNotRoot();
      const setup = await genSceneRepoWithActorAndHome({
        homeSettingsMode: 0o644,
      });
      await fs.mkdir(setup.actorBrainClaudeDir, { recursive: true });
      await fs.chmod(setup.actorBrainClaudeDir, 0o555);
      const result = invokeRhachetCliBinary({
        args: ['init', '--hooks'],
        cwd: setup.repoPath,
        env: { HOME: setup.home },
        logOnError: false,
      });
      await fs.chmod(setup.actorBrainClaudeDir, 0o755);
      return { ...setup, result };
    });

    when('[t0] init --hooks runs', () => {
      then('it exits 1', () => {
        expect(scene.result.status).toEqual(1);
      });

      then('the fault row names the class and the errno', () => {
        expect(scene.result.stdout).toContain(
          `✗ hash=${ACTOR_HASH}\n`,
        );
        expect(scene.result.stdout).toContain(
          'error = ✋ ConstraintError: actor settings could not be written (EACCES)',
        );
      });

      then('the row names the roles, the path and the fix', () => {
        expect(scene.result.stdout).toContain('roles = tester');
        expect(scene.result.stdout).toContain(
          `path = .agent/.actors/actor.via.hash=${ACTOR_HASH}/brain/.claude`,
        );
        expect(scene.result.stdout).toContain(
          'hint = restore write access to that dir, then rerun `rhx init --hooks`',
        );
      });

      then('every returned error has its row before the one header', () => {
        const stdout = scene.result.stdout;
        const indexRow = stdout.indexOf(`✗ hash=${ACTOR_HASH}`);
        const indexHeader = stdout.indexOf(
          '💥 MalfunctionError: 1 hook sync error',
        );
        expect(indexRow).toBeGreaterThan(-1);
        expect(indexHeader).toBeGreaterThan(indexRow);
      });

      then('the stdout is locked', () => {
        expect(
          asStdoutMasked({
            stdout: scene.result.stdout,
            home: scene.home,
            outsideDir: null,
          }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case9] a faulted actor beside a 0444 home file (vision case=3 [t0])', () => {
    const scene = useBeforeAll(async () => {
      assertNotRoot();
      const setup = await genSceneRepoWithActorAndHome({
        homeSettingsMode: 0o444,
      });
      await fs.mkdir(setup.actorBrainClaudeDir, { recursive: true });
      await fs.chmod(setup.actorBrainClaudeDir, 0o555);
      const result = invokeRhachetCliBinary({
        args: ['init', '--hooks'],
        cwd: setup.repoPath,
        env: { HOME: setup.home },
        logOnError: false,
      });
      await fs.chmod(setup.actorBrainClaudeDir, 0o755);
      const homeSettingsAfter = await fs.readFile(
        setup.homeSettingsPath,
        'utf-8',
      );
      const homeSettingsStatAfter = asFileIdentity(
        await fs.stat(setup.homeSettingsPath),
      );
      return { ...setup, result, homeSettingsAfter, homeSettingsStatAfter };
    });

    when('[t0] init --hooks runs', () => {
      then('it exits 1, for the faulted actor', () => {
        expect(scene.result.status).toEqual(1);
      });

      then('the fault row names the actor, the class and the errno', () => {
        expect(scene.result.stdout).toContain(
          `✗ hash=${ACTOR_HASH}\n`,
        );
        expect(scene.result.stdout).toContain(
          'error = ✋ ConstraintError: actor settings could not be written (EACCES)',
        );
      });

      then('the read-only note still prints, through the repo actor probe', () => {
        expect(scene.result.stdout).toContain(
          '⚠️ left a read-only file outside the repo untouched',
        );
        expect(scene.result.stdout).toContain(
          'path = .agent/.actors/actor.via.repo=ambient/brain/.claude/settings.json',
        );
      });

      then('the fault row and the note both print before the one header', () => {
        const stdout = scene.result.stdout;
        const indexRow = stdout.indexOf(`✗ hash=${ACTOR_HASH}`);
        const indexNote = stdout.indexOf(
          'left a read-only file outside the repo untouched',
        );
        const indexHeader = stdout.indexOf(
          '💥 MalfunctionError: 1 hook sync error',
        );
        expect(indexRow).toBeGreaterThan(-1);
        expect(indexNote).toBeGreaterThan(-1);
        expect(indexHeader).toBeGreaterThan(indexRow);
        expect(indexHeader).toBeGreaterThan(indexNote);
      });

      then('the home file is never rewritten: same bytes, inode, 0444, mtime', () => {
        expect(scene.homeSettingsAfter).toEqual(scene.homeSettingsBytes);
        expect(scene.homeSettingsStatAfter).toEqual(scene.homeSettingsStatBefore);
        expect(scene.homeSettingsStatAfter.mode).toEqual(0o444);
      });

      then('the stdout is locked', () => {
        expect(
          asStdoutMasked({
            stdout: scene.result.stdout,
            home: scene.home,
            outsideDir: null,
          }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case10] the reported scene: the legacy adapter, and an actor arrow to a 0444 home file', () => {
    const scene = useBeforeAll(async () => {
      assertNotRoot();
      const setup = await genSceneRepoWithActorAndHome({
        homeSettingsMode: 0o444,
        isArrowToHomeLaid: true,
        isAdapterLegacy: true,
      });
      const result = invokeRhachetCliBinary({
        args: ['init', '--hooks'],
        cwd: setup.repoPath,
        env: { HOME: setup.home },
        logOnError: false,
      });
      const homeSettingsAfter = await fs.readFile(
        setup.homeSettingsPath,
        'utf-8',
      );
      const homeSettingsStatAfter = asFileIdentity(
        await fs.stat(setup.homeSettingsPath),
      );
      const actorSettingsLinkAfter = await fs.readlink(
        path.join(setup.actorBrainClaudeDir, 'settings.json'),
      );
      return {
        ...setup,
        result,
        homeSettingsAfter,
        homeSettingsStatAfter,
        actorSettingsLinkAfter,
      };
    });

    when('[t0] init --hooks runs', () => {
      then('it exits 0', () => {
        expect(scene.result.status).toEqual(0);
      });

      then('no hook sync error prints', () => {
        expect(scene.result.stdout).not.toContain('hook sync error');
        expect(scene.result.stdout).not.toContain('EACCES');
      });

      then('the home file is never rewritten: same bytes, inode, 0444, mtime', () => {
        expect(scene.homeSettingsAfter).toEqual(scene.homeSettingsBytes);
        expect(scene.homeSettingsStatAfter).toEqual(scene.homeSettingsStatBefore);
        expect(scene.homeSettingsStatAfter.mode).toEqual(0o444);
      });

      then('the read-only note prints', () => {
        expect(scene.result.stdout).toContain(
          '⚠️ left a read-only file outside the repo untouched',
        );
      });

      then('the actor settings.json is still the grove arrow', () => {
        expect(scene.actorSettingsLinkAfter).toEqual('settings.of.grove.json');
      });

      then('the actor hooks land in its own settings.of.repo.json', async () => {
        const config = JSON.parse(
          await fs.readFile(
            path.join(scene.actorBrainClaudeDir, 'settings.of.repo.json'),
            'utf-8',
          ),
        );
        expect(config.hooks.SessionStart.length).toBeGreaterThan(0);
      });

      then('the stdout is locked', () => {
        expect(
          asStdoutMasked({
            stdout: scene.result.stdout,
            home: scene.home,
            outsideDir: null,
          }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case11] the legacy adapter, and an actor arrow to a writable home file', () => {
    const scene = useBeforeAll(async () => {
      const setup = await genSceneRepoWithActorAndHome({
        homeSettingsMode: 0o644,
        isArrowToHomeLaid: true,
        isAdapterLegacy: true,
      });
      const result = invokeRhachetCliBinary({
        args: ['init', '--hooks'],
        cwd: setup.repoPath,
        env: { HOME: setup.home },
        logOnError: false,
      });
      const homeSettingsAfter = await fs.readFile(
        setup.homeSettingsPath,
        'utf-8',
      );
      const homeSettingsStatAfter = asFileIdentity(
        await fs.stat(setup.homeSettingsPath),
      );
      return { ...setup, result, homeSettingsAfter, homeSettingsStatAfter };
    });

    when('[t0] init --hooks runs', () => {
      then('it exits 0', () => {
        expect(scene.result.status).toEqual(0);
      });

      then('the home file holds the same bytes, though it is writable', () => {
        expect(scene.homeSettingsAfter).toEqual(scene.homeSettingsBytes);
      });

      then('the home file is never rewritten: same inode, mode, mtime', () => {
        expect(scene.homeSettingsStatAfter).toEqual(scene.homeSettingsStatBefore);
      });

      then('the actor hooks land in its own settings.of.repo.json', async () => {
        const config = JSON.parse(
          await fs.readFile(
            path.join(scene.actorBrainClaudeDir, 'settings.of.repo.json'),
            'utf-8',
          ),
        );
        expect(config.hooks.SessionStart.length).toBeGreaterThan(0);
      });

      then('the stdout is locked', () => {
        expect(
          asStdoutMasked({
            stdout: scene.result.stdout,
            home: scene.home,
            outsideDir: null,
          }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case12] a faulted actor beside a 0444 home file, under upgrade (vision case=3 [t1])', () => {
    const scene = useBeforeAll(async () => {
      assertNotRoot();
      const setup = await genSceneRepoWithActorAndHome({
        homeSettingsMode: 0o444,
      });

      // a no-op `pnpm`: the install phase passes offline, so the upgrade reaches its hook sync
      const stubDir = genTempDir({ slug: 'upgrade-pnpm-noop' });
      await fs.writeFile(path.join(stubDir, 'pnpm'), '#!/bin/sh\nexit 0\n', {
        mode: 0o755,
      });

      await fs.mkdir(setup.actorBrainClaudeDir, { recursive: true });
      await fs.chmod(setup.actorBrainClaudeDir, 0o555);
      const result = invokeRhachetCliBinary({
        args: ['upgrade', '--which', 'local'],
        cwd: setup.repoPath,
        env: { HOME: setup.home, PATH: `${stubDir}:${process.env.PATH}` },
        logOnError: false,
      });
      await fs.chmod(setup.actorBrainClaudeDir, 0o755);
      const homeSettingsAfter = await fs.readFile(
        setup.homeSettingsPath,
        'utf-8',
      );
      const homeSettingsStatAfter = asFileIdentity(
        await fs.stat(setup.homeSettingsPath),
      );
      return { ...setup, result, homeSettingsAfter, homeSettingsStatAfter };
    });

    when('[t0] upgrade --which local runs', () => {
      then('it exits non-zero, for the faulted actor', () => {
        expect(scene.result.status).not.toEqual(0);
      });

      then('the same fault row prints, with its roles, path and fix', () => {
        expect(scene.result.stdout).toContain(
          `✗ hash=${ACTOR_HASH}\n`,
        );
        expect(scene.result.stdout).toContain(
          'error = ✋ ConstraintError: actor settings could not be written (EACCES)',
        );
        expect(scene.result.stdout).toContain(
          'hint = restore write access to that dir, then rerun `rhx init --hooks`',
        );
      });

      then('the row prints before the one header', () => {
        const stdout = scene.result.stdout;
        const indexRow = stdout.indexOf(`✗ hash=${ACTOR_HASH}`);
        const indexHeader = stdout.indexOf(
          '💥 MalfunctionError: 1 hook sync error',
        );
        expect(indexRow).toBeGreaterThan(-1);
        expect(indexHeader).toBeGreaterThan(indexRow);
      });

      then('the home file is never rewritten: same bytes, inode, 0444, mtime', () => {
        expect(scene.homeSettingsAfter).toEqual(scene.homeSettingsBytes);
        expect(scene.homeSettingsStatAfter).toEqual(scene.homeSettingsStatBefore);
      });

      then('the stdout is locked', () => {
        expect(
          asStdoutMasked({
            stdout: scene.result.stdout,
            home: scene.home,
            outsideDir: null,
          }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case14] the repo actor brain dir is read-only, so its write faults', () => {
    const scene = useBeforeAll(async () => {
      assertNotRoot();
      const setup = await genSceneRepoWithActorAndHome({
        homeSettingsMode: 0o644,
      });
      const repoActorBrainClaudeDir = path.join(
        setup.repoPath,
        '.agent/.actors/actor.via.repo=ambient/brain/.claude',
      );
      await fs.chmod(repoActorBrainClaudeDir, 0o555);
      const result = invokeRhachetCliBinary({
        args: ['init', '--hooks'],
        cwd: setup.repoPath,
        env: { HOME: setup.home },
        logOnError: false,
      });
      await fs.chmod(repoActorBrainClaudeDir, 0o755);
      const homeSettingsBytesAfter = await fs.readFile(
        setup.homeSettingsPath,
        'utf-8',
      );
      return { ...setup, result, homeSettingsBytesAfter };
    });

    when('[t0] init --hooks runs', () => {
      then('it exits 1', () => {
        expect(scene.result.status).toEqual(1);
      });

      then('the fault prints with the repo actor and its brain dir', () => {
        expect(scene.result.stderr).toContain(
          '✗ brain://repo=ambient/boot.md not written',
        );
        expect(scene.result.stderr).toContain(
          '.agent/.actors/actor.via.repo=ambient/brain/.claude',
        );
      });

      then('the fault prints its cause', () => {
        expect(scene.result.stderr).toContain('EACCES');
      });

      then('the home file is byte-identical', () => {
        expect(scene.homeSettingsBytesAfter).toEqual(scene.homeSettingsBytes);
      });

      then('the stdout is locked', () => {
        expect(
          asStdoutMasked({
            stdout: scene.result.stdout,
            home: scene.home,
            outsideDir: null,
          }),
        ).toMatchSnapshot();
      });

      then('the stderr is locked', () => {
        expect(
          asStdoutMasked({
            stdout: scene.result.stderr,
            home: scene.home,
            outsideDir: null,
          }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case15] an actor whose settings.of.repo.json is a dir', () => {
    const scene = useBeforeAll(async () => {
      const setup = await genSceneRepoWithActorAndHome({
        homeSettingsMode: 0o644,
      });
      await fs.mkdir(
        path.join(setup.actorBrainClaudeDir, 'settings.of.repo.json'),
        { recursive: true },
      );
      const result = invokeRhachetCliBinary({
        args: ['init', '--hooks'],
        cwd: setup.repoPath,
        env: { HOME: setup.home },
        logOnError: false,
      });
      return { ...setup, result };
    });

    when('[t0] init --hooks runs', () => {
      then('it exits 1', () => {
        expect(scene.result.status).toEqual(1);
      });

      then('the row names the class and the shape at fault, never a raw errno', () => {
        expect(scene.result.stdout).toContain(
          `✗ hash=${ACTOR_HASH}\n`,
        );
        expect(scene.result.stdout).toContain(
          '├─ error = ✋ ConstraintError: settings.of.repo.json must be a real file',
        );
        expect(scene.result.stdout).not.toContain('EISDIR');
      });

      then('the row carries the roles, the path, and the fix', () => {
        expect(scene.result.stdout).toContain('├─ roles = tester');
        expect(scene.result.stdout).toContain(
          `├─ path = .agent/.actors/actor.via.hash=${ACTOR_HASH}/brain/.claude/settings.of.repo.json`,
        );
        expect(scene.result.stdout).toContain('├─ found = a dir');
        expect(scene.result.stdout).toContain('└─ hint = rhachet derives it from the roles, so remove ');
      });

      then('the stdout is locked', () => {
        expect(
          asStdoutMasked({
            stdout: scene.result.stdout,
            home: scene.home,
            outsideDir: null,
          }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case16] an actor whose settings.of.repo.json is a symlink', () => {
    const scene = useBeforeAll(async () => {
      const setup = await genSceneRepoWithActorAndHome({
        homeSettingsMode: 0o644,
      });
      const repoSettingsPath = path.join(
        setup.actorBrainClaudeDir,
        'settings.of.repo.json',
      );
      await fs.mkdir(setup.actorBrainClaudeDir, { recursive: true });
      await fs.writeFile(
        path.join(setup.actorBrainClaudeDir, 'elsewhere.json'),
        '{}\n',
        'utf-8',
      );
      await fs.rm(repoSettingsPath, { force: true });
      await fs.symlink('elsewhere.json', repoSettingsPath);
      const result = invokeRhachetCliBinary({
        args: ['init', '--hooks'],
        cwd: setup.repoPath,
        env: { HOME: setup.home },
        logOnError: false,
      });
      const linkAfter = await fs.readlink(repoSettingsPath);
      return { ...setup, result, linkAfter };
    });

    when('[t0] init --hooks runs', () => {
      then('it exits 1', () => {
        expect(scene.result.status).toEqual(1);
      });

      then('the row names the class, and found names the link', () => {
        expect(scene.result.stdout).toContain(`✗ hash=${ACTOR_HASH}\n`);
        expect(scene.result.stdout).toContain(
          '├─ error = ✋ ConstraintError: settings.of.repo.json must be a real file',
        );
        expect(scene.result.stdout).toContain(
          '├─ found = a symlink to elsewhere.json',
        );
        expect(scene.result.stdout).toContain('└─ hint = rhachet derives it from the roles, so remove ');
      });

      then('the link is untouched: the refusal precedes every write', () => {
        expect(scene.linkAfter).toEqual('elsewhere.json');
      });

      then('the stdout is locked', () => {
        expect(
          asStdoutMasked({
            stdout: scene.result.stdout,
            home: scene.home,
            outsideDir: null,
          }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case4] an actor brain dir that links to a dir outside the repo', () => {
    const scene = useBeforeAll(async () => {
      const setup = await genSceneRepoWithActorAndHome({
        homeSettingsMode: 0o644,
      });

      // the outside dir: one known file, and naught else
      const outsideDir = genTempDir({ slug: 'init-outside-target' });
      await fs.writeFile(path.join(outsideDir, 'keep.txt'), 'keep\n', 'utf-8');
      await fs.mkdir(path.dirname(setup.actorBrainClaudeDir), {
        recursive: true,
      });
      await fs.symlink(outsideDir, setup.actorBrainClaudeDir);

      const result = invokeRhachetCliBinary({
        args: ['init', '--hooks'],
        cwd: setup.repoPath,
        env: { HOME: setup.home },
        logOnError: false,
      });
      const outsideNamesAfter = await fs.readdir(outsideDir);
      return { ...setup, result, outsideDir, outsideNamesAfter };
    });

    when('[t0] init --hooks runs', () => {
      then('it exits 0', () => {
        expect(scene.result.status).toEqual(0);
      });

      then('the outside dir holds only what it held before', () => {
        expect(scene.outsideNamesAfter).toEqual(['keep.txt']);
      });

      then('the warn names the path, where it lands, what it missed, and the fix', () => {
        expect(scene.result.stdout).toContain(
          '⚠️ skipped a write outside the repo',
        );
        expect(scene.result.stdout).toContain(
          `path = .agent/.actors/actor.via.hash=${ACTOR_HASH}/brain/.claude`,
        );
        expect(scene.result.stdout).toContain(
          'effect = that brain dir got no hooks and no boot from this run',
        );
        expect(scene.result.stdout).toContain(
          'hint = point that dir, or the link above it, back inside the repo, then rerun `rhx init --hooks`',
        );
      });

      then('the actor row reads as a skip, not a fault', () => {
        expect(scene.result.stdout).toContain(
          `⚠️ hash=${ACTOR_HASH}\n`,
        );
        expect(scene.result.stdout).toContain('└─ skipped = outside the repo');
        expect(scene.result.stdout).not.toContain(`✗ hash=${ACTOR_HASH}`);
      });

      then('the stdout is locked', () => {
        expect(
          asStdoutMasked({
            stdout: scene.result.stdout,
            home: scene.home,
            outsideDir: scene.outsideDir,
          }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case19] a skipped actor beside a faulted one', () => {
    const SKIPPED_HASH = '0badc0de';
    const scene = useBeforeAll(async () => {
      assertNotRoot();
      const setup = await genSceneRepoWithActorAndHome({
        homeSettingsMode: 0o644,
      });

      // the faulted actor: its brain dir is read-only inside the repo
      await fs.mkdir(setup.actorBrainClaudeDir, { recursive: true });
      await fs.chmod(setup.actorBrainClaudeDir, 0o555);

      // the skipped actor: its brain dir links to a dir outside the repo
      const skippedActorDir = path.join(
        setup.repoPath,
        '.agent/.actors',
        `actor.via.hash=${SKIPPED_HASH}`,
      );
      await fs.mkdir(path.join(skippedActorDir, 'brain'), { recursive: true });
      await fs.writeFile(
        path.join(skippedActorDir, 'actor.json'),
        `${JSON.stringify({ schemaVersion: 1, brain: 'claude-code', roles: ['tester'] })}\n`,
        'utf-8',
      );
      const outsideDir = genTempDir({ slug: 'init-outside-skip-beside-fault' });
      await fs.writeFile(path.join(outsideDir, 'keep.txt'), 'keep\n', 'utf-8');
      await fs.symlink(
        outsideDir,
        path.join(skippedActorDir, 'brain', '.claude'),
      );

      const result = invokeRhachetCliBinary({
        args: ['init', '--hooks'],
        cwd: setup.repoPath,
        env: { HOME: setup.home },
        logOnError: false,
      });
      await fs.chmod(setup.actorBrainClaudeDir, 0o755);
      const outsideNamesAfter = await fs.readdir(outsideDir);
      return { ...setup, result, outsideDir, outsideNamesAfter };
    });

    when('[t0] init --hooks runs', () => {
      then('it exits 1: the skip does not mask the fault', () => {
        expect(scene.result.status).toEqual(1);
      });

      then('the outside dir holds only what it held before', () => {
        expect(scene.outsideNamesAfter).toEqual(['keep.txt']);
      });

      then('the faulted actor reads as a fault, and the skipped one as a skip', () => {
        expect(scene.result.stdout).toContain(`✗ hash=${ACTOR_HASH}\n`);
        expect(scene.result.stdout).toContain(`⚠️ hash=${SKIPPED_HASH}\n`);
        expect(scene.result.stdout).not.toContain(`✗ hash=${SKIPPED_HASH}`);
      });

      then('the header counts the fault alone, after both rows', () => {
        const stdout = scene.result.stdout;
        const indexHeader = stdout.indexOf(
          '💥 MalfunctionError: 1 hook sync error',
        );
        expect(indexHeader).toBeGreaterThan(stdout.indexOf(`✗ hash=${ACTOR_HASH}`));
        expect(indexHeader).toBeGreaterThan(
          stdout.indexOf(`⚠️ hash=${SKIPPED_HASH}`),
        );
      });

      then('the stdout is locked', () => {
        expect(
          asStdoutMasked({
            stdout: scene.result.stdout,
            home: scene.home,
            outsideDir: scene.outsideDir,
          }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case5] a repo with no enrolled actor, whose home file is 0444', () => {
    const scene = useBeforeAll(async () => {
      assertNotRoot();
      const repo = await genTestTempRepo({ fixture: 'with-role-hooks' });
      const home = genTempDir({ slug: 'init-outside-home-bare' });
      const homeSettingsPath = path.join(home, '.claude', 'settings.json');
      const homeSettingsBytes = `${JSON.stringify({ model: 'opus', hooks: {} }, null, 2)}\n`;
      await fs.mkdir(path.dirname(homeSettingsPath), { recursive: true });
      await fs.writeFile(homeSettingsPath, homeSettingsBytes, 'utf-8');
      await fs.chmod(homeSettingsPath, 0o444);

      // the prepare form: link the roles and sync the hooks in one call
      const result = invokeRhachetCliBinary({
        args: ['init', '--roles', 'tester', '--hooks'],
        cwd: repo.path,
        env: { HOME: home },
        logOnError: false,
      });
      const homeSettingsAfter = await fs.readFile(homeSettingsPath, 'utf-8');
      return { home, homeSettingsBytes, homeSettingsAfter, result };
    });

    when('[t0] init --roles tester --hooks runs', () => {
      then('it exits 0', () => {
        expect(scene.result.status).toEqual(0);
      });

      then('the home file holds the same bytes it held before', () => {
        expect(scene.homeSettingsAfter).toEqual(scene.homeSettingsBytes);
      });

      then("the read-only note names the repo actor's arrow, once", () => {
        // the repo actor has no actor.json here, so this note is its probe alone
        expect(scene.result.stdout).toContain(
          '⚠️ left a read-only file outside the repo untouched',
        );
        expect(scene.result.stdout).toContain(
          'actor.via.repo=ambient/brain/.claude/settings.json',
        );
        const count = scene.result.stdout.split(
          'left a read-only file outside the repo untouched',
        ).length;
        expect(count - 1).toEqual(1);
      });

      then('the stdout is locked', () => {
        expect(
          asStdoutMasked({
            stdout: scene.result.stdout,
            home: scene.home,
            outsideDir: null,
          }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case6] a repo whose actors root links to a dir outside the repo', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({ fixture: 'with-role-hooks' });
      const home = genTempDir({ slug: 'init-outside-home-actors' });
      const outsideDir = genTempDir({ slug: 'init-outside-actors-root' });
      await fs.writeFile(path.join(outsideDir, 'keep.txt'), 'keep\n', 'utf-8');
      await fs.mkdir(path.join(repo.path, '.agent'), { recursive: true });
      await fs.symlink(outsideDir, path.join(repo.path, '.agent/.actors'));

      // the prepare form: link the roles and sync the hooks in one call
      const result = invokeRhachetCliBinary({
        args: ['init', '--roles', 'tester', '--hooks'],
        cwd: repo.path,
        env: { HOME: home },
        logOnError: false,
      });
      const outsideNamesAfter = await fs.readdir(outsideDir);
      return { home, outsideDir, outsideNamesAfter, result };
    });

    when('[t0] init --roles tester --hooks runs', () => {
      then('it exits 0', () => {
        expect(scene.result.status).toEqual(0);
      });

      then('the outside dir holds only what it held before', () => {
        expect(scene.outsideNamesAfter).toEqual(['keep.txt']);
      });

      then('the warn names the repo actor brain dir and what every actor missed', () => {
        expect(scene.result.stdout).toContain(
          '⚠️ skipped a write outside the repo',
        );
        expect(scene.result.stdout).toContain(
          'path = .agent/.actors/actor.via.repo=ambient/brain/.claude',
        );
        expect(scene.result.stdout).toContain(
          'effect = the repo actor got no boot, and no actor gets its role hooks until it does',
        );
      });

      then('the stdout is locked', () => {
        expect(
          asStdoutMasked({
            stdout: scene.result.stdout,
            home: scene.home,
            outsideDir: scene.outsideDir,
          }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case17] a repo whose actors root links outside the repo, under `roles link`', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({ fixture: 'with-role-hooks' });
      const home = genTempDir({ slug: 'roles-link-outside-home' });
      const outsideDir = genTempDir({ slug: 'roles-link-outside-actors-root' });
      await fs.writeFile(path.join(outsideDir, 'keep.txt'), 'keep\n', 'utf-8');
      await fs.mkdir(path.join(repo.path, '.agent'), { recursive: true });
      await fs.symlink(outsideDir, path.join(repo.path, '.agent/.actors'));

      // `roles link` re-renders every boot the linked set feeds, through the same boot sync
      const result = invokeRhachetCliBinary({
        args: ['roles', 'link', '--role', 'tester'],
        cwd: repo.path,
        env: { HOME: home },
        logOnError: false,
      });
      const outsideNamesAfter = await fs.readdir(outsideDir);
      return { home, outsideDir, outsideNamesAfter, result };
    });

    when('[t0] roles link --role tester runs', () => {
      then('it exits 0', () => {
        expect(scene.result.status).toEqual(0);
      });

      then('the outside dir holds only what it held before', () => {
        expect(scene.outsideNamesAfter).toEqual(['keep.txt']);
      });

      then('the warn names the repo actor brain dir it skipped', () => {
        expect(scene.result.stdout).toContain(
          '⚠️ skipped a write outside the repo',
        );
        expect(scene.result.stdout).toContain(
          'path = .agent/.actors/actor.via.repo=ambient/brain/.claude',
        );
      });

      then('the stdout is locked', () => {
        expect(
          asStdoutMasked({
            stdout: scene.result.stdout,
            home: scene.home,
            outsideDir: scene.outsideDir,
          }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case18] a repo whose actors root links outside the repo, under `init --roles` with no `--hooks`', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({ fixture: 'with-role-hooks' });
      const home = genTempDir({ slug: 'init-roles-outside-home' });
      const outsideDir = genTempDir({ slug: 'init-roles-outside-actors-root' });
      await fs.writeFile(path.join(outsideDir, 'keep.txt'), 'keep\n', 'utf-8');
      await fs.mkdir(path.join(repo.path, '.agent'), { recursive: true });
      await fs.symlink(outsideDir, path.join(repo.path, '.agent/.actors'));

      const result = invokeRhachetCliBinary({
        args: ['init', '--roles', 'tester'],
        cwd: repo.path,
        env: { HOME: home },
        logOnError: false,
      });
      const outsideNamesAfter = await fs.readdir(outsideDir);
      return { home, outsideDir, outsideNamesAfter, result };
    });

    when('[t0] init --roles tester runs', () => {
      then('it exits 0', () => {
        expect(scene.result.status).toEqual(0);
      });

      then('the outside dir holds only what it held before', () => {
        expect(scene.outsideNamesAfter).toEqual(['keep.txt']);
      });

      then('the warn names the repo actor brain dir it skipped', () => {
        expect(scene.result.stdout).toContain(
          '⚠️ skipped a write outside the repo',
        );
        expect(scene.result.stdout).toContain(
          'path = .agent/.actors/actor.via.repo=ambient/brain/.claude',
        );
      });

      then('the stdout is locked', () => {
        expect(
          asStdoutMasked({
            stdout: scene.result.stdout,
            home: scene.home,
            outsideDir: scene.outsideDir,
          }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case7] the repo actor dir links outside the repo, a hash actor stays inside', () => {
    const scene = useBeforeAll(async () => {
      const setup = await genSceneRepoWithActorAndHome({
        homeSettingsMode: 0o644,
      });
      const outsideDir = genTempDir({ slug: 'init-outside-repo-actor' });
      await fs.writeFile(path.join(outsideDir, 'keep.txt'), 'keep\n', 'utf-8');
      const repoActorDir = path.join(
        setup.repoPath,
        '.agent/.actors/actor.via.repo=ambient',
      );
      await fs.rm(repoActorDir, { recursive: true, force: true });
      await fs.symlink(outsideDir, repoActorDir);

      const result = invokeRhachetCliBinary({
        args: ['init', '--roles', 'tester', '--hooks'],
        cwd: setup.repoPath,
        env: { HOME: setup.home },
        logOnError: false,
      });
      const outsideNamesAfter = await fs.readdir(outsideDir);
      return { ...setup, outsideDir, outsideNamesAfter, result };
    });

    when('[t0] init --roles tester --hooks runs', () => {
      then('it exits 0', () => {
        expect(scene.result.status).toEqual(0);
      });

      then('the outside dir holds only what it held before', () => {
        expect(scene.outsideNamesAfter).toEqual(['keep.txt']);
      });

      then('the warn says no actor got its role hooks', () => {
        expect(scene.result.stdout).toContain(
          'path = .agent/.actors/actor.via.repo=ambient/brain/.claude',
        );
        expect(scene.result.stdout).toContain(
          'effect = the repo actor got no boot, and no actor gets its role hooks until it does',
        );
      });

      then('the stdout is locked', () => {
        expect(
          asStdoutMasked({
            stdout: scene.result.stdout,
            home: scene.home,
            outsideDir: scene.outsideDir,
          }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case13] the legacy adapter, and the repo actor dir linked out (vision case=4 [t2])', () => {
    const scene = useBeforeAll(async () => {
      const setup = await genSceneRepoWithActorAndHome({
        homeSettingsMode: 0o644,
        isAdapterLegacy: true,
      });
      const outsideDir = genTempDir({ slug: 'init-outside-legacy-repo-actor' });
      await fs.writeFile(path.join(outsideDir, 'keep.txt'), 'keep\n', 'utf-8');
      const repoActorDir = path.join(
        setup.repoPath,
        '.agent/.actors/actor.via.repo=ambient',
      );
      await fs.rm(repoActorDir, { recursive: true, force: true });
      await fs.symlink(outsideDir, repoActorDir);

      const result = invokeRhachetCliBinary({
        args: ['init', '--roles', 'tester', '--hooks'],
        cwd: setup.repoPath,
        env: { HOME: setup.home },
        logOnError: false,
      });
      const outsideNamesAfter = await fs.readdir(outsideDir);
      const homeSettingsAfter = await fs.readFile(
        setup.homeSettingsPath,
        'utf-8',
      );
      return {
        ...setup,
        outsideDir,
        outsideNamesAfter,
        homeSettingsAfter,
        result,
      };
    });

    when('[t0] init --roles tester --hooks runs', () => {
      then('it exits 0', () => {
        expect(scene.result.status).toEqual(0);
      });

      then('the outside dir holds only what it held before', () => {
        expect(scene.outsideNamesAfter).toEqual(['keep.txt']);
      });

      then('the home file holds the same bytes', () => {
        expect(scene.homeSettingsAfter).toEqual(scene.homeSettingsBytes);
      });

      then('the skip warn names the repo actor dir', () => {
        expect(scene.result.stdout).toContain(
          '⚠️ skipped a write outside the repo',
        );
        expect(scene.result.stdout).toContain(
          'path = .agent/.actors/actor.via.repo=ambient/brain/.claude',
        );
      });

      then('the stdout is locked', () => {
        expect(
          asStdoutMasked({
            stdout: scene.result.stdout,
            home: scene.home,
            outsideDir: scene.outsideDir,
          }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case8] <repo>/.claude links to a dotfiles dir outside the repo', () => {
    const scene = useBeforeAll(async () => {
      const repo = await genTestTempRepo({ fixture: 'with-role-hooks' });
      const home = genTempDir({ slug: 'init-outside-home-reach' });
      const outsideDir = genTempDir({ slug: 'init-outside-reach-link' });
      await fs.writeFile(path.join(outsideDir, 'keep.txt'), 'keep\n', 'utf-8');
      await fs.rm(path.join(repo.path, '.claude'), {
        recursive: true,
        force: true,
      });
      await fs.symlink(outsideDir, path.join(repo.path, '.claude'));

      const result = invokeRhachetCliBinary({
        args: ['init', '--roles', 'tester', '--hooks'],
        cwd: repo.path,
        env: { HOME: home },
        logOnError: false,
      });
      const outsideNamesAfter = await fs.readdir(outsideDir);
      const reachAfter = await fs.readlink(path.join(repo.path, '.claude'));
      return { home, outsideDir, outsideNamesAfter, reachAfter, result };
    });

    when('[t0] init --roles tester --hooks runs', () => {
      then('it refuses as a constraint, exit 2', () => {
        expect(scene.result.status).toEqual(2);
        expect(scene.result.stderr).toContain(
          '<repo>/.claude is a symlink to another place',
        );
      });

      then("the human's link and the dir it reaches are untouched", () => {
        expect(scene.reachAfter).toEqual(scene.outsideDir);
        expect(scene.outsideNamesAfter).toEqual(['keep.txt']);
      });

      then('the stderr is locked', () => {
        expect(
          asSnapshotSafe(scene.result.stderr)
            .split(scene.outsideDir)
            .join('/TMP_OUTSIDE'),
        ).toMatchSnapshot();
      });
    });
  });
});
