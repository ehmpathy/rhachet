import { spawnSync } from 'child_process';
import { chmodSync, realpathSync, writeFileSync } from 'fs';
import { join } from 'path';
import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

/**
 * .what = the help, refusal, and report paths of the anthropic.ci.callers skill, snapped
 * .why = a measurement a caller table cites must refuse a bad input loud, with the fix,
 *   never count from a malformed date or scan size, and its report must hold its shape
 *
 * .note = the report paths run against a `gh` stub on PATH, so the render and the counts
 *   are fixed. the real-gh read is a byhand measurement (its counts move with every push,
 *   and it needs a gh login across six repos); the yield records each such run
 * .note = an integration test: it spawns bash
 */

/**
 * .what = replace each iso timestamp in a render with a fixed placeholder
 * .why = the repo forbids timestamps in snapshots; the real date is asserted explicitly instead
 */
const asTimestampsMasked = (text: string): string =>
  text.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/g, '<iso-time>');

/** this file sits at `.agent/repo=.this/role=any/skills/`, so four hops reach the repo root */
const REPO_ROOT = join(__dirname, '..', '..', '..', '..');

/**
 * .what = a `gh` stub that answers `run list` and `run view` from fixed data
 * .why = the report's shape and counts must be snapped, with no network
 *
 * .note = run 103's log read fails, to exercise the unread path; repo `gone` fails its list;
 *   repo `crowded` returns exactly the 1000-run cap; repo `calm` holds only success runs
 */
const GH_STUB = `#!/usr/bin/env bash
set -euo pipefail
repo=""
prev=""
for arg in "$@"; do
  case "$prev" in --repo) repo="$arg" ;; esac
  prev="$arg"
done
if [[ "$1 $2" == "run list" ]]; then
  [[ "$repo" == "ehmpathy/gone" ]] && { echo "could not resolve to a Repository" >&2; exit 1; }
  [[ "$repo" == "ehmpathy/crowded" ]] && { jq -cn '[range(1000) | {databaseId: (1000 + .), conclusion: "success", createdAt: "2026-10-20T02:00:00Z"}]'; exit 0; }
  [[ "$repo" == "ehmpathy/calm" ]] && { echo '[{"databaseId":201,"conclusion":"success","createdAt":"2026-10-30T02:00:00Z"},{"databaseId":202,"conclusion":"success","createdAt":"2026-10-29T02:00:00Z"}]'; exit 0; }
  echo '[{"databaseId":101,"conclusion":"failure","createdAt":"2026-10-30T02:00:00Z"},{"databaseId":102,"conclusion":"failure","createdAt":"2026-10-29T02:00:00Z"},{"databaseId":103,"conclusion":"failure","createdAt":"2026-10-28T02:00:00Z"},{"databaseId":104,"conclusion":"success","createdAt":"2026-10-27T02:00:00Z"},{"databaseId":105,"conclusion":"cancelled","createdAt":"2026-10-26T02:00:00Z"}]'
  exit 0
fi
if [[ "$1 $2" == "run view" ]]; then
  case "$3" in
    101) echo "API Usage Billing"; echo "Credit balance is too low" ;;
    102) echo "API Usage Billing" ;;
    103) echo "HTTP 410: logs expired" >&2; exit 1 ;;
  esac
  exit 0
fi
echo "gh stub: unexpected call $*" >&2
exit 1
`;

/**
 * .what = run the skill with args, from the repo root
 * .why = the same cwd it has under `rhx`
 */
const runSkill = (input: {
  args: string[];
  ghStubDir?: string;
}): { status: number | null; stdout: string; stderr: string } => {
  const result = spawnSync(
    'bash',
    [join(__dirname, 'anthropic.ci.callers.sh'), ...input.args],
    {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      env: input.ghStubDir
        ? { ...process.env, PATH: `${input.ghStubDir}:${process.env.PATH}` }
        : process.env,
    },
  );
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
};

