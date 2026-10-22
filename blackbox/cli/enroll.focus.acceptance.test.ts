import { chmodSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { MalfunctionError } from 'helpful-errors';
import { genTempDir, given, then, useThen, when } from 'test-fns';

import { setupEnrollFixture } from '@/blackbox/.test/infra/enrollCloneHarness';
import { getOneFocusReceiptBlock } from '@/blackbox/.test/infra/getOneFocusReceiptBlock';
import { seedRoleAuthoredHooks } from '@/blackbox/.test/infra/seedRoleAuthoredHooks';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = writes a stub `claude` that answers the version floor and exits 0, and returns
 *   a PATH that finds it first
 * .why = enroll writes the actor dir before it spawns the brain, so a stub that exits 0
 *   lets the run complete and leaves the actor dir to assert on
 */
const setupExitStubBrainPath = (input: { dir: string }): string => {
  const binDir = join(input.dir, '.stub-bin');
  mkdirSync(binDir, { recursive: true });
  const stubPath = join(binDir, 'claude');
  writeFileSync(
    stubPath,
    '#!/usr/bin/env bash\nif [ "$1" = "--version" ]; then echo "2.1.277 (Claude Code)"; fi\nexit 0\n',
    'utf-8',
  );
  chmodSync(stubPath, 0o755);
  return `${binDir}:${process.env.PATH ?? ''}`;
};

/**
 * .what = the hash actor dirs an enroll wrote, by name
 */
const getAllActorHashDirNames = (input: { dir: string }): string[] => {
  const actorsRoot = join(input.dir, '.agent', '.actors');
  if (!existsSync(actorsRoot)) return [];
  return readdirSync(actorsRoot).filter((name) =>
    name.startsWith('actor.via.hash='),
  );
};

/**
 * .what = the brain dir of the one hash actor an enroll wrote
 * .note = zero or several hash actors fails loud: each case enrolls one roleset once
 */
const getOneEnrolledBrainDir = (input: { dir: string }): string => {
  const hashDirs = getAllActorHashDirNames({ dir: input.dir });
  if (hashDirs.length !== 1)
    throw new MalfunctionError('expected exactly one hash actor', {
      dir: input.dir,
      hashDirs,
      hint: 'check the enroll exited 0 and that the case enrolled once',
    });
  return join(input.dir, '.agent', '.actors', hashDirs[0]!, 'brain', '.claude');
};

describe('rhx enroll --roles <role>::<subject> (acceptance)', () => {
  given('[case1] mechanic, architect and driver linked, and a focus mechanic declares', () => {
    const dir = genTempDir({ slug: 'enroll-focus-flow' });
    let stubPath: string;
    beforeAll(() => {
      setupEnrollFixture({ dir });
      seedRoleAuthoredHooks({ dir });
      stubPath = setupExitStubBrainPath({ dir });
    });

    when('[t0] `enroll claude --roles +mechanic::flow`', () => {
      const run = useThen('it reaches the stub brain', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--roles', '+mechanic::flow'],
          cwd: dir,
          env: { PATH: stubPath },
          logOnError: false,
        }),
      );

      then('it exits 0', () => {
        expect(run.status).toEqual(0);
      });

      then('the boot holds the flow subject and none of the others', () => {
        const boot = readFileSync(
          join(getOneEnrolledBrainDir({ dir }), 'boot.md'),
          'utf-8',
        );
        expect(boot).toContain('work.flow/rule.require.trust-but-verify.md');
        expect(boot).not.toContain('rule.require.hook-wrapper-pattern.md');
        expect(boot).not.toContain('rule.require.blackbox-via-selflink.md');
        expect(boot).toContain('<focus given');
      });

      then('the actor keeps the mechanic hook — hooks follow the role, never the focus', () => {
        const settings = readFileSync(
          join(getOneEnrolledBrainDir({ dir }), 'settings.of.repo.json'),
          'utf-8',
        );
        expect(settings).toContain('repo=ehmpathy/role=mechanic');
        expect(settings).toContain('repo=bhrain/role=driver');
        expect(settings).toContain('repo=ehmpathy/role=architect');
      });

      then('stderr names the focus in its receipt', () => {
        expect(run.stderr).toContain('🧢 focus');
        expect(run.stderr).toContain('mechanic narrowed to ::flow');
      });

      then('the narrow receipt renders as snapshotted', () => {
        expect(getOneFocusReceiptBlock({ output: run.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case2] an exact set that names mechanic at a focus alone', () => {
    const dir = genTempDir({ slug: 'enroll-focus-exact' });
    let stubPath: string;
    beforeAll(() => {
      setupEnrollFixture({ dir });
      seedRoleAuthoredHooks({ dir });
      stubPath = setupExitStubBrainPath({ dir });
    });

    when('[t0] `enroll claude --roles mechanic::flow`', () => {
      const run = useThen('it reaches the stub brain', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--roles', 'mechanic::flow'],
          cwd: dir,
          env: { PATH: stubPath },
          logOnError: false,
        }),
      );

      then('the focused role keeps its hook, and the roles not named lose theirs', () => {
        expect(run.status).toEqual(0);
        const settings = readFileSync(
          join(getOneEnrolledBrainDir({ dir }), 'settings.of.repo.json'),
          'utf-8',
        );
        expect(settings).toContain('repo=ehmpathy/role=mechanic');
        expect(settings).not.toContain('repo=bhrain/role=driver');
        expect(settings).not.toContain('repo=ehmpathy/role=architect');
      });

      then('stderr names the focus the exact set gave', () => {
        expect(run.stderr).toContain('🧢 focus');
        expect(run.stderr).toContain('mechanic focused at ::flow');
      });

      then('the given receipt renders as snapshotted', () => {
        expect(getOneFocusReceiptBlock({ output: run.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case3] mechanic linked, and a focus mechanic does not declare', () => {
    const dir = genTempDir({ slug: 'enroll-focus-unknown' });
    let stubPath: string;
    beforeAll(() => {
      setupEnrollFixture({ dir });
      stubPath = setupExitStubBrainPath({ dir });
    });

    when('[t0] `enroll claude --roles +mechanic::nope`', () => {
      const run = useThen('it is refused', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--roles', '+mechanic::nope'],
          cwd: dir,
          env: { PATH: stubPath },
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

      then('no actor dir is written', () => {
        expect(getAllActorHashDirNames({ dir })).toEqual([]);
      });

      then('the refusal matches its snapshot', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });
  });
});
