import { spawnSync } from 'child_process';
import { ConstraintError } from 'helpful-errors';
import { join } from 'path';
import { given, then, useBeforeAll, useThen, when } from 'test-fns';

/**
 * .what = show.gh.job.log against the real github api: a run's jobs, one job's log, a grep,
 *   and the refusals
 * .why = the skill's whole value is the read of a real job log (escapes stripped); a stub of gh
 *   would prove only the stub. the run is found live, so no hardcoded id expires with gh's
 *   log retention
 * .note = needs gh auth: locally `gh auth login`, in ci `GH_TOKEN: ${{ github.token }}` with
 *   `actions: read`. absent auth fails fast, never skips (rule.require.failfast)
 */

/** this file sits at `.agent/repo=.this/role=any/skills/`, so four hops reach the repo root */
const REPO_ROOT = join(__dirname, '..', '..', '..', '..');

const runSkill = (input: {
  args: string[];
}): { status: number | null; stdout: string; stderr: string } => {
  const result = spawnSync(
    'bash',
    [join(__dirname, 'show.gh.job.log.sh'), ...input.args],
    { cwd: REPO_ROOT, encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 },
  );
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
};

/**
 * .what = mask the live github data of a skill render, so a snapshot locks the tree shape only
 * .why = job ids, run ids, line counts, timestamps, and every log or job row vary per run; the
 *   shape (header, repo row, count row, branch labels, error header) is what the skill owns
 * .note = a body line is one that sits six spaces deep, under a branch label; each run of body
 *   lines collapses to one masked line, so the count of body lines stays out of the snapshot.
 *   a `failure lines` branch with an empty body still shows one masked line, as gh logs differ
 *   on whether a failure line is found
 */
const maskLiveData = (text: string): string => {
  const masked: string[] = [];
  const lines = text
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/g, '<time>')
    .replace(/\b\d{6,}\b/g, '<id>')
    .replace(/^( +├─ )\d+ lines$/gm, '$1N lines')
    .split('\n');
  for (const line of lines) {
    const isBody = /^ {6}\S/.test(line);
    if (!isBody) {
      // a `failure lines` branch with an empty body gets the placeholder its peer runs show
      const prior = masked[masked.length - 1] ?? '';
      if (/^ +└─ last \d+ lines/.test(line) && /failure lines$/.test(prior))
        masked.push('      <log line>');
      masked.push(line);
      continue;
    }
    // collapse each run of body lines into one
    if (/^ {6}<log line>$/.test(masked[masked.length - 1] ?? '')) continue;
    masked.push('      <log line>');
  }
  return masked.join('\n');
};

/**
 * .what = the id of the latest completed `test` run of this repo, and one of its job ids
 * .why = a live id, so the test reads a log gh still holds
 */
const getOneRunCompletedWithJob = (): { runId: string; jobId: string } => {
  const runs = spawnSync(
    'gh',
    [
      'run',
      'list',
      '--workflow',
      'test',
      '--status',
      'completed',
      '--limit',
      '1',
      '--json',
      'databaseId',
      '--jq',
      '.[0].databaseId',
    ],
    { cwd: REPO_ROOT, encoding: 'utf-8' },
  );
  const runId = runs.stdout.trim();
  if (runs.status !== 0 || !/^\d+$/.test(runId))
    throw new ConstraintError('gh could not list a completed test run', {
      stderr: runs.stderr,
      hint: 'run `gh auth login` locally; in ci set GH_TOKEN to github.token with actions: read',
    });

  const jobs = spawnSync(
    'gh',
    ['run', 'view', runId, '--json', 'jobs', '--jq', '.jobs[0].databaseId'],
    { cwd: REPO_ROOT, encoding: 'utf-8' },
  );
  const jobId = jobs.stdout.trim();
  if (jobs.status !== 0 || !/^\d+$/.test(jobId))
    throw new ConstraintError('gh could not list the jobs of a test run', {
      runId,
      stderr: jobs.stderr,
      hint: 'run `gh auth login` locally; in ci set GH_TOKEN to github.token with actions: read',
    });
  return { runId, jobId };
};

