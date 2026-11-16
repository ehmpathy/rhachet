import { spawnSync } from 'child_process';
import { chmodSync, writeFileSync } from 'fs';
import { getPriority } from 'os';
import { basename, join } from 'path';
import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

import { asAcceptanceBoxHeader } from '../../../../blackbox/.test/infra/asAcceptanceBoxHeader';
import { asLeakReport } from '../../../../blackbox/.test/infra/asLeakReport';
import { asReclaimNote } from '../../../../blackbox/.test/infra/asReclaimNote';

/**
 * .what = the contract of `test.acceptance.credfree`, snapped: its help, each refusal, and the
 *   summary a live run prints, with and without an asked width
 * .why = a human meets this skill's words first; a typo must refuse with exit 2 and name the fix,
 *   and the summary header must echo the width the human asked for
 * .note = an integration test: it spawns bash, and two cases run one fast acceptance file live
 */

/** this file sits at `.agent/repo=.this/role=any/skills/`, so four hops reach the repo root */
const REPO_ROOT = join(__dirname, '..', '..', '..', '..');

/** the fastest acceptance file; it enrolls one stub brain and reads three priorities */
const SCOPE_FAST = 'acceptance\\.shares-the-box';

/**
 * .what = this process's env, less the vars the outer jest worker and a ci job set for themselves
 * .why = a human runs the skill from a shell, never from inside a jest worker; the nested jest
 *   reads an inherited `JEST_WORKER_ID` / `NODE_ENV` / `FORCE_COLOR` and exits 1 on a green run
 *   (measured 2026-11-16: inherited env, exit 1; these three stripped, exit 0). a human's shell
 *   carries no `GITHUB_ACTIONS` either, so the run header reads the shared box here and in ci alike
 */
const ENV_AS_SHELL = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) => !/^(JEST_|NODE_ENV$|FORCE_COLOR$|GITHUB_ACTIONS$)/.test(key),
  ),
);

/**
 * .what = run the skill with args, from the repo root, as a shell would
 */
const runSkill = (input: {
  args: string[];
  env?: Record<string, string | undefined>;
}): { status: number | null; signal: string | null; stdout: string; stderr: string } => {
  const result = spawnSync('bash', [join(__dirname, 'test.acceptance.credfree.sh'), ...input.args], {
    cwd: REPO_ROOT,
    env: { ...ENV_AS_SHELL, ...input.env },
    encoding: 'utf-8',
  });
  return {
    status: result.status,
    signal: result.signal,
    stdout: result.stdout,
    stderr: result.stderr,
  };
};

/**
 * .what = a live run's output with the host's own state masked
 * .why = the log stamp, the core count, the niceness the invoker started at, and the leftovers a
 *   box holds from older runs differ per host; each case asserts the niceness it expects, and the
 *   leftovers note has its own snaps (`asResidueNotice.test`), so it is dropped here
 */
const asCredfreeStdoutSafe = (input: { stdout: string }): string =>
  input.stdout
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}Z\.log/g, '<STAMP>.log')
    .replace(/workers = \d+ of \d+ cores/g, 'workers = <N> of <N> cores')
    .replace(/priority = nice \d+/g, 'priority = nice <N>')
    .replace(/( {3}│ {2}│\n)? {3}│ {2}│ {2}ℹ leftovers[^\n]*\n( {3}│ {2}│ {2}[^\n]+\n)*/g, '');

/**
 * .what = a dir that holds a stub `pnpm`, which prints a fixed log and exits with a fixed code
 * .why = a red run is slow and flaky to stage for real; the skill reads only the log jest wrote,
 *   so a stub that writes that log drives each summary branch the same way, every time
 */
const genStubPnpmDir = (input: { slug: string; log: string; exit: number }): string => {
  const dir = genTempDir({ slug: input.slug });
  writeFileSync(join(dir, 'run.log'), input.log);
  writeFileSync(join(dir, 'pnpm'), `#!/usr/bin/env bash\ncat '${join(dir, 'run.log')}'\nexit ${input.exit}\n`);
  chmodSync(join(dir, 'pnpm'), 0o755);
  return dir;
};

/**
 * .what = the header and the leak report a real run writes, from the formatters the run uses
 * .why = a stub log typed out by hand would stay green on stale text once either is reworded
 */
