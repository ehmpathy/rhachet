import { spawnSync } from 'child_process';
import { copyFileSync, mkdirSync, readFileSync } from 'fs';
import { MalfunctionError } from 'helpful-errors';
import { join } from 'path';
import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

import { asMeasureArgs } from './measure.acceptance.share/asMeasureArgs';
import { asMeasureErrorRender } from './measure.acceptance.share/asMeasureErrorRender';
import { asMeasureRecordName } from './measure.acceptance.share/asMeasureRecordName';
import { asMeasureSuiteLogName } from './measure.acceptance.share/asMeasureSuiteLogName';
import { asMeasureTree } from './measure.acceptance.share/asMeasureTree';

/**
 * .what = the help and refusal paths of `measure.acceptance.share`, snapped
 * .why = a typo or an absent `--scope` is what a human meets first. each must refuse with exit 2
 *   and name the fix, and the snapshot lets a reviewer read the words
 *
 * .note = [case8] runs one live measure over the fastest acceptance file, so the whole path a
 *   human walks (progress, suite, peer, record, tree) is proven here; the full F2 measure over
 *   the wide scope stays a byhand step whose record the verification stone cites
 * .note = an integration test: it spawns bash
 */

/** this file sits at `.agent/repo=.this/role=any/skills/`, so four hops reach the repo root */
const REPO_ROOT = join(__dirname, '..', '..', '..', '..');

/**
 * .what = this process's env, less the vars the outer jest worker set for itself
 * .why = a human runs a measure from a shell; a nested jest that inherits `JEST_WORKER_ID` /
 *   `NODE_ENV` / `FORCE_COLOR` from this worker can exit 1 on a green run
 */
const ENV_AS_SHELL = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !/^(JEST_|NODE_ENV$|FORCE_COLOR$)/.test(key)),
);

/**
 * .what = a live measure's stdout with every box-bound value masked
 * .why = cores, load, psi, wall times, the peer verdict (a figure, or n/a when the suite ends
 *   first) and the record stamp all vary per box and per run; the words around them do not
 */