describe('show.gh.job.log', () => {
  given('[case1] a completed test run of this repo', () => {
    const scene = useBeforeAll(async () => getOneRunCompletedWithJob());

    when('[t0] the jobs of the run are listed', () => {
      const listed = useThen('it lists them', () =>
        runSkill({ args: ['--run', scene.runId] }),
      );

      then('it exits 0 and names the job by id, with a conclusion', () => {
        expect(listed.status).toEqual(0);
        expect(listed.stdout).toContain(`show.gh.job.log --run ${scene.runId}`);
        expect(listed.stdout).toMatch(
          new RegExp(`${scene.jobId} · (success|failure|cancelled|skipped)`),
        );
        expect(maskLiveData(listed.stdout)).toMatchSnapshot();
      });
    });

    when('[t1] one job log is read with a short tail', () => {
      const shown = useThen('it shows the log', () =>
        runSkill({ args: ['--job', scene.jobId, '--tail', '5'] }),
      );

      then('it exits 0 with the repo, the line count, and the tail', () => {
        expect(shown.status).toEqual(0);
        expect(shown.stdout).toContain(`show.gh.job.log --job ${scene.jobId}`);
        expect(shown.stdout).toContain('repo = ehmpathy/rhachet');
        expect(shown.stdout).toMatch(/├─ \d+ lines/);
        expect(shown.stdout).toContain('└─ last 5 lines');
        expect(maskLiveData(shown.stdout)).toMatchSnapshot();
      });

      then('no terminal escape reaches the output', () => {
        // eslint-disable-next-line no-control-regex
        expect(shown.stdout).not.toMatch(/\x1B\[/);
      });
    });

    when('[t2] one job log is read with a grep', () => {
      const grepped = useThen('it shows only the lines that match', () =>
        runSkill({ args: ['--job', scene.jobId, '--grep', 'Complete job'] }),
      );

      then('it exits 0 and each shown line holds the match', () => {
        expect(grepped.status).toEqual(0);
        expect(grepped.stdout).toContain("lines that match 'Complete job'");
        const shown = grepped.stdout
          .split('\n')
          .filter((line) => /^ {6}\d+:/.test(line));
        expect(shown.length).toBeGreaterThan(0);
        shown.forEach((line) => expect(line).toContain('Complete job'));
        expect(maskLiveData(grepped.stdout)).toMatchSnapshot();
      });
    });

    when('[t3] a job id that does not exist is read', () => {
      const failed = useThen('it fails', () =>
        runSkill({ args: ['--job', '1'] }),
      );

      then('it exits 1 with a MalfunctionError that names the job', () => {
        expect(failed.status).toEqual(1);
        expect(failed.stderr).toContain(
          '💥 MalfunctionError: gh api could not read the log of job 1',
        );
        expect(maskLiveData(failed.stderr)).toMatchSnapshot();
      });
    });
  });

  given('[case2] bad input', () => {
    when('[t0] --job is not a number', () => {
      const refused = useThen('it refuses', () =>
        runSkill({ args: ['--job', 'abc'] }),
      );

      then('it exits 2 and names the fix', () => {
        expect(refused.status).toEqual(2);
        expect(refused.stderr).toMatchSnapshot();
      });
    });

    when('[t1] an unknown arg is passed', () => {
      const refused = useThen('it refuses', () =>
        runSkill({ args: ['--jobs', '1'] }),
      );

      then('it exits 2 and points at the help', () => {
        expect(refused.status).toEqual(2);
        expect(refused.stderr).toMatchSnapshot();
      });
    });

    when('[t2] --help is asked for', () => {
      const help = useThen('it shows the help', () =>
        runSkill({ args: ['--help'] }),
      );

      then('it exits 0 and the help is locked', () => {
        expect(help.status).toEqual(0);
        expect(help.stdout).toMatchSnapshot();
      });
    });
  });
});
