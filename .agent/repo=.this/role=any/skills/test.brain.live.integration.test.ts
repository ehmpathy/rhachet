import { spawnSync } from 'node:child_process';
import { chmodSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { getAllSuitesGated } from '@src/.test/infra/getAllSuitesGated';

/**
 * .what = the refusals and the pass-through of the test.brain.live skill
 * .why = the skill is the one paved door to tier 3: it must open the gate for its one call,
 *   forward every flag, and refuse a run that would spend with no scope
 *
 * .note = an `rhx` stub on PATH stands in for git.repo.test, so no test runs and no brain is
 *   called; the stub echoes the env flag and the argv it received
 * .note = an integration test: it spawns bash
 */

/** this file sits at `.agent/repo=.this/role=any/skills/`, so four hops reach the repo root */
const REPO_ROOT = join(__dirname, '..', '..', '..', '..');

/**
 * .what = an `rhx` stub that echoes what the skill handed it
 * .why = the pass-through is asserted from the stub's stdout, with no real test run
 */
const RHX_STUB = `#!/usr/bin/env bash
echo "BRAIN_LIVE_SCOPE=\${BRAIN_LIVE_SCOPE:-}"
echo "argv=$*"
`;

/**
 * .what = run the skill with args, from the repo root, with the stub first on PATH
 * .why = the same cwd it has under `rhx`
 */
const runSkill = (input: {
  args: string[];
  stubDir: string;
}): { status: number | null; stdout: string; stderr: string } => {
  const result = spawnSync('bash', [join(__dirname, 'test.brain.live.sh'), ...input.args], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      BRAIN_LIVE_SCOPE: '',
      PATH: `${input.stubDir}:${process.env.PATH}`,
    },
  });
  return {
    status: result.status,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
};