describe('anthropic.ci.callers', () => {
  given('[case1] a human asks for help', () => {
    when('[t0] `--help`', () => {
      const run = useThen('it runs', () => runSkill({ args: ['--help'] }));

      then('it exits 0', () => {
        expect(run.status).toEqual(0);
      });

      then('it names the usage', () => {
        expect(run.stdout).toContain('rhx anthropic.ci.callers --since 2026-10-18');
        expect(asTimestampsMasked(run.stdout)).toMatchSnapshot();
      });

      then('it names the full guarantee', () => {
        expect(run.stdout).toContain('counted apart, never as a');
      });
    });
  });

  given('[case2] no --since', () => {
    when('[t0] the skill runs bare', () => {
      const run = useThen('it runs', () => runSkill({ args: [] }));

      then('it exits 2', () => {
        expect(run.status).toEqual(2);
      });

      then('it refuses before it reads a run', () => {
        expect(run.stdout).toEqual('');
      });

      then('it names the fix', () => {
        expect(run.stderr).toContain('✋ ConstraintError: --since is required, since it bounds the runs read');
        expect(asTimestampsMasked(run.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case3] a --scan that is not a whole number', () => {
    when('[t0] `--scan five`', () => {
      const run = useThen('it runs', () =>
        runSkill({ args: ['--since', '2026-10-18', '--scan', 'five'] }),
      );

      then('it exits 2', () => {
        expect(run.status).toEqual(2);
      });

      then('it refuses, and names the fix', () => {
        expect(run.stderr).toContain('--scan must be a whole number');
        expect(asTimestampsMasked(run.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case4] an unknown flag', () => {
    when('[t0] `--sincee 2026-10-18`', () => {
      const run = useThen('it runs', () =>
        runSkill({ args: ['--sincee', '2026-10-18'] }),
      );

      then('it exits 2', () => {
        expect(run.status).toEqual(2);
      });

      then('it refuses the flag, never drops it, and names the help', () => {
        expect(run.stderr).toContain("unknown arg '--sincee'");
        expect(asTimestampsMasked(run.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case5] a flag with no value', () => {
    when('[t0] `--since` ends the args', () => {
      const run = useThen('it runs', () => runSkill({ args: ['--since'] }));

      then('it exits 2', () => {
        expect(run.status).toEqual(2);
      });

      then('it names the flag that lacks a value, and the help', () => {
        expect(run.stderr).toContain('--since needs a value');
        expect(asTimestampsMasked(run.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case6] a gh that answers from fixed runs', () => {
    const stub = useBeforeAll(async () => {
      const dir = realpathSync(genTempDir({ slug: 'anthropic-ci-callers-gh' }));
      writeFileSync(join(dir, 'gh'), GH_STUB);
      chmodSync(join(dir, 'gh'), 0o755);
      return { dir };
    });

    when('[t0] two repos are counted, with one log that cannot be read', () => {
      const run = useThen('it runs', () =>
        runSkill({
          args: ['--since', '2026-10-18', '--repos', 'alpha,beta'],
          ghStubDir: stub.dir,
        }),
      );

      then('it exits 0', () => {
        expect(run.status).toEqual(0);
      });

      then('it counts the runs per repo, by conclusion', () => {
        expect(run.stdout).toContain('5 runs (1 success · 3 failure · 1 other)');
        expect(asTimestampsMasked(run.stdout)).toMatchSnapshot();
      });

      then('it counts the failed runs it scanned', () => {
        expect(run.stdout).toContain('2 newest failed runs scanned');
      });

      then('it counts the api-mode banner marker', () => {
        expect(run.stdout).toContain('2 of the scanned runs show the api-mode banner');
      });

      then('it counts the credit error marker, with the oldest such run', () => {
        expect(run.stdout).toContain('1 of the scanned runs shows the credit error (oldest such run 2026-10-30T02:00:00Z)');
      });

      then('it counts the unread log apart', () => {
        expect(run.stdout).toContain('1 failed run whose log could not be read, so its markers are unseen');
      });

      then('it names the unread cause', () => {
        expect(run.stdout).toContain('run 103, HTTP 410');
      });
    });

    when('[t1] `--scan 1` bounds the logs read', () => {
      const run = useThen('it runs', () =>
        runSkill({
          args: ['--since', '2026-10-18', '--repos', 'alpha', '--scan', '1'],
          ghStubDir: stub.dir,
        }),
      );

      then('it exits 0', () => {
        expect(run.status).toEqual(0);
      });

      then('it reads only the newest failed run', () => {
        expect(run.stdout).toContain('1 newest failed run scanned');
      });

      then('it never reaches the unreadable older log', () => {
        expect(run.stdout).not.toContain('could not be read');
      });

      then('the bounded report renders as snapped', () => {
        expect(asTimestampsMasked(run.stdout)).toMatchSnapshot();
      });
    });

    when('[t2] a repo whose run list fails', () => {
      const run = useThen('it runs', () =>
        runSkill({
          args: ['--since', '2026-10-18', '--repos', 'gone'],
          ghStubDir: stub.dir,
        }),
      );

      then('it exits 1', () => {
        expect(run.status).toEqual(1);
      });

      then('it fails loud with a MalfunctionError', () => {
        expect(run.stderr).toContain('💥 MalfunctionError: gh run list failed for ehmpathy/gone');
        expect(asTimestampsMasked(run.stderr)).toMatchSnapshot();
      });

      then('stderr opens with the qualified error header, no gh text above it', () => {
        expect(run.stderr.startsWith('💥 MalfunctionError: ')).toEqual(true);
      });

      then('it carries the gh error as its cause', () => {
        expect(run.stderr).toContain('├─ cause\n   │  └─ could not resolve to a Repository');
      });

      then('it names the fix', () => {
        expect(run.stderr).toContain('└─ fix\n      └─ gh auth status');
      });
    });

    when('[t3] a repo whose run list fills the 1000-run cap', () => {
      const run = useThen('it runs', () =>
        runSkill({
          args: ['--since', '2026-10-18', '--repos', 'crowded'],
          ghStubDir: stub.dir,
        }),
      );

      then('it exits 0', () => {
        expect(run.status).toEqual(0);
      });

      then('it names the cap, so older runs read as unseen, never as absent', () => {
        expect(run.stdout).toContain(
          'the list is capped at 1000 runs, so any older run since 2026-10-18 is unseen, not zero',
        );
      });

      then('the capped report renders as snapped', () => {
        expect(asTimestampsMasked(run.stdout)).toMatchSnapshot();
      });
    });

    when('[t4] a repo with no failed run', () => {
      const run = useThen('it runs', () =>
        runSkill({
          args: ['--since', '2026-10-18', '--repos', 'calm'],
          ghStubDir: stub.dir,
        }),
      );

      then('it exits 0', () => {
        expect(run.status).toEqual(0);
      });

      then('it scans no log', () => {
        expect(run.stdout).toContain('0 newest failed runs scanned');
      });

      then('it names no cap, since the list is under it', () => {
        expect(run.stdout).not.toContain('capped');
      });

      then('the report with no failed run renders as snapped', () => {
        expect(asTimestampsMasked(run.stdout)).toMatchSnapshot();
      });
    });
  });
});
