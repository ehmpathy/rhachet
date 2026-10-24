import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

import { ConstraintError } from 'helpful-errors';
import { genTempDir, given, then, useThen, when } from 'test-fns';

import { getOneFocusReceiptBlock } from '@/blackbox/.test/infra/getOneFocusReceiptBlock';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { maskJsonParseCause } from '@/blackbox/.test/infra/maskJsonParseCause';
import {
  getOneIsRoleLinked,
  setupRoleFixtureRepo,
} from '@/blackbox/.test/infra/roleFixtureRepo';

/**
 * .what = the path of the ambient role foci record, beside the repo actor
 */
const asFociPath = (input: { dir: string }): string =>
  join(input.dir, '.agent/.actors/actor.via.repo=ambient/roles.foci.json');

/**
 * .what = the repo actor's role settings, where the linked roles' hooks land
 */
const asRepoSettingsPath = (input: { dir: string }): string =>
  join(
    input.dir,
    '.agent/.actors/actor.via.repo=ambient/brain/.claude/settings.of.repo.json',
  );

/**
 * .what = declares the anthropic brain package in the fixture's package.json
 * .why = `init --hooks claude-code` needs the brain's adapter, which the fixture's
 *   linked node_modules holds but its package.json does not declare
 */
const setPackageBrainAnthropicDeclared = (input: { dir: string }): void => {
  const packagePath = join(input.dir, 'package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  writeFileSync(
    packagePath,
    JSON.stringify(
      {
        ...packageJson,
        dependencies: {
          ...packageJson.dependencies,
          'rhachet-brains-anthropic': '*',
        },
      },
      null,
      2,
    ),
  );
};

