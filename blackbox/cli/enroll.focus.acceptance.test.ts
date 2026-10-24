import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { genTempDir, given, then, useThen, when } from 'test-fns';

import { getAllActorHashDirNames } from '@/blackbox/.test/infra/brainDirBootJourney';
import { setupEnrollFixture } from '@/blackbox/.test/infra/enrollCloneHarness';
import { getOneFocusReceiptBlock } from '@/blackbox/.test/infra/getOneFocusReceiptBlock';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { maskJsonParseCause } from '@/blackbox/.test/infra/maskJsonParseCause';
import { seedRoleAuthoredHooks } from '@/blackbox/.test/infra/seedRoleAuthoredHooks';
import { setupStubBrainPath } from '@/blackbox/.test/infra/setupStubBrainPath';

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
      stubPath = setupStubBrainPath({ dir });
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

  given('[case1.b] the bare alias, with no --roles flag (S3, E3)', () => {
    const dir = genTempDir({ slug: 'enroll-focus-bare-alias' });
    let stubPath: string;
    beforeAll(() => {
      setupEnrollFixture({ dir });
      seedRoleAuthoredHooks({ dir });
      stubPath = setupStubBrainPath({ dir });
    });

    when('[t0] `enroll claude +mechanic::flow`', () => {
      const run = useThen('it reaches the stub brain', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '+mechanic::flow'],
          cwd: dir,
          env: { PATH: stubPath },
          logOnError: false,
        }),
      );

      then('it exits 0, and the token reads as a delta — never as text for the brain', () => {
        expect(run.status).toEqual(0);
        expect(run.stderr).toContain('mechanic narrowed to ::flow');
      });

      then('the focus line the clone reads renders as snapshotted', () => {
        const boot = readFileSync(
          join(getOneEnrolledBrainDir({ dir }), 'boot.md'),
          'utf-8',
        );
        const lineFocus = boot
          .split('\n')
          .find((line) => line.startsWith('<focus given='));
        expect(lineFocus).toContain('given="flow"');
        expect(lineFocus).toMatchSnapshot();
      });
    });
  });

  given('[case2] an exact set that names mechanic at a focus alone', () => {
    const dir = genTempDir({ slug: 'enroll-focus-exact' });
    let stubPath: string;
    beforeAll(() => {
      setupEnrollFixture({ dir });
      seedRoleAuthoredHooks({ dir });
      stubPath = setupStubBrainPath({ dir });
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
      stubPath = setupStubBrainPath({ dir });
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

  given('[case4] mechanic linked, and a focus the set has no shape for', () => {
    const dir = genTempDir({ slug: 'enroll-focus-refusals' });
    let stubPath: string;
    beforeAll(() => {
      setupEnrollFixture({ dir });
      stubPath = setupStubBrainPath({ dir });
    });

    // .note = each row asserts its refusal's own sentence: the `[args]` echo also carries the
    //   token, so a bare-token assert would pass on the echo alone
    const cases = [
      {
        label: '[t0] `--roles -mechanic::flow` (P12)',
        args: ['--roles', '-mechanic::flow'],
        sentence:
          "a subtraction removes a role whole; '-mechanic::flow' names a focus",
      },
      {
        label: '[t1] `--roles mechanic,mechanic::flow` (S1)',
        args: ['--roles', 'mechanic,mechanic::flow'],
        sentence: "role 'mechanic' is named both whole and focused",
      },
      {
        label: '[t2] `--roles mechanic:flow`, one colon (P14)',
        args: ['--roles', 'mechanic:flow'],
        sentence:
          "role focus 'mechanic:flow' has one colon; a focus is written <role>::<subject>",
      },
      {
        label: '[t3] the bare alias `+mechanic:flow`, one colon (P14)',
        args: ['+mechanic:flow'],
        sentence:
          "role focus 'mechanic:flow' has one colon; a focus is written <role>::<subject>",
      },
    ];
    cases.forEach((thisCase) =>
      when(thisCase.label, () => {
        const run = useThen('it is refused', () =>
          invokeRhachetCliBinary({
            args: ['enroll', 'claude', ...thisCase.args],
            cwd: dir,
            env: { PATH: stubPath },
            logOnError: false,
          }),
        );

        then('it exits 2, states the refusal for its token, and writes no actor', () => {
          expect(run.status).toEqual(2);
          expect(run.stderr).toContain(`✋ ConstraintError: ${thisCase.sentence}`);
          expect(getAllActorHashDirNames({ dir })).toEqual([]);
        });

        then('the refusal matches its snapshot', () => {
          expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
        });
      }),
    );
  });

  given('[case4.b] driver linked, a role that declares no subjects', () => {
    const dir = genTempDir({ slug: 'enroll-focus-unfocusable' });
    let stubPath: string;
    beforeAll(() => {
      setupEnrollFixture({ dir });
      stubPath = setupStubBrainPath({ dir });
    });

    when('[t0] `enroll claude --roles +driver::flow`', () => {
      const run = useThen('it is refused', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--roles', '+driver::flow'],
          cwd: dir,
          env: { PATH: stubPath },
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

      then('no actor dir is written', () => {
        expect(getAllActorHashDirNames({ dir })).toEqual([]);
      });

      then('the refusal matches its snapshot', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case5] a repo whose ambient foci record is not json', () => {
    const dir = genTempDir({ slug: 'enroll-focus-corrupt' });
    const fociPath = join(
      dir,
      '.agent/.actors/actor.via.repo=ambient/roles.foci.json',
    );
    let stubPath: string;
    beforeAll(() => {
      setupEnrollFixture({ dir });
      stubPath = setupStubBrainPath({ dir });
      mkdirSync(join(fociPath, '..'), { recursive: true });
      writeFileSync(fociPath, '{ mechanic: flow');
    });

    when('[t0] `enroll claude --roles +mechanic::flow`', () => {
      const run = useThen('it is refused', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--roles', '+mechanic::flow'],
          cwd: dir,
          env: { PATH: stubPath },
          logOnError: false,
        }),
      );

      then('it exits 1 and never overwrites the record', () => {
        expect(run.status).toEqual(1);
        expect(readFileSync(fociPath, 'utf-8')).toEqual('{ mechanic: flow');
      });

      then('it names the record and the repair', () => {
        expect(run.stderr).toContain('roles.foci.json');
        expect(run.stderr).toContain('"class": "SyntaxError"');
      });

      then('the refusal matches its snapshot, the v8 parse text masked', () => {
        expect(maskJsonParseCause(asSnapshotSafe(run.stderr))).toMatchSnapshot();
      });
    });
  });

  given('[case6] a native role whose small subject opts out of always', () => {
    const dir = genTempDir({ slug: 'enroll-focus-inherit' });
    const roleDir = join(dir, '.agent/repo=.this/role=lean');
    let stubPath: string;
    beforeAll(() => {
      setupEnrollFixture({ dir });
      stubPath = setupStubBrainPath({ dir });
      mkdirSync(join(roleDir, 'briefs'), { recursive: true });
      writeFileSync(join(roleDir, 'readme.md'), '# lean\n');
      writeFileSync(join(roleDir, 'briefs/base.md'), '# base, always\n');
      writeFileSync(join(roleDir, 'briefs/tiny.md'), '# tiny\n');
      writeFileSync(join(roleDir, 'briefs/wide.md'), '# wide\n');
      writeFileSync(
        join(roleDir, 'boot.yml'),
        [
          'always:',
          '  briefs:',
          '    say:',
          '      - briefs/base.md',
          'subject.tiny:',
          '  inherit:',
          '    always: false',
          '  briefs:',
          '    say:',
          '      - briefs/tiny.md',
          'subject.wide:',
          '  briefs:',
          '    say:',
          '      - briefs/wide.md',
          '',
        ].join('\n'),
      );

      // lean's rails: a PreToolUse guard and a SessionStart hook, as a role's own init writes
      //   them, so the opt-out and the kept rails are proven in one run (the wish's headline)
      mkdirSync(join(dir, '.claude'), { recursive: true });
      writeFileSync(
        join(dir, '.claude', 'settings.of.repo.json'),
        JSON.stringify({
          hooks: {
            PreToolUse: [
              {
                matcher: 'Bash',
                hooks: [
                  {
                    type: 'command',
                    command: 'true # lean.guard',
                    author: 'repo=.this/role=lean',
                  },
                ],
              },
            ],
            SessionStart: [
              {
                matcher: '*',
                hooks: [
                  {
                    type: 'command',
                    command: 'true # lean.boot',
                    author: 'repo=.this/role=lean',
                  },
                ],
              },
            ],
          },
        }),
      );
    });

    when('[t0] `enroll claude --roles +lean::tiny`', () => {
      const run = useThen('it reaches the stub brain', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--roles', '+lean::tiny'],
          cwd: dir,
          env: { PATH: stubPath },
          logOnError: false,
        }),
      );

      then('it exits 0', () => {
        expect(run.status).toEqual(0);
      });

      then('the boot holds the tiny subject, and sheds always and wide', () => {
        const boot = readFileSync(
          join(getOneEnrolledBrainDir({ dir }), 'boot.md'),
          'utf-8',
        );
        expect(boot).toContain('role=lean/briefs/tiny.md');
        expect(boot).not.toContain('role=lean/briefs/base.md');
        expect(boot).not.toContain('role=lean/briefs/wide.md');
      });

      then('the same run keeps every lean rail, PreToolUse guard included — a small focus with all its hooks', () => {
        const settings = JSON.parse(
          readFileSync(
            join(getOneEnrolledBrainDir({ dir }), 'settings.of.repo.json'),
            'utf-8',
          ),
        );
        expect(JSON.stringify(settings.hooks.PreToolUse)).toContain(
          'lean.guard',
        );
        expect(JSON.stringify(settings.hooks.SessionStart)).toContain(
          'lean.boot',
        );
      });

      then('the focus line names the subjects held elsewhere, ahead of the role content (V1)', () => {
        const boot = readFileSync(
          join(getOneEnrolledBrainDir({ dir }), 'boot.md'),
          'utf-8',
        );
        const lineFocus = '<focus given="tiny" elsewhere="wide" always="shed"/>';
        expect(boot).toContain(lineFocus);
        expect(boot.indexOf(lineFocus)).toBeLessThan(
          boot.indexOf('role=lean/readme.md'),
        );
        expect(boot.indexOf(lineFocus)).toBeLessThan(
          boot.indexOf('role=lean/briefs/tiny.md'),
        );
      });

      then('the shed receipt renders as snapshotted', () => {
        expect(getOneFocusReceiptBlock({ output: run.stderr })).toMatchSnapshot();
      });
    });

    when('[t1] the subject misspells the key as `inherits` (K2)', () => {
      const run = useThen('it is refused', () => {
        writeFileSync(
          join(roleDir, 'boot.yml'),
          [
            'subject.tiny:',
            '  inherits:',
            '    always: false',
            '  briefs:',
            '    say:',
            '      - briefs/tiny.md',
            '',
          ].join('\n'),
        );
        return invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--roles', 'lean::tiny'],
          cwd: dir,
          env: { PATH: stubPath },
          logOnError: false,
        });
      });

      then('it exits 2 and names the key expected', () => {
        expect(run.status).toEqual(2);
        expect(run.stderr).toContain('inherit');
      });

      then('the refusal matches its snapshot', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case7] the repo record holds mechanic at flow (A1)', () => {
    const dir = genTempDir({ slug: 'enroll-focus-inherited' });
    let stubPath: string;
    beforeAll(() => {
      setupEnrollFixture({ dir });
      stubPath = setupStubBrainPath({ dir });
      setRepoFociRecord({ dir, foci: { mechanic: ['flow'] } });
    });

    when('[t0] a bare `enroll claude`', () => {
      const run = useThen('it reaches the stub brain', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude'],
          cwd: dir,
          env: { PATH: stubPath },
          logOnError: false,
        }),
      );

      then('it exits 0', () => {
        expect(run.status).toEqual(0);
      });

      then('the seat boots mechanic at flow, inherited from the record', () => {
        // .note = a bare enroll is a clone of the repo actor, so it writes no hash actor
        expect(getAllActorHashDirNames({ dir })).toEqual([]);
        const boot = readFileSync(
          join(dir, '.agent/.actors/actor.via.repo=ambient/brain/.claude/boot.md'),
          'utf-8',
        );
        expect(boot).toContain('work.flow/rule.require.trust-but-verify.md');
        expect(boot).not.toContain('rule.require.hook-wrapper-pattern.md');
      });

      then('stderr names the inherited focus — never silent', () => {
        expect(run.stderr).toContain('🧢 focus');
        expect(run.stderr).toContain('mechanic held at ::flow');
      });

      then('the held receipt renders as snapshotted', () => {
        expect(getOneFocusReceiptBlock({ output: run.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case8] the repo record holds a focus mechanic no longer declares (U1 on enroll)', () => {
    const dir = genTempDir({ slug: 'enroll-focus-recorded-stale' });
    let stubPath: string;
    beforeAll(() => {
      setupEnrollFixture({ dir });
      stubPath = setupStubBrainPath({ dir });
      setRepoFociRecord({ dir, foci: { mechanic: ['gone'] } });
    });

    when('[t0] a bare `enroll claude` inherits it', () => {
      const run = useThen('it is refused', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude'],
          cwd: dir,
          env: { PATH: stubPath },
          logOnError: false,
        }),
      );

      then('it exits 2 and writes no actor', () => {
        expect(run.status).toEqual(2);
        expect(getAllActorHashDirNames({ dir })).toEqual([]);
      });

      then('it gives the recorded hint, never the typo hint — the caller never typed it', () => {
        expect(run.stderr).toContain('the focus was recorded');
        expect(run.stderr).toContain('rhx init --roles +mechanic::');
        expect(run.stderr).not.toContain('focus one of');
      });

      then('the refusal matches its snapshot', () => {
        expect(asSnapshotSafe(run.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case9] a delta actor at mechanic::flow, and the ambient set moves (D1)', () => {
    const dir = genTempDir({ slug: 'enroll-focus-delta-rederive' });
    let stubPath: string;
    beforeAll(() => {
      setupEnrollFixture({ dir });
      stubPath = setupStubBrainPath({ dir });
      const enrolled = invokeRhachetCliBinary({
        args: ['enroll', 'claude', '--roles', '+mechanic::flow'],
        cwd: dir,
        env: { PATH: stubPath },
        logOnError: false,
      });
      if (enrolled.status !== 0)
        throw new ConstraintError('the focus fixture could not seed its enroll', {
          stderr: enrolled.stderr,
          hint: 'run `npm run build` so the linked fixture loads a fresh dist',
        });
    });

    when('[t0] `init --roles -driver` re-derives every delta actor', () => {
      const run = useThen('it succeeds', () =>
        invokeRhachetCliBinary({
          args: ['init', '--roles', '-driver'],
          cwd: dir,
          env: { PATH: stubPath },
        }),
      );

      then('it exits 0', () => {
        expect(run.status).toEqual(0);
      });

      then('the delta actor keeps its focus in actor.json', () => {
        const brainDir = getOneEnrolledBrainDir({ dir });
        const manifest = JSON.parse(
          readFileSync(join(brainDir, '..', '..', 'actor.json'), 'utf-8'),
        );
        expect(manifest.roles).toContain('mechanic::flow');
      });

      then('the delta actor boot still holds mechanic at flow alone', () => {
        const boot = readFileSync(
          join(getOneEnrolledBrainDir({ dir }), 'boot.md'),
          'utf-8',
        );
        expect(boot).toContain('<focus given="flow"');
        expect(boot).not.toContain('rule.require.hook-wrapper-pattern.md');
      });

      then('the init receipt and the re-derived focus line render as snapshotted', () => {
        const boot = readFileSync(
          join(getOneEnrolledBrainDir({ dir }), 'boot.md'),
          'utf-8',
        );
        expect({
          receipt: getOneFocusReceiptBlock({ output: run.stdout }),
          lineFocus: boot.split('\n').find((line) => line.startsWith('<focus given=')),
        }).toMatchSnapshot();
      });
    });
  });

  given('[case10] an exact set with whole co-roles beside a focus (case=1)', () => {
    const dir = genTempDir({ slug: 'enroll-focus-coroles' });
    let stubPath: string;
    beforeAll(() => {
      setupEnrollFixture({ dir });
      seedRoleAuthoredHooks({ dir });
      stubPath = setupStubBrainPath({ dir });
    });

    when('[t0] the whole set, then the same set with mechanic at flow', () => {
      const scene = useThen('both reach the stub brain', () => {
        const whole = invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--roles', 'architect,mechanic'],
          cwd: dir,
          env: { PATH: stubPath },
          logOnError: false,
        });
        const dirsWhole = getAllActorHashDirNames({ dir });
        const focused = invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--roles', 'architect,mechanic::flow'],
          cwd: dir,
          env: { PATH: stubPath },
          logOnError: false,
        });
        const dirsAll = getAllActorHashDirNames({ dir });
        const asBrainDir = (name: string): string =>
          join(dir, '.agent', '.actors', name, 'brain', '.claude');
        return {
          whole,
          focused,
          dirsAll,
          brainDirWhole: asBrainDir(dirsWhole[0]!),
          brainDirFocused: asBrainDir(
            dirsAll.find((name) => !dirsWhole.includes(name))!,
          ),
        };
      });

      then('both exit 0, as two actors — the focus mints a different hash', () => {
        expect(scene.whole.status).toEqual(0);
        expect(scene.focused.status).toEqual(0);
        expect(scene.dirsAll).toHaveLength(2);
      });

      then('the focused seat keeps the same hooks as the whole set', () => {
        const asHooks = (brainDir: string): unknown =>
          JSON.parse(readFileSync(join(brainDir, 'settings.of.repo.json'), 'utf-8'))
            .hooks;
        expect(asHooks(scene.brainDirFocused)).toEqual(
          asHooks(scene.brainDirWhole),
        );
        expect(JSON.stringify(asHooks(scene.brainDirFocused))).toContain(
          'repo=ehmpathy/role=mechanic',
        );
      });

      then('the co-roles boot whole — only mechanic carries a focus line', () => {
        const boot = readFileSync(
          join(scene.brainDirFocused, 'boot.md'),
          'utf-8',
        );
        expect(boot.split('<focus given').length - 1).toEqual(1);
        expect(boot).toContain('role=architect');
        expect(boot).not.toContain('role=driver/');
      });

      then('the focused seat receipt and its focus line render as snapshotted', () => {
        const boot = readFileSync(
          join(scene.brainDirFocused, 'boot.md'),
          'utf-8',
        );
        expect({
          receipt: getOneFocusReceiptBlock({ output: scene.focused.stderr }),
          lineFocus: boot.split('\n').find((line) => line.startsWith('<focus given=')),
        }).toMatchSnapshot();
      });
    });
  });

  given('[case11] a supervisor enrolls a focus and reads the handoff (machine channel)', () => {
    const dir = genTempDir({ slug: 'enroll-focus-json' });
    let stubPath: string;
    beforeAll(() => {
      setupEnrollFixture({ dir });
      seedRoleAuthoredHooks({ dir });
      stubPath = setupStubBrainPath({ dir });
    });

    when('[t0] `enroll claude --roles +mechanic::flow --output json`', () => {
      const run = useThen('it hands back the address', () =>
        invokeRhachetCliBinary({
          args: [
            'enroll',
            'claude',
            '--roles',
            '+mechanic::flow',
            '--output',
            'json',
          ],
          cwd: dir,
          env: { PATH: stubPath },
          timeoutMs: 60_000,
          logOnError: false,
        }),
      );

      then('it exits 0, and stdout is one parseable handoff', () => {
        expect(run.status).toEqual(0);
        const handoff = JSON.parse(run.stdout) as {
          outcome: string;
          serial: string;
        };
        expect(handoff.outcome).toEqual('baked');
        expect(handoff.serial).toMatch(/^[0-9a-f-]{36}$/);
      });

      then('the human receipt never reaches stdout, the channel the machine parses', () => {
        expect(run.stdout).not.toContain('🧢 focus');
      });

      then('the actor the handoff names boots at the focus and keeps every hook', () => {
        const brainDir = getOneEnrolledBrainDir({ dir });
        const boot = readFileSync(join(brainDir, 'boot.md'), 'utf-8');
        expect(boot).toContain('<focus given="flow"');
        expect(boot).not.toContain('rule.require.hook-wrapper-pattern.md');
        const settings = readFileSync(
          join(brainDir, 'settings.of.repo.json'),
          'utf-8',
        );
        expect(settings).toContain('repo=ehmpathy/role=mechanic');
      });

      then('the focused handoff renders as snapshotted', () => {
        expect(asSnapshotSafe(run.stdout)).toMatchSnapshot();
      });
    });
  });

  given('[case12] a focus enrolled as a detached host (`--async`)', () => {
    const dir = genTempDir({ slug: 'enroll-focus-async' });
    let stubPath: string;
    beforeAll(() => {
      setupEnrollFixture({ dir });
      seedRoleAuthoredHooks({ dir });
      stubPath = setupStubBrainPath({ dir });
    });

    when('[t0] `enroll claude --async --roles +mechanic::flow`', () => {
      const run = useThen('it terminates on its own', () =>
        invokeRhachetCliBinary({
          args: ['enroll', 'claude', '--async', '--roles', '+mechanic::flow'],
          cwd: dir,
          env: { PATH: stubPath },
          timeoutMs: 60_000,
          logOnError: false,
        }),
      );

      then('it exits 0', () => {
        expect(run.status).toEqual(0);
      });

      then('stderr names the focus — a detached seat narrates it as an attended one does', () => {
        expect(run.stderr).toContain('🧢 focus');
        expect(run.stderr).toContain('mechanic narrowed to ::flow');
      });

      then('the detached actor boots at the focus and keeps every hook', () => {
        const brainDir = getOneEnrolledBrainDir({ dir });
        const boot = readFileSync(join(brainDir, 'boot.md'), 'utf-8');
        expect(boot).toContain('<focus given="flow"');
        const settings = readFileSync(
          join(brainDir, 'settings.of.repo.json'),
          'utf-8',
        );
        expect(settings).toContain('repo=ehmpathy/role=mechanic');
        expect(settings).toContain('repo=bhrain/role=driver');
      });

      then('the detached receipt renders as snapshotted', () => {
        expect(getOneFocusReceiptBlock({ output: run.stderr })).toMatchSnapshot();
      });
    });
  });
});

/**
 * .what = writes the repo's ambient foci record, as `rhx init --roles +<role>::<subject>` would
 */
const setRepoFociRecord = (input: {
  dir: string;
  foci: Record<string, string[]>;
}): void => {
  const fociPath = join(
    input.dir,
    '.agent/.actors/actor.via.repo=ambient/roles.foci.json',
  );
  mkdirSync(join(fociPath, '..'), { recursive: true });
  writeFileSync(fociPath, `${JSON.stringify(input.foci, null, 2)}\n`);
};