const asMeasureStdoutSafe = (input: { stdout: string }): string =>
  input.stdout
    .replace(/peer = [^\n]+/g, 'peer = <PEER>')
    // a busy box adds a consequence line below quiet; the mask folds it in, so either box snaps alike
    .replace(/quiet = [^\n]+(\n {3}│ {2}└─ [^\n]+)?/g, 'quiet = <QUIET>')
    .replace(/median of \d+/g, 'median of <N>')
    .replace(/\d{8}T\d{9}Z\.json/g, '<STAMP>.json')
    .replace(/psi (= )?(\d+%|n\/a)/g, 'psi $1<PSI>')
    .replace(/\d+(\.\d+)?(?=s\b|%|\b cores| \(median)/g, '<N>')
    .replace(/load (= )?\d+(\.\d+)?/g, 'load $1<N>');

/**
 * .what = run the skill with args, from the repo root
 */
const runSkill = (input: {
  args: string[];
}): { status: number | null; stdout: string; stderr: string } => {
  const result = spawnSync(
    'bash',
    [join(__dirname, 'measure.acceptance.share.sh'), ...input.args],
    { cwd: REPO_ROOT, encoding: 'utf-8' },
  );
  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
};

describe('measure.acceptance.share', () => {
  given('[case1] a human who asks how to use it', () => {
    // the canonical help, run once; each alias case compares against it
    const canon = useBeforeAll(async () => runSkill({ args: ['--help'] }));

    when('[t0] --help is passed', () => {
      then('it prints the header, the usage, and the options, and exits 0', () => {
        expect(canon.status).toEqual(0);
        expect(canon.stdout).toContain('.what =');
        expect(canon.stdout).toContain('usage:');
        expect(canon.stdout).toContain('--scope');
        expect(canon.stdout).toMatchSnapshot();
      });
    });

    ['help', '-h'].map((alias, index) =>
      when(`[t${index + 1}] the alias ${alias} is passed`, () => {
        const result = useThen('it runs', async () => runSkill({ args: [alias] }));
        then('it prints the same help as --help, and exits 0', () => {
          expect(result.status).toEqual(0);
          expect(result.stdout).toEqual(canon.stdout);
        });
      }),
    );
  });

  given('[case2] a call it must refuse', () => {
    when('[t0] --scope is absent', () => {
      const result = useThen('it runs', async () => runSkill({ args: ['--widths', '25%'] }));
      then('it refuses with exit 2 and names the flag and an example', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('✋ ConstraintError: absent required arg: --scope');
        expect(result.stderr).toContain('--scope blackbox/cli/');
        expect(result.stdout).toEqual('');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t1] an unknown arg is passed', () => {
      const result = useThen('it runs', async () =>
        runSkill({ args: ['--scope', 'x.ts', '--bogus', 'y'] }),
      );
      then('it refuses with exit 2, names the arg, and points at help', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('unknown argument: --bogus');
        expect(result.stderr).toContain('rhx measure.acceptance.share help');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t2] a flag is passed with no value', () => {
      const result = useThen('it runs', async () => runSkill({ args: ['--scope'] }));
      then('it refuses with exit 2 and names the flag', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('absent value for --scope');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    ['--widths', '--peer', '--peer-runs'].map((flag, index) =>
      when(`[t2.${index + 1}] ${flag} is passed with no value`, () => {
        const result = useThen('it runs', async () =>
          runSkill({ args: ['--scope', 'x.ts', flag] }),
        );
        then('it refuses with exit 2, names the flag, and points at help', () => {
          expect(result.status).toEqual(2);
          expect(result.stderr).toContain(`absent value for ${flag}`);
          expect(result.stderr).toContain('rhx measure.acceptance.share help');
          expect(result.stderr).toMatchSnapshot();
        });
      }),
    );

    when('[t3] --peer-runs is not a positive integer', () => {
      const result = useThen('it runs', async () =>
        runSkill({ args: ['--scope', 'x.ts', '--peer-runs', 'three'] }),
      );
      then('it refuses with exit 2, names the value, and shows a valid one', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('--peer-runs must be a positive integer, got: three');
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case3] a measure on a 12-core box at two widths', () => {
    when('[t0] the tree is rendered', () => {
      const tree = asMeasureTree({
        baseline: { cpuPsiSomeAvg10: 2, load1: 1.4, cores: 12 },
        peerSoloMs: 2000,
        peerSoloRuns: 3,
        rows: [
          {
            width: '25%',
            peerBesideMs: 2300,
            peerRunsBeside: 3,
            peak: { cpuPsiSomeAvg10: 31, load1: 5.2, cores: 12 },
            suiteWallMs: 94_000,
            suiteExitCode: 0,
            suiteLogPath: '.log/role=any/skill=measure.acceptance.share/20000101T000000000Z.width=25pct.suite.log',
          },
          {
            width: '50%',
            peerBesideMs: 3100,
            peerRunsBeside: 3,
            peak: { cpuPsiSomeAvg10: 58, load1: 9.8, cores: 12 },
            suiteWallMs: 61_000,
            suiteExitCode: 0,
            suiteLogPath: '.log/role=any/skill=measure.acceptance.share/20000101T000000000Z.width=50pct.suite.log',
          },
        ],
        recordPath: '.log/role=any/skill=measure.acceptance.share/20000101T000000000Z.json',
      });
      then('it reads the box as quiet, and each width with its slowdown and peak', () => {
        expect(tree).toContain('quiet = yes');
        expect(tree).toContain('├─ width 25%');
        expect(tree).toContain('slowdown 15%');
        expect(tree).toContain('└─ width 50%');
        expect(tree).toContain('slowdown 55%');
        expect(tree).not.toContain('read its log');
        expect(tree).toMatchSnapshot();
      });
    });

    when('[t1] the suite at one width went red', () => {
      const tree = asMeasureTree({
        baseline: { cpuPsiSomeAvg10: 2, load1: 1.4, cores: 12 },
        peerSoloMs: 2000,
        peerSoloRuns: 3,
        rows: [
          {
            width: '25%',
            peerBesideMs: 2300,
            peerRunsBeside: 3,
            peak: { cpuPsiSomeAvg10: 31, load1: 5.2, cores: 12 },
            suiteWallMs: 94_000,
            suiteExitCode: 1,
            suiteLogPath: '.log/role=any/skill=measure.acceptance.share/20000101T000000002Z.width=25pct.suite.log',
          },
        ],
        recordPath: '.log/role=any/skill=measure.acceptance.share/20000101T000000002Z.json',
      });
      then('the red width names its suite log, where the cause is', () => {
        expect(tree).toContain('suite = 94s, exit 1');
        expect(tree).toContain(
          '└─ red, so read its log = .log/role=any/skill=measure.acceptance.share/20000101T000000002Z.width=25pct.suite.log',
        );
        expect(tree).toMatchSnapshot();
      });
    });
  });

  given('[case5] a measure on a busy box with no psi, where one width ran too short', () => {
    when('[t0] the tree is rendered', () => {
      const tree = asMeasureTree({
        baseline: { cpuPsiSomeAvg10: null, load1: 6.2, cores: 8 },
        peerSoloMs: 2000,
        peerSoloRuns: 3,
        rows: [
          {
            width: '25%',
            peerBesideMs: null,
            peerRunsBeside: 0,
            peak: { cpuPsiSomeAvg10: null, load1: 7.9, cores: 8 },
            suiteWallMs: 12_000,
            suiteExitCode: 0,
            suiteLogPath: '.log/role=any/skill=measure.acceptance.share/20000101T000000001Z.width=25pct.suite.log',
          },
        ],
        recordPath: '.log/role=any/skill=measure.acceptance.share/20000101T000000001Z.json',
      });
      then('it reads quiet = no, psi as n/a, and the short width as n/a with the fix', () => {
        expect(tree).toContain('quiet = no');
        expect(tree).toContain('numbers from a busy box are no measure of the bound; re-run on a quiet box');
        expect(tree).toContain('peer solo = 2.00s (median of 3)');
        expect(tree).toContain('baseline cpu psi n/a');
        expect(tree).toContain('peer = n/a, the suite ended before a peer run finished');
        expect(tree).not.toContain('NaN');
        expect(tree).not.toContain('-100%');
        expect(tree).toMatchSnapshot();
      });
    });
  });

  given('[case6] the moment a measure is recorded', () => {
    when('[t0] its record is named', () => {
      then('the name sorts by time and carries no dash clock', () => {
        expect(asMeasureRecordName({ at: new Date('2026-11-16T01:01:20.132Z') })).toEqual(
          '20261116T010120132Z.json',
        );
      });
    });

    when('[t1] a width suite log is named', () => {
      then('it shares the record stamp, names the width, and spells % as pct', () => {
        expect(
          asMeasureSuiteLogName({ at: new Date('2026-11-16T01:01:20.132Z'), width: '25%' }),
        ).toEqual('20261116T010120132Z.width=25pct.suite.log');
      });
    });
  });

  given('[case7] a measure that fails', () => {
    when('[t0] the peer command fails, a system-fix error with a hint', () => {
      const rendered = asMeasureErrorRender({
        error: new MalfunctionError('the peer command failed', {
          code: 1,
          hint: 'run the --peer command alone in a shell; it must exit 0 within the cap',
        }),
      });
      then('it reads 💥 MalfunctionError once, names the hint, and exits 1', () => {
        expect(rendered.exitCode).toEqual(1);
        expect(rendered.stderr).toContain('💥 MalfunctionError: the peer command failed');
        expect(rendered.stderr.match(/MalfunctionError/g)).toHaveLength(1);
        expect(rendered.stderr).toContain('└─ run the --peer command alone');
        expect(rendered.stderr).toMatchSnapshot();
      });
    });

    when('[t1] the scope matches no acceptance file, live', () => {
      const result = useThen('it runs', async () => {
        const ran = spawnSync(
          'bash',
          [join(__dirname, 'measure.acceptance.share.sh'), '--scope', 'zzz-no-such-suite-xyz'],
          { cwd: REPO_ROOT, env: ENV_AS_SHELL, encoding: 'utf-8' },
        );
        return { status: ran.status, stdout: ran.stdout, stderr: ran.stderr };
      });
      then('it refuses with ✋ ConstraintError and exit 2, before any measure begins', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('✋ ConstraintError: no acceptance file matched the scope');
        expect(result.stderr.match(/ConstraintError/g)).toHaveLength(1);
        expect(result.stdout).not.toContain('at work');
        expect(result.stderr).toMatchSnapshot();
      });
    });

    when('[t2] a plain error with no hint reaches the render', () => {
      const rendered = asMeasureErrorRender({ error: new Error('spawn npx ENOENT') });
      then('it names the class it carries, adds no hint branch, and exits 1', () => {
        expect(rendered.exitCode).toEqual(1);
        expect(rendered.stderr).toEqual('💥 Error: spawn npx ENOENT\n');
      });
    });

    when('[t3] the repo has no tsx installed', () => {
      const result = useThen('it runs', async () => {
        // a copy four dirs deep in a temp root, where no node_modules sits
        const root = genTempDir({ slug: 'measure-share-no-tsx' });
        const skillDir = join(root, 'a', 'b', 'c', 'd');
        mkdirSync(skillDir, { recursive: true });
        copyFileSync(join(__dirname, 'measure.acceptance.share.sh'), join(skillDir, 'skill.sh'));
        const ran = spawnSync('bash', [join(skillDir, 'skill.sh'), '--scope', 'x.ts'], {
          cwd: root,
          encoding: 'utf-8',
        });
        return { status: ran.status, stderr: ran.stderr };
      });
      then('it fails with exit 1 and names the install', () => {
        expect(result.status).toEqual(1);
        expect(result.stderr).toContain('💥 MalfunctionError: tsx is not installed in this repo');
        expect(result.stderr).toContain('pnpm install');
        expect(result.stderr).toMatchSnapshot();
      });
    });
  });

  given('[case8] a live measure of one fast acceptance file, at one width, beside a light peer', () => {
    // one real suite run, from spawn to record; minutes on a loaded box
    jest.setTimeout(300_000);

    when('[t0] the skill runs end to end', () => {
      const result = useThen('it runs', async () => {
        const ran = spawnSync(
          'bash',
          [
            join(__dirname, 'measure.acceptance.share.sh'),
            '--scope',
            'blackbox/cli/acceptance.shares-the-box.acceptance.test.ts',
            '--widths',
            '25%',
            '--peer-runs',
            '1',
            '--peer',
            'node -e 0',
          ],
          { cwd: REPO_ROOT, env: ENV_AS_SHELL, encoding: 'utf-8' },
        );
        const recordPathRel = /record = (\S+\.json)/.exec(ran.stdout)?.[1] ?? null;
        const record = recordPathRel
          ? (JSON.parse(readFileSync(join(REPO_ROOT, recordPathRel), 'utf-8')) as {
              rows: { width: string; suiteExitCode: number | null; suiteLogPath: string }[];
            })
          : null;
        return { status: ran.status, stdout: ran.stdout, stderr: ran.stderr, record };
      });

      /**
       * .what = the last lines of the suite log, where a red suite's cause is
       * .why = this run's suite is nested two processes down; its log is the only place a red
       *   names why, so the assertion below carries it into the failure a reader meets
       */
      const getSuiteLogTail = (): string | null => {
        const logPathRel = result.record?.rows[0]?.suiteLogPath ?? null;
        if (!logPathRel) return null;
        return readFileSync(join(REPO_ROOT, logPathRel), 'utf-8').split('\n').slice(-60).join('\n');
      };
      then('it exits 0, with a progress line per phase', () => {
        expect(result.stderr).toEqual('');
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('🧮 measure.acceptance.share, at work');
        expect(result.stdout).toContain('├─ the peer alone, 1 run');
        expect(result.stdout).toContain('├─ width 25%, the suite and the peer at work');
        expect(result.stdout).toContain('└─ measured');
      });
      then('it writes a record with one row, where the suite passed', () => {
        expect(result.record?.rows).toHaveLength(1);
        expect(result.record?.rows[0]?.width).toEqual('25%');

        // on a red, the diff shows the suite log's tail beside the exit code
        const suiteExitCode = result.record?.rows[0]?.suiteExitCode;
        expect({ suiteExitCode, logTailOnRed: suiteExitCode === 0 ? null : getSuiteLogTail() }).toEqual(
          { suiteExitCode: 0, logTailOnRed: null },
        );
      });
      then('the suite log holds the run, from its width header on', () => {
        expect(getSuiteLogTail()).not.toBeNull();
        expect(
          readFileSync(join(REPO_ROOT, result.record?.rows[0]?.suiteLogPath ?? ''), 'utf-8'),
        ).toContain('ℹ acceptance width');
      });
      then('the whole stdout, its box-bound values masked, reads as a human meets it', () => {
        expect(asMeasureStdoutSafe({ stdout: result.stdout })).toMatchSnapshot();
      });
    });
  });

  given('[case4] the args the shell half passed', () => {
    when('[t0] scopes repeat and the widths and peer runs are named', () => {
      then('every scope is kept, and the named values are read', () => {
        const args = asMeasureArgs({
          argv: ['--scope', 'a.ts', '--widths', '10%,90%', '--scope', 'b.ts', '--peer-runs', '5'],
        });
        expect(args.scope).toEqual(['a.ts', 'b.ts']);
        expect(args.widths).toEqual(['10%', '90%']);
        expect(args.peerRuns).toEqual(5);
      });
    });

    when('[t1] only a scope is named', () => {
      then('the defaults fill the rest', () => {
        const args = asMeasureArgs({ argv: ['--scope', 'a.ts'] });
        expect(args.widths).toEqual(['25%', '50%']);
        expect(args.peerRuns).toEqual(3);
        expect(args.peer).toContain('sha256');
      });
    });
  });
});