describe('rhx init --roles <role>::<subject> (acceptance)', () => {
  given('[case1] an empty repo, and a focus mechanic does not declare', () => {
    const testDir = genTempDir({ slug: 'init-focus-unknown' });
    beforeAll(() => setupRoleFixtureRepo({ dir: testDir }));

    when('[t0] `init --roles mechanic::nope`', () => {
      const run = useThen('it is refused', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', 'mechanic::nope'],
          cwd: testDir,
          logOnError: false,
        }),
      );

      then('it exits 2, a constraint the caller must fix', () => {
        expect(run.status).toEqual(2);
      });

      then('it names the focus and each subject mechanic declares', () => {
        expect(run.stderr).toContain("role 'mechanic' declares no subject 'nope'");
        expect(run.stderr).toContain('mechanic::flow');
        expect(run.stderr).toContain('mechanic::code.prod');
      });

      then('the repo is left as it was found — no link, no actor dir, no record', () => {
        expect(getOneIsRoleLinked({ dir: testDir, role: 'mechanic' })).toEqual(false);
        expect(existsSync(join(testDir, '.agent/.actors'))).toEqual(false);
        expect(existsSync(asFociPath({ dir: testDir }))).toEqual(false);
      });

      then('the refusal matches its snapshot', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case3] a repo whose ambient foci record is not json', () => {
    const testDir = genTempDir({ slug: 'init-focus-corrupt' });
    beforeAll(() => {
      setupRoleFixtureRepo({ dir: testDir });
      mkdirSync(join(asFociPath({ dir: testDir }), '..'), { recursive: true });
      writeFileSync(asFociPath({ dir: testDir }), '{ mechanic: flow');
    });

    when('[t0] `init --roles +mechanic::flow`', () => {
      const run = useThen('it is refused', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', '+mechanic::flow'],
          cwd: testDir,
          logOnError: false,
        }),
      );

      then('it exits 1, and never overwrites the record it could not read', () => {
        expect(run.status).toEqual(1);
        expect(readFileSync(asFociPath({ dir: testDir }), 'utf8')).toEqual(
          '{ mechanic: flow',
        );
      });

      then('it halts before the first link — the repo is left as it was found', () => {
        expect(getOneIsRoleLinked({ dir: testDir, role: 'mechanic' })).toEqual(false);
      });

      then('it names the record and the repair', () => {
        expect(run.stderr).toContain('roles.foci.json');
        expect(run.stderr).toContain('or remove it');
        expect(run.stderr).toContain('"class": "SyntaxError"');
      });

      then('the refusal matches its snapshot, the v8 parse text masked', () => {
        expect(maskJsonParseCause(asSnapshotSafe(run.stderr))).toMatchSnapshot();
      });
    });
  });

  given('[case2] an empty repo, and a focus mechanic declares', () => {
    const testDir = genTempDir({ slug: 'init-focus-flow' });
    beforeAll(() => {
      setupRoleFixtureRepo({ dir: testDir });
      setPackageBrainAnthropicDeclared({ dir: testDir });
    });

    when('[t0] `init --roles mechanic::flow --hooks claude-code`', () => {
      // .note = the fixture holds no brain to detect, so the hook target is named
      const run = useThen('it succeeds', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', 'mechanic::flow', '--hooks', 'claude-code'],
          cwd: testDir,
        }),
      );

      then('it exits 0', () => {
        expect(run.status).toEqual(0);
      });

      then('stdout names the focus held, so a fresh focus is never silent', () => {
        expect(run.stdout).toContain('🧢 focus');
        expect(run.stdout).toContain('mechanic focused at ::flow');
      });

      then('the focus receipt renders as snapshotted', () => {
        expect(getOneFocusReceiptBlock({ output: run.stdout })).toMatchSnapshot();
      });

      then('the whole role is linked — a link carries no focus', () => {
        expect(getOneIsRoleLinked({ dir: testDir, role: 'mechanic' })).toEqual(true);
      });

      then('the ambient record holds the focus', () => {
        expect(
          JSON.parse(readFileSync(asFociPath({ dir: testDir }), 'utf8')),
        ).toEqual({ mechanic: ['flow'] });
      });

      then('the role keeps its hooks — hooks follow the role, never the focus', () => {
        expect(readFileSync(asRepoSettingsPath({ dir: testDir }), 'utf8')).toContain(
          'role=mechanic',
        );
      });

      then('the repo actor boot holds the flow subject and none of the others', () => {
        const boot = readFileSync(
          join(
            testDir,
            '.agent/.actors/actor.via.repo=ambient/brain/.claude/boot.md',
          ),
          'utf8',
        );
        expect(boot).toContain('work.flow/rule.require.trust-but-verify.md');
        expect(boot).not.toContain('rule.require.hook-wrapper-pattern.md');
        expect(boot).toContain('<focus given');
      });

    });

    when('[t0.b] `init --prep --roles mechanic::flow` persists the replay', () => {
      const run = useThen('it succeeds', () =>
        invokeRhachetCliBinary({
          args: ['init', '--prep', '--roles', 'mechanic::flow'],
          cwd: testDir,
        }),
      );

      then('prepare:rhachet replays the focus, so a fresh install keeps it', () => {
        expect(run.status).toEqual(0);
        const pkg = JSON.parse(
          readFileSync(join(testDir, 'package.json'), 'utf8'),
        );
        expect(pkg.scripts['prepare:rhachet']).toContain('mechanic::flow');
      });
    });

    when('[t0.c] a fresh worktree replays `prepare:rhachet` with no record (T1)', () => {
      // .note = the record is gitignored, so a fresh worktree holds none until the replay runs
      const scene = useThen('the replay succeeds', () => {
        const bootPath = join(
          testDir,
          '.agent/.actors/actor.via.repo=ambient/brain/.claude/boot.md',
        );
        const bootBefore = readFileSync(bootPath, 'utf8');
        rmSync(asFociPath({ dir: testDir }));
        const pkg = JSON.parse(
          readFileSync(join(testDir, 'package.json'), 'utf8'),
        );
        const words: string[] = pkg.scripts['prepare:rhachet'].split(/\s+/);
        const run = invokeRhachetCliBinary({
          args: words.slice(words.indexOf('init')),
          cwd: testDir,
        });
        return { run, bootBefore, bootAfter: readFileSync(bootPath, 'utf8') };
      });

      then('it exits 0', () => {
        expect(scene.run.status).toEqual(0);
      });

      then('the record is restored from the replay', () => {
        expect(
          JSON.parse(readFileSync(asFociPath({ dir: testDir }), 'utf8')),
        ).toEqual({ mechanic: ['flow'] });
      });

      then('the repo actor boot is byte-identical — the replay never widens the role', () => {
        expect(scene.bootAfter).toEqual(scene.bootBefore);
      });
    });

    when('[t1] `init --roles +mechanic` widens it back', () => {
      const run = useThen('it succeeds', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', '+mechanic'],
          cwd: testDir,
        }),
      );

      then('the ambient record holds no focus', () => {
        expect(run.status).toEqual(0);
        expect(
          JSON.parse(readFileSync(asFociPath({ dir: testDir }), 'utf8')),
        ).toEqual({});
      });

      then('stdout names the widen, and the receipt renders as snapshotted', () => {
        expect(run.stdout).toContain('widened');
        expect(getOneFocusReceiptBlock({ output: run.stdout })).toMatchSnapshot();
      });
    });
  });

  given('[case7] an empty repo, and `--keys` beside a focus', () => {
    const testDir = genTempDir({ slug: 'init-focus-keys' });
    beforeAll(() => setupRoleFixtureRepo({ dir: testDir }));

    when('[t0] `init --roles mechanic::flow --keys`', () => {
      const run = useThen('it succeeds', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', 'mechanic::flow', '--keys'],
          cwd: testDir,
        }),
      );

      then('it exits 0', () => {
        expect(run.status).toEqual(0);
      });

      then('the keyrack manifest extends the role keyrack, found by the role alone', () => {
        const manifest = readFileSync(
          join(testDir, '.agent', 'keyrack.yml'),
          'utf8',
        );
        expect(manifest).toContain('extends:');
        expect(manifest).toContain('role=mechanic/keyrack.yml');
        expect(manifest).not.toContain('::flow');
      });

      then('the keyrack manifest renders as snapshotted', () => {
        expect(
          readFileSync(join(testDir, '.agent', 'keyrack.yml'), 'utf8'),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case8] an empty repo, and a focus on a role that declares no subjects', () => {
    const testDir = genTempDir({ slug: 'init-focus-unfocusable' });
    beforeAll(() => setupRoleFixtureRepo({ dir: testDir }));

    when('[t0] `init --roles driver::flow`', () => {
      const run = useThen('it is refused', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', 'driver::flow'],
          cwd: testDir,
          logOnError: false,
        }),
      );

      then('it exits 2, a constraint the caller must fix', () => {
        expect(run.status).toEqual(2);
      });

      then('it states the role cannot be focused, and names it whole as the fix', () => {
        expect(run.stderr).toContain(
          "✋ ConstraintError: role 'driver' declares no subjects, so it cannot be focused",
        );
        expect(run.stderr).toContain("name 'driver' whole");
        expect(run.stderr).not.toContain('focus one of');
      });

      then('the repo is left as it was found — no link, no actor dir, no record', () => {
        expect(getOneIsRoleLinked({ dir: testDir, role: 'driver' })).toEqual(false);
        expect(existsSync(join(testDir, '.agent/.actors'))).toEqual(false);
        expect(existsSync(asFociPath({ dir: testDir }))).toEqual(false);
      });

      then('the refusal matches its snapshot', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case9] a repo with mechanic linked whole', () => {
    const testDir = genTempDir({ slug: 'init-focus-narrow' });
    beforeAll(() => {
      setupRoleFixtureRepo({ dir: testDir });
      const seeded = invokeRhachetCliBinary({
        args: ['init', '--roles', 'mechanic'],
        cwd: testDir,
      });
      if (seeded.status !== 0)
        throw new ConstraintError('the focus fixture could not seed its init', {
          stderr: seeded.stderr,
          hint: 'run `npm run build` so the linked fixture loads a fresh dist',
        });
    });

    when('[t0] `init --roles +mechanic::flow` narrows it', () => {
      const run = useThen('it succeeds', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', '+mechanic::flow'],
          cwd: testDir,
        }),
      );

      then('it exits 0, and the record holds the focus', () => {
        expect(run.status).toEqual(0);
        expect(
          JSON.parse(readFileSync(asFociPath({ dir: testDir }), 'utf8')),
        ).toEqual({ mechanic: ['flow'] });
      });

      then('stdout names the narrow, and the receipt renders as snapshotted', () => {
        expect(run.stdout).toContain('mechanic narrowed to ::flow');
        expect(getOneFocusReceiptBlock({ output: run.stdout })).toMatchSnapshot();
      });
    });

    when('[t1] `init --roles +mechanic::code.prod` moves it', () => {
      const run = useThen('it succeeds', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', '+mechanic::code.prod'],
          cwd: testDir,
        }),
      );

      then('it exits 0, and the record holds the new focus alone', () => {
        expect(run.status).toEqual(0);
        expect(
          JSON.parse(readFileSync(asFociPath({ dir: testDir }), 'utf8')),
        ).toEqual({ mechanic: ['code.prod'] });
      });

      then('the move receipt renders as snapshotted', () => {
        expect(getOneFocusReceiptBlock({ output: run.stdout })).toMatchSnapshot();
      });
    });
  });

  given('[case4] a repo with mechanic focused at flow (E-init)', () => {
    const testDir = genTempDir({ slug: 'init-focus-exact-omits' });
    beforeAll(() => {
      setupRoleFixtureRepo({ dir: testDir });
      const seeded = invokeRhachetCliBinary({
        args: ['init', '--roles', '+mechanic::flow'],
        cwd: testDir,
      });
      if (seeded.status !== 0)
        throw new ConstraintError('the focus fixture could not seed its init', {
          stderr: seeded.stderr,
          hint: 'run `npm run build` so the linked fixture loads a fresh dist',
        });
    });

    when('[t0] an exact `init --roles architect` that never names mechanic', () => {
      const run = useThen('it succeeds', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', 'architect'],
          cwd: testDir,
        }),
      );

      then('it exits 0', () => {
        expect(run.status).toEqual(0);
      });

      then('mechanic stays linked — an exact init links, never unlinks', () => {
        expect(getOneIsRoleLinked({ dir: testDir, role: 'mechanic' })).toEqual(true);
      });

      then('mechanic keeps its focus — the record follows the links', () => {
        expect(
          JSON.parse(readFileSync(asFociPath({ dir: testDir }), 'utf8')),
        ).toEqual({ mechanic: ['flow'] });
      });

      then('no receipt claims mechanic widened', () => {
        expect(run.stdout).not.toContain('widened');
      });

      then('the repo actor boot still holds mechanic at flow alone', () => {
        const boot = readFileSync(
          join(
            testDir,
            '.agent/.actors/actor.via.repo=ambient/brain/.claude/boot.md',
          ),
          'utf8',
        );
        expect(boot).toContain('work.flow/rule.require.trust-but-verify.md');
        expect(boot).not.toContain('rule.require.hook-wrapper-pattern.md');
      });

      then('the receipt and the held focus line render as snapshotted', () => {
        // .note = an exact init that never names mechanic changes no focus, so its receipt is ''
        const boot = readFileSync(
          join(
            testDir,
            '.agent/.actors/actor.via.repo=ambient/brain/.claude/boot.md',
          ),
          'utf8',
        );
        expect({
          receipt: getOneFocusReceiptBlock({ output: run.stdout }),
          lineFocus: boot.split('\n').find((line) => line.startsWith('<focus given=')),
        }).toMatchSnapshot();
      });
    });
  });

  given('[case5] the repo record holds a focus mechanic no longer declares (U1 on init)', () => {
    const testDir = genTempDir({ slug: 'init-focus-stale-record' });
    beforeAll(() => {
      setupRoleFixtureRepo({ dir: testDir });
      setPackageBrainAnthropicDeclared({ dir: testDir });
      const seeded = invokeRhachetCliBinary({
        args: ['init', '--roles', '+mechanic::flow'],
        cwd: testDir,
      });
      if (seeded.status !== 0)
        throw new ConstraintError('the focus fixture could not seed its init', {
          stderr: seeded.stderr,
          hint: 'run `npm run build` so the linked fixture loads a fresh dist',
        });

      // the role "dropped" the subject: the record now names one it never declared
      writeFileSync(
        asFociPath({ dir: testDir }),
        JSON.stringify({ mechanic: ['gone'] }),
      );
    });

    when('[t0] an init that names another role, `init --roles +architect`', () => {
      const run = useThen('it is refused', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', '+architect'],
          cwd: testDir,
          logOnError: false,
        }),
      );

      then('it exits 2, a constraint the caller must fix', () => {
        expect(run.status).toEqual(2);
      });

      then('it names the recorded focus, the declared subjects, and the fix with --hooks', () => {
        expect(run.stderr).toContain("declares no subject 'gone'");
        expect(run.stderr).toContain('recorded before the role dropped it');
        expect(run.stderr).toContain('rhx init --roles +mechanic::<one of');
        expect(run.stderr).toContain('--hooks');
      });

      then('the refusal matches its snapshot', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] the hint is followed, `init --roles +mechanic::flow --hooks claude-code`', () => {
      const run = useThen('it succeeds', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', '+mechanic::flow', '--hooks', 'claude-code'],
          cwd: testDir,
        }),
      );

      then('it exits 0', () => {
        expect(run.status).toEqual(0);
      });

      then('the record holds the declared focus again', () => {
        expect(
          JSON.parse(readFileSync(asFociPath({ dir: testDir }), 'utf8')),
        ).toEqual({ mechanic: ['flow'] });
      });

      then("mechanic's hooks land in the repo actor's settings", () => {
        expect(readFileSync(asRepoSettingsPath({ dir: testDir }), 'utf8')).toContain(
          'role=mechanic',
        );
      });
    });
  });

  given('[case6] the `prepare:rhachet` replay names a subject mechanic no longer declares (U6)', () => {
    const testDir = genTempDir({ slug: 'init-focus-stale-replay' });

    /**
     * .what = runs the replay's own init command, as `pnpm install` would
     */
    const runReplay = () => {
      const pkg = JSON.parse(readFileSync(join(testDir, 'package.json'), 'utf8'));
      const words: string[] = pkg.scripts['prepare:rhachet'].split(/\s+/);
      return invokeRhachetCliBinary({
        args: words.slice(words.indexOf('init')),
        cwd: testDir,
        logOnError: false,
      });
    };

    beforeAll(() => {
      setupRoleFixtureRepo({ dir: testDir });
      const seeded = invokeRhachetCliBinary({
        args: ['init', '--prep', '--roles', 'mechanic::flow'],
        cwd: testDir,
      });
      if (seeded.status !== 0)
        throw new ConstraintError('the focus fixture could not seed its init', {
          stderr: seeded.stderr,
          hint: 'run `npm run build` so the linked fixture loads a fresh dist',
        });

      // the role "dropped" the subject: the replay now names one it never declared
      const packagePath = join(testDir, 'package.json');
      const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
      writeFileSync(
        packagePath,
        JSON.stringify(
          {
            ...pkg,
            scripts: {
              ...pkg.scripts,
              'prepare:rhachet': pkg.scripts['prepare:rhachet'].replace(
                'mechanic::flow',
                'mechanic::gone',
              ),
            },
          },
          null,
          2,
        ),
      );
    });

    when('[t0] the replay runs', () => {
      const run = useThen('it is refused', () => runReplay());

      then('it exits 2, a constraint the caller must fix', () => {
        expect(run.status).toEqual(2);
      });

      then('it names the replay and the fix that rewrites it, with --prep', () => {
        expect(run.stderr).toContain("declares no subject 'gone'");
        expect(run.stderr).toContain('prepare:rhachet');
        expect(run.stderr).toContain('rhx init --prep --roles +mechanic::<one of');
      });

      then('the refusal matches its snapshot', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });

    when('[t1] the hint is followed, `init --prep --roles +mechanic::flow`', () => {
      const scene = useThen('it succeeds', () => {
        const fix = invokeRhachetCliBinary({
          args: ['init', '--prep', '--roles', '+mechanic::flow'],
          cwd: testDir,
        });
        const pkg = JSON.parse(readFileSync(join(testDir, 'package.json'), 'utf8'));
        return { fix, replay: pkg.scripts['prepare:rhachet'] as string };
      });

      then('it exits 0', () => {
        expect(scene.fix.status).toEqual(0);
      });

      then('the replay names the declared focus, and the dropped one no more', () => {
        expect(scene.replay).toContain('mechanic::flow');
        expect(scene.replay).not.toContain('mechanic::gone');
      });
    });

    when('[t2] the replay runs again', () => {
      const run = useThen('it succeeds', () => runReplay());

      then('it exits 0 — the next install is whole again', () => {
        expect(run.status).toEqual(0);
      });
    });
  });
});