describe('test.brain.live', () => {
  const scene = useBeforeAll(async () => {
    const stubDir = genTempDir({ slug: 'test-brain-live-rhx-stub' });
    const stubPath = join(stubDir, 'rhx');
    writeFileSync(stubPath, RHX_STUB);
    chmodSync(stubPath, 0o755);
    return { stubDir };
  });

  given('[case1] a run that names its tier and a scope', () => {
    when('[t0] --what integration --scope actorAsk --mode apply', () => {
      const run = useBeforeAll(async () =>
        runSkill({
          args: ['--what', 'integration', '--scope', 'actorAsk', '--mode', 'apply'],
          stubDir: scene.stubDir,
        }),
      );

      then('it exits 0', () => {
        expect(run.status).toEqual(0);
      });

      then('it opens the gate for this call', () => {
        expect(run.stdout).toContain('BRAIN_LIVE_SCOPE=all');
      });

      then('it forwards every flag to git.repo.test', () => {
        expect(run.stdout).toContain(
          'argv=git.repo.test --what integration --scope actorAsk --mode apply',
        );
      });
    });

    when('[t1] --what acceptance with no --against', () => {
      const run = useBeforeAll(async () =>
        runSkill({
          args: ['--what', 'acceptance', '--scope', 'clone.joker'],
          stubDir: scene.stubDir,
        }),
      );

      then('it exits 0', () => {
        expect(run.status).toEqual(0);
      });

      then('it adds --against local --env test', () => {
        expect(run.stdout).toContain(
          'argv=git.repo.test --what acceptance --scope clone.joker --against local --env test',
        );
      });
    });

    when('[t2] --what acceptance with its own --against', () => {
      const run = useBeforeAll(async () =>
        runSkill({
          args: ['--what', 'acceptance', '--scope', 'clone.joker', '--against', 'cloud', '--env', 'prep'],
          stubDir: scene.stubDir,
        }),
      );

      then('it exits 0', () => {
        expect(run.status).toEqual(0);
      });

      then('it keeps the caller target', () => {
        expect(run.stdout).toContain(
          'argv=git.repo.test --what acceptance --scope clone.joker --against cloud --env prep',
        );
      });
    });

    when('[t3] a name scope beside a path scope', () => {
      const run = useBeforeAll(async () =>
        runSkill({
          args: ['--what', 'integration', '--scope', 'path://actorAsk', '--scope', 'name://t0'],
          stubDir: scene.stubDir,
        }),
      );

      then('it exits 0', () => {
        expect(run.status).toEqual(0);
      });

      then('the path scope bounds it, so both forward', () => {
        expect(run.stdout).toContain(
          'argv=git.repo.test --what integration --scope path://actorAsk --scope name://t0',
        );
      });
    });

    when('[t4] the flags in --flag=value form', () => {
      const run = useBeforeAll(async () =>
        runSkill({
          args: ['--what=integration', '--scope=actorAsk'],
          stubDir: scene.stubDir,
        }),
      );

      then('it exits 0', () => {
        expect(run.status).toEqual(0);
      });

      then('they are read the same as the spaced form', () => {
        expect(run.stdout).toContain('argv=git.repo.test --what integration --scope actorAsk');
      });
    });
  });

  given('[case2] a run the skill must refuse', () => {
    const REFUSALS: { title: string; args: string[]; message: string }[] = [
      {
        title: '[t0] no --scope',
        args: ['--what', 'integration'],
        message: '--scope is required, since each live test spends real money',
      },
      {
        title: '[t1] no --what',
        args: ['--scope', 'actorAsk'],
        message: '--what is required, since it names the tier to run (integration or acceptance)',
      },
      {
        title: '[t2] a --what outside the two live tiers',
        args: ['--what', 'unit', '--scope', 'actorAsk'],
        message: "--what must be integration or acceptance, got 'unit'",
      },
      {
        title: '[t3] a --scope at the end of the line, with no value',
        args: ['--what', 'integration', '--scope'],
        message: '--scope needs a value',
      },
      {
        title: '[t4] a --scope that names the whole tree',
        args: ['--what', 'integration', '--scope', '.'],
        message: '--scope . matches the whole tree, so it would run every tier-3 suite',
      },
      {
        title: '[t5] a --scope=path:// that names the whole tree',
        args: ['--what', 'integration', '--scope=path://'],
        message: '--scope path:// matches the whole tree, so it would run every tier-3 suite',
      },
      {
        title: '[t6] a --scope that matches more tier-3 suites than one live run may take',
        args: ['--what', 'acceptance', '--scope', 'realbrain'],
        message: 'the path scopes match',
      },
      {
        title: '[t8] four stacked path scopes, each within the cap, whose union is past it',
        args: [
          '--what',
          'acceptance',
          '--scope',
          'path://clone.joker',
          '--scope',
          'path://clone.modalprobe',
          '--scope',
          'path://clone.saybulk',
          '--scope',
          'path://clone.screen-dogfood',
        ],
        message: 'the path scopes match 4 tier-3 suites, past the 3 one live run may take',
      },
      {
        title: '[t7] a name:// scope with no path scope to bound it',
        args: ['--what', 'integration', '--scope', 'name://t0'],
        message: 'a name:// scope alone matches by title in every file, so a path scope must bound the run',
      },
      {
        title: '[t9] a path scope that is not a valid pattern',
        args: ['--what', 'integration', '--scope', 'path://['],
        message: '--scope [ could not be read as a path pattern',
      },
    ];

    REFUSALS.map((refusal) =>
      when(refusal.title, () => {
        const run = useBeforeAll(async () =>
          runSkill({ args: refusal.args, stubDir: scene.stubDir }),
        );

        then('it exits 2', () => {
          expect(run.status).toEqual(2);
        });

        then('it names the cause as a ConstraintError', () => {
          expect(run.stderr).toContain(`✋ ConstraintError: ${refusal.message}`);
          expect(run.stderr).toMatchSnapshot();
        });

        then('stderr opens with the qualified error header, no tool noise above it', () => {
          expect(run.stderr.startsWith('✋ ConstraintError: ')).toEqual(true);
        });

        then('it names the fix', () => {
          expect(run.stderr).toContain('└─ fix\n      └─ rhx test.brain.live');
        });

        then('it never reaches git.repo.test', () => {
          expect(run.stdout).not.toContain('argv=');
        });
      }),
    );
  });

  given('[case4] a path scope that jest widens past its spelled form', () => {
    when('[t0] the scope is the case-changed name of one suite', () => {
      const run = useBeforeAll(async () =>
        runSkill({
          args: ['--what', 'integration', '--scope', 'path://ACTORASK'],
          stubDir: scene.stubDir,
        }),
      );

      then('it is counted case-blind, as jest selects it, so one suite passes the cap', () => {
        expect(run.status).toEqual(0);
      });

      then('it forwards the scope as spelled', () => {
        expect(run.stdout).toContain('--scope path://ACTORASK');
      });
    });

    when('[t1] the scope is a part of the repo root path, which every file holds', () => {
      // the repo root's own dir name sits in every absolute path; it varies by host, so no snap
      const run = useBeforeAll(async () =>
        runSkill({
          args: [
            '--what',
            'integration',
            '--scope',
            `path://${REPO_ROOT.replace(/\/+$/, '').replace(/^.*\//, '')}`,
          ],
          stubDir: scene.stubDir,
        }),
      );

      then('it exits 2', () => {
        expect(run.status).toEqual(2);
      });

      then('it is counted over absolute paths, as jest selects it, so the run is refused', () => {
        expect(run.stderr).toContain('✋ ConstraintError: the path scopes match');
      });

      then('it never reaches git.repo.test', () => {
        expect(run.stdout).not.toContain('argv=');
      });
    });
  });

  given('[case5] a scope that every test file matches', () => {
    when('[t0] the cap counts the gated suites', () => {
      // the twin reads a nested gate call too; the gate's own unit test is the one such file
      const nestedGateFiles = ['src/.test/infra/describeBrainLiveOnDemand.test.ts'];
      const result = useBeforeAll(async () => {
        const run = runSkill({
          args: ['--what', 'integration', '--scope', 'path://.test.ts'],
          stubDir: scene.stubDir,
        });
        return {
          status: run.status,
          gatedAll: getAllSuitesGated({ cwd: REPO_ROOT }),
          countedByTwin: Number(/the path scopes match (\d+) tier-3 suites/.exec(run.stderr)?.[1]),
        };
      });

      then('the run is refused past the cap', () => {
        expect(result.status).toEqual(2);
      });

      then('the clamp finds more gated suites than the cap', () => {
        expect(result.gatedAll.length).toBeGreaterThan(3);
      });

      then('the clamp syntax-tree count holds none of the named nested-gate files', () => {
        expect(result.gatedAll.filter((path) => nestedGateFiles.includes(path))).toEqual([]);
      });

      then('its count is the clamp syntax-tree count plus the named nested-gate files, so no drift hides', () => {
        expect(result.countedByTwin).toEqual(result.gatedAll.length + nestedGateFiles.length);
      });
    });
  });

  given('[case3] a seat that asks the skill to describe itself', () => {
    when('[t0] --help', () => {
      const run = useBeforeAll(async () =>
        runSkill({ args: ['--help'], stubDir: scene.stubDir }),
      );

      then('it exits 0', () => {
        expect(run.status).toEqual(0);
      });

      then('it prints usage, inputs and an example', () => {
        expect(run.stdout).toContain('usage');
        expect(run.stdout).toMatchSnapshot();
      });

      then('its example names --mode apply', () => {
        expect(run.stdout).toContain('--mode apply');
      });

      then('it never reaches git.repo.test', () => {
        expect(run.stdout).not.toContain('argv=');
      });
    });
  });
});