const LOG_HEADER = `${asAcceptanceBoxHeader({
  box: 'shared',
  maxWorkersDefault: 3,
  maxWorkers: 3,
  cores: 12,
  niceNow: 10,
}).trimEnd()}\n`;
const LOG_LEAK_REPORT = asLeakReport({
  runId: 'r7f3a91c2',
  leaked: [
    {
      pid: 4242,
      command: 'node /repo/src/.test/assets/stubBrainCli.cjs',
      cwd: '/tmp/test-fns/rhachet/.temp/r7f3a91c2.demo.a1b2c3d4',
    },
  ],
}).trimEnd();

describe('test.acceptance.credfree', () => {
  given('[case1] a human who asks how to use it', () => {
    // the canonical help, run once; the alias case compares against it
    const canon = useBeforeAll(async () => runSkill({ args: ['--help'] }));

    when('[t0] --help is passed', () => {
      then('it prints the what, the usage, and each option, and exits 0', () => {
        expect(canon.status).toEqual(0);
        expect(canon.stdout).toContain('.what =');
        expect(canon.stdout).toContain('usage:');
        expect(canon.stdout).toContain('--maxWorkers');
        expect(canon.stdout).toContain('🟡 it matches the ABSOLUTE path');
        expect(canon.stdout).toMatchSnapshot();
      });
    });

    when('[t1] the alias -h is passed', () => {
      const result = useThen('it runs', async () => runSkill({ args: ['-h'] }));
      then('it prints the same help as --help', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toEqual(canon.stdout);
      });
    });
  });

  given('[case2] a call it must refuse', () => {
    when('[t0] --scope is absent', () => {
      const result = useThen('it runs', async () => runSkill({ args: ['--resnap'] }));
      then('it refuses with exit 2 and shows a scope to pass', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('✋ ConstraintError: --scope is required');
        expect(result.stderr).toContain('e.g. rhx test.acceptance.credfree --scope');
        expect(result.stdout).toEqual('');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t1] an unknown option is passed', () => {
      const result = useThen('it runs', async () =>
        runSkill({ args: ['--scope', 'x', '--bogus'] }),
      );
      then('it refuses with exit 2, names the option, and points at help', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('unknown option: --bogus');
        expect(result.stderr).toContain('rhx test.acceptance.credfree --help');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    ['--scope', '--maxWorkers'].map((flag, index) =>
      when(`[t${index + 2}] ${flag} is passed with no value`, () => {
        const result = useThen('it runs', async () => runSkill({ args: [flag] }));
        then('it refuses with exit 2, names the flag, and shows a value to pass', () => {
          expect(result.status).toEqual(2);
          expect(result.stderr).toContain(`✋ ConstraintError: absent value for ${flag}`);
          expect(result.stderr).toContain(`e.g. ${flag} `);
          expect(result.stderr).toMatchSnapshot();
        });
      }),
    );
  });

  given('[case3] a live run of one fast acceptance file', () => {
    // two real suite runs, each a build check plus one acceptance file
    jest.setTimeout(300_000);

    when('[t0] no width is asked', () => {
      const result = useThen('it runs', async () => runSkill({ args: ['--scope', SCOPE_FAST] }));
      then('it exits 0, echoes only the scope, and prints the run header, the totals, and the log', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout.split('\n')[0]).toEqual(
          `🧮 test.acceptance.credfree --scope '${SCOPE_FAST}'`,
        );
        expect(result.stdout).toContain('├─ notes');
        expect(result.stdout).toContain('├─ result = green, exit 0');
        expect(result.stdout).not.toContain('result = red');
        expect(result.stdout).toContain('│  │  ℹ acceptance width');
        expect(result.stdout).toContain('box = shared');
        expect(result.stdout).toMatch(/workers = \d+ of \d+ cores \(shared-box default\)/);
        // the run renices to 10, or keeps a deeper nice the invoker already held
        expect(result.stdout).toContain(`priority = nice ${Math.max(10, getPriority())}`);
        expect(result.stdout).toContain('Tests:');
        expect(result.stdout).toContain('.log/role=any/skill=test.acceptance.credfree/');
        expect(asCredfreeStdoutSafe({ stdout: result.stdout })).toMatchSnapshot();
      });
    });

    // the full width differs from the shared-box default on any box of two or more cores, so the
    //   run header reads it as asked wherever this runs
    when('[t1] a width is asked', () => {
      const result = useThen('it runs', async () =>
        runSkill({ args: ['--scope', SCOPE_FAST, '--maxWorkers', '100%'] }),
      );
      then('it exits 0, echoes the width it was asked, and the run header reads it as asked', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain(
          `🧮 test.acceptance.credfree --scope '${SCOPE_FAST}' --maxWorkers 100%\n`,
        );
        expect(result.stdout).toMatch(/workers = \d+ of \d+ cores \(asked\)/);
        expect(result.stdout).toContain('drop --maxWorkers for the shared-box default');
        expect(asCredfreeStdoutSafe({ stdout: result.stdout })).toMatchSnapshot();
      });
    });

    when('[t2] a width and a resnap are asked', () => {
      // the file pins no snapshot, so a resnap here writes none
      const result = useThen('it runs', async () =>
        runSkill({ args: ['--scope', SCOPE_FAST, '--maxWorkers', '100%', '--resnap'] }),
      );
      then('it exits 0 and echoes both, in the order the header reads them', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain(
          `🧮 test.acceptance.credfree --scope '${SCOPE_FAST}' --maxWorkers 100% --resnap\n`,
        );
        expect(asCredfreeStdoutSafe({ stdout: result.stdout })).toMatchSnapshot();
      });
    });

    // a github runner sets GITHUB_ACTIONS; the real globalSetup must then read the ci box, take
    //   the ci width, and leave the run at normal priority
    when('[t3] the run is on a github runner', () => {
      const result = useThen('it runs', async () =>
        runSkill({ args: ['--scope', SCOPE_FAST], env: { GITHUB_ACTIONS: 'true' } }),
      );
      then('it exits 0, and the run header reads the ci box at ci width and normal priority', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('box = ci');
        expect(result.stdout).toMatch(/workers = \d+ of \d+ cores \(ci default\)/);

        // no renice on ci: the run keeps the niceness it inherited from this process, whatever
        //   the host started it at (0 on a runner; a local test tier may start higher)
        expect(result.stdout).toContain(`priority = nice ${getPriority()}`);
        expect(asCredfreeStdoutSafe({ stdout: result.stdout })).toMatchSnapshot();
      });
    });
  });

  given('[case4] a live run whose scope matches no suite', () => {
    // a real build check plus a jest run that finds no file
    jest.setTimeout(300_000);

    when('[t0] the scope is a typo', () => {
      const result = useThen('it runs', async () =>
        runSkill({ args: ['--scope', 'zzz-no-such-suite-xyz'] }),
      );
      then('it refuses with exit 2, names the scope, and never reads as a green run', () => {
        expect(result.signal).toBeNull();
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('✋ ConstraintError: no acceptance suite matched the scope');
        expect(result.stderr).toContain("scope = 'zzz-no-such-suite-xyz'");
        expect(result.stdout).toEqual('');
        expect(asCredfreeStdoutSafe({ stdout: result.stderr })).toMatchSnapshot();
      });
    });
  });

  given('[case5] a red run, its log written by a stub pnpm', () => {
    when('[t0] the run leaked a process, so it is red with no failed test', () => {
      const result = useThen('it runs', async () => {
        const dir = genStubPnpmDir({
          slug: 'credfree-stub-leak',
          exit: 1,
          log: [
            LOG_HEADER,
            'PASS blackbox/cli/demo.acceptance.test.ts',
            '',
            LOG_LEAK_REPORT,
            '',
            'Test Suites: 1 passed, 1 total',
            'Tests:       3 passed, 3 total',
            '',
          ].join('\n'),
        });
        return runSkill({ args: ['--scope', 'demo'], env: { PATH: `${dir}:${process.env.PATH}` } });
      });
      then('it exits 1, reads red above the green totals, and carries the leak report onto stdout', () => {
        expect(result.status).toEqual(1);
        expect(result.stdout).toContain('├─ result = red, exit 1');
        expect(result.stdout).not.toContain('├─ failed');
        expect(result.stdout).toContain('│  │  ✋ ConstraintError: 1 process outlived this acceptance run');
        expect(result.stdout).toContain('│  │     │  └─ pid 4242 = node /repo/src/.test/assets/stubBrainCli.cjs');
        expect(result.stdout).toContain('│  │  ℹ acceptance width');
        expect(asCredfreeStdoutSafe({ stdout: result.stdout })).toMatchSnapshot();
      });
    });

    when('[t1] a test failed', () => {
      const result = useThen('it runs', async () => {
        const dir = genStubPnpmDir({
          slug: 'credfree-stub-fail',
          exit: 1,
          log: [
            LOG_HEADER,
            'FAIL blackbox/cli/demo.acceptance.test.ts',
            '  demo',
            '    ✓ then: it greets',
            '    ✕ then: it waves',
            '',
            'Test Suites: 1 failed, 1 total',
            'Tests:       1 failed, 1 passed, 2 total',
            '',
          ].join('\n'),
        });
        return runSkill({ args: ['--scope', 'demo'], env: { PATH: `${dir}:${process.env.PATH}` } });
      });
      then('it exits 1, names the failed test, and keeps the header and totals', () => {
        expect(result.status).toEqual(1);
        expect(result.stdout).toContain('├─ failed');
        expect(result.stdout).toContain('└─ ✕ then: it waves');
        expect(result.stdout).toContain('├─ result = red, exit 1');
        expect(result.stdout).toContain('Tests:       1 failed, 1 passed, 2 total');
        expect(result.stdout).not.toContain('no summary from jest');
        expect(asCredfreeStdoutSafe({ stdout: result.stdout })).toMatchSnapshot();
      });
    });

    when('[t2] the stale build failed, so jest never ran and wrote no summary', () => {
      const result = useThen('it runs', async () => {
        const dir = genStubPnpmDir({
          slug: 'credfree-stub-build',
          exit: 2,
          log: [
            '> rhachet@0.0.0 build:ifstale',
            '> tsc -p ./tsconfig.build.json',
            '',
            "src/demo.ts(3,7): error TS2322: Type 'string' is not assignable to type 'number'.",
            '',
          ].join('\n'),
        });
        return runSkill({ args: ['--scope', 'demo'], env: { PATH: `${dir}:${process.env.PATH}` } });
      });
      then('it passes the exit through, reads red, and shows the log tail as the cause', () => {
        expect(result.status).toEqual(2);
        expect(result.stdout).toContain('├─ result = red, exit 2');
        expect(result.stdout).toContain('├─ no summary from jest; the log ends with');
        expect(result.stdout).toContain('error TS2322');
        expect(result.stdout).not.toContain('├─ totals');
        expect(asCredfreeStdoutSafe({ stdout: result.stdout })).toMatchSnapshot();
      });
    });
  });

  given('[case6] a green run, its log written by a stub pnpm', () => {
    // jest writes its totals to the same stream right below the last note, with no blank line
    when('[t0] the run reclaimed a daemon, and the jest totals follow the note at once', () => {
      const result = useThen('it runs', async () => {
        const dir = genStubPnpmDir({
          slug: 'credfree-stub-reclaim',
          exit: 0,
          log: [
            LOG_HEADER,
            'PASS blackbox/cli/demo.acceptance.test.ts',
            '',
            asReclaimNote({ reclaimed: [{ pid: 4243, command: 'node keyrack daemon' }] }).trimEnd(),
            'Test Suites: 1 passed, 1 total',
            'Tests:       3 passed, 3 total',
            'Time:        1.2 s',
            '',
          ].join('\n'),
        });
        return runSkill({ args: ['--scope', 'demo'], env: { PATH: `${dir}:${process.env.PATH}` } });
      });
      then('it exits 0, keeps the note under notes, and the totals only under totals', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('├─ result = green, exit 0');
        expect(result.stdout).toContain('│  │  ℹ reclaimed 1 keyrack daemon');
        expect(result.stdout).not.toContain('│  │  Test Suites:');
        expect(result.stdout).not.toContain('│  │  Time:');
        expect(result.stdout).toContain('│  ├─ Test Suites: 1 passed, 1 total');
        expect(asCredfreeStdoutSafe({ stdout: result.stdout })).toMatchSnapshot();
      });
    });
  });

  given('[case7] a --scope that matches the repo root path', () => {
    when('[t0] the scope is the repo dir name itself', () => {
      // the repo dir name matches the root on any host, as a branch slug in a worktree name does
      const result = useThen('it runs', async () =>
        runSkill({ args: ['--scope', basename(REPO_ROOT)] }),
      );
      then('it refuses with exit 2, before any build or jest run', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('--scope matches the repo root, so it would run every suite');
        expect(result.stdout).toEqual('');
      });
    });

    when('[t1] the scope is a bare dot', () => {
      const result = useThen('it runs', async () => runSkill({ args: ['--scope', '.'] }));
      then('it refuses with exit 2, and names the anchor fix', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('anchor it on the file name');
      });
    });
  });
});