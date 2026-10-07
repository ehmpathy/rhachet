import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { ConstraintError } from 'helpful-errors';
import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { getOneStatsCount } from '@/blackbox/.test/infra/getOneStatsCount';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = acceptance tests for `rhachet roles cost`, every caller-visible surface
 * .why = the budget halt points here, so its render is a contract; one snapshot per surface
 * .note = every snapshot names its stream and readout; a refusal is snapped from stderr
 */
describe('rhachet roles cost', () => {
  given('[case1] a role whose boot declares NO budget', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-registry' }),
    );

    when('[t0] roles cost --repo .this --role any', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'cost', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('it heads with the COST verb, never the boot verb', () => {
        // the header takes `source.coordinates` and supplies its own verb
        expect(result.stdout).toContain('🧢 roles cost --repo .this --role any');
        expect(result.stdout).not.toContain('roles boot');
      });

      then('the header carries no capitals', () => {
        // `rule.prefer.lowercase`
        const header = result.stdout.split('\n')[0]!;
        expect(header).toEqual(header.toLowerCase());
      });

      then('it says the boot is uncapped, rather than omit the line', () => {
        // an absent budget is a fact about this boot, so it is stated
        expect(result.stdout).toContain('none declared — this boot is uncapped');
      });

      then('it names the chrome residual', () => {
        // the ranked column counts each batch alone; chrome is the fixed residual
        expect(result.stdout).toContain('chrome');
        expect(result.stdout).toContain("the renderer's own floor");
      });

      then('the report renders as snapshotted — on STDOUT', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT — no error-readout wrapper
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-role-unbudgeted',
        );
      });
    });
  });

  given('[case2] a role whose boot DECLARES a budget and sits under it', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-boot-budget-under' }),
    );

    when('[t0] roles cost --repo .this --role any', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'cost', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0, and names the declared cap', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('5,000 tokens');
        expect(result.stdout).toContain('% used');
      });

      then('the report renders as snapshotted — on STDOUT', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-role-budgeted-under',
        );
      });
    });

    /**
     * .why = a budgeted boot and `roles cost` read one render through one counter, so their
     *   totals are equal
     * .note = holds only where a budget is declared; an unbudgeted `<stats>` block reports a
     *   `chars ÷ 4` estimate
     */
    when('[t1] the same role is booted', () => {
      const resultCost = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'cost', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
        }),
      );
      const resultBoot = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
        }),
      );

      then('the two commands report ONE identical total', () => {
        const asTotal = (stdout: string): number =>
          getOneStatsCount({ stdout, label: 'tokens' });

        expect(asTotal(resultCost.stdout)).toEqual(asTotal(resultBoot.stdout));
        expect(asTotal(resultCost.stdout)).toBeGreaterThan(0);
      });
    });
  });

  /**
   * .what = the journey the halt prescribes: `roles boot` refuses and points at `rhx cost`,
   *   which reports while the boot is refused
   */
  given('[case3] a role whose boot EXCEEDS the budget it declares', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-boot-budget-over' }),
    );

    when('[t0] roles boot --repo .this --role any', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('the boot halts, and hands the author the cost command', () => {
        // the gate sees cost, never value, so the halt hands over the instrument
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('rhx cost --repo .this --role any');
      });

      then('the halt renders as snapshotted — on STDERR', () => {
        // .readout = `asSnapshotSafe` over raw STDERR — no error-readout wrapper
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot(
          'stderr-halt-points-at-cost',
        );
      });
    });

    when('[t1] the author runs the cost command the halt named', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'cost', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
        }),
      );

      then('it REPORTS rather than refuses — cost is a measurement', () => {
        // `roles cost` shares the boot's source contract and counter, never its gate
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('where the tokens go');
      });

      then('it reports the overage as a percent past 100', () => {
        expect(result.stdout).toContain('20 tokens');
        expect(result.stdout).toMatch(/\d{3,}% used/);
      });

      then('the over-budget report renders as snapshotted — on STDOUT', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-role-budgeted-over',
        );
      });
    });
  });

  given('[case4] a declared manifest', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-boot-manifest' }),
    );
    const PATH_SPEC = '.behavior/v2026_09_17.demo';

    when('[t0] roles cost --what', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'cost', '--what', `${PATH_SPEC}/boot.under.yml`],
          cwd: repo.path,
        }),
      );

      then('exits with status 0, and heads with the manifest coordinate', () => {
        // the header names the flags the caller typed, behind the cost verb
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain(
          `🧢 roles cost --what ${PATH_SPEC}/boot.under.yml`,
        );
      });

      then('it ranks each batch by what it costs', () => {
        expect(result.stdout).toContain('where the tokens go');
        expect(result.stdout).toContain('0.wish.md');
      });

      then('the manifest report renders as snapshotted — on STDOUT', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout-manifest');
      });
    });

    when('[t1] roles cost --what --top 1', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'roles',
            'cost',
            '--what',
            `${PATH_SPEC}/boot.under.yml`,
            '--top',
            '1',
          ],
          cwd: repo.path,
        }),
      );

      then('the capped tail is SUMMED rather than dropped', () => {
        // 🔴 a capped list that does not say what it capped reports a payload smaller than the
        //    one it measured (`rule.forbid.failhide`)
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('more');
      });

      then('the capped report renders as snapshotted — on STDOUT', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-manifest-top-1',
        );
      });
    });

    when('[t2] roles cost --what --role', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'roles',
            'cost',
            '--what',
            `${PATH_SPEC}/boot.yml`,
            '--role',
            'any',
          ],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it refuses — a cost report measures ONE source', () => {
        // the flag contract mirrors the boot's verbatim
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain(
          '--what cannot be used with --role/--repo',
        );
      });

      then('the refusal renders as snapshotted — on STDERR', () => {
        // .readout = `asSnapshotSafe` over raw STDERR
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot(
          'stderr-with-role',
        );
      });
    });

    when('[t3] roles cost --what, at a path that points at no file', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'cost', '--what', `${PATH_SPEC}/typo.yml`],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it refuses and names the path', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('--what points at no file');
        expect(result.stderr).toContain('typo.yml');
      });

      then('the refusal renders as snapshotted — on STDERR', () => {
        // .readout = `asSnapshotSafe` over raw STDERR
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot('stderr-absent');
      });
    });

    /**
     * .what = the three values `getOneRankLimit` refuses, at the caller's grain
     *   (`rule.require.contract-snapshot-exhaustiveness`)
     * .note = the three share one branch today; each row carries its own snapshot key
     */
    const CASES_TOP_REFUSED = [
      { slug: 'non-numeric', raw: 'abc' },
      { slug: 'negative', raw: '-1' },
      { slug: 'fractional', raw: '2.5' },
    ];

    for (const one of CASES_TOP_REFUSED)
      when(`[t4] roles cost --what --top ${one.slug}`, () => {
        const result = useBeforeAll(async () =>
          invokeRhachetCliBinary({
            args: [
              'roles',
              'cost',
              '--what',
              `${PATH_SPEC}/boot.under.yml`,
              '--top',
              one.raw,
            ],
            cwd: repo.path,
            logOnError: false,
          }),
        );

        then('it refuses at exit 2, and renders no report', () => {
          // exit 2 per `rule.require.exit-code-semantics`; no report renders
          expect(result.status).toEqual(2);
          expect(result.stdout).not.toContain('rank');
        });

        then('the refusal names the flag and the fix', () => {
          expect(result.stderr).toContain(
            '--top must be a non-negative integer',
          );
          expect(result.stderr).toContain('omit --top');
        });

        then('the refusal renders as snapshotted — on STDERR', () => {
          // .readout = `asSnapshotSafe` over raw STDERR
          expect(asSnapshotSafe(result.stderr)).toMatchSnapshot(
            `stderr-top-${one.slug}`,
          );
        });
      });

    /**
     * .what = `--manifest`, declared by `invokeRolesCost.ts` apart from the boot's pair, with
     *   `--what` as its alias
     */
    when('[t5] roles cost --manifest, beside roles cost --what', () => {
      const resultAlias = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'cost', '--manifest', `${PATH_SPEC}/boot.under.yml`],
          cwd: repo.path,
          logOnError: false,
        }),
      );
      const resultWhat = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'cost', '--what', `${PATH_SPEC}/boot.under.yml`],
          cwd: repo.path,
        }),
      );

      then('--manifest is ACCEPTED — never an unknown-option refusal', () => {
        // an undeclared `--manifest` exits 1 with `error: unknown option '--manifest'`
        expect(resultAlias.status).toEqual(0);
        expect(resultAlias.stderr).not.toContain('unknown option');
      });

      then('the two flags name ONE contract — identical renders', () => {
        // byte equality makes the two flags one contract
        expect(resultAlias.stdout).toEqual(resultWhat.stdout);
      });
    });
  });

  given('[case5] a flag set that addresses no boot', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-registry' }),
    );

    when('[t0] no --role is named', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'cost', '--repo', '.this'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it refuses and names the flag it needs', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('--role is required');
      });

      then('the refusal renders as snapshotted — on STDERR', () => {
        // .readout = `asSnapshotSafe` over raw STDERR
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot(
          'stderr-absent-role',
        );
      });
    });

    when('[t1] the role is not linked here', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'cost', '--repo', '.this', '--role', 'nonesuch'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it refuses and names the repair', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('roles link');
      });

      then('the refusal renders as snapshotted — on STDERR', () => {
        // .readout = `asSnapshotSafe` over raw STDERR
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot(
          'stderr-role-unlinked',
        );
      });
    });

    when('[t2] the role is not linked, under --if-present', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'roles',
            'cost',
            '--repo',
            '.this',
            '--role',
            'nonesuch',
            '--if-present',
          ],
          cwd: repo.path,
        }),
      );

      then('it exits 0 and says it skipped', () => {
        // --if-present tolerates a role this repo never linked
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('skipped');
      });

      then('the skip renders as snapshotted — on STDOUT', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-if-present-skip',
        );
      });
    });
  });

  given('[case6] a role dir with an orphan .md.min', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-orphan-min' }),
    );

    when('[t0] roles cost --repo .this --role any', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'cost', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it refuses, and names the orphan file', () => {
        // the cost report shares the boot's render, so it shares the boot's orphan refusal
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('orphan.md.min');
      });

      then('the refusal renders as snapshotted — on STDERR', () => {
        // .readout = `asSnapshotSafe` over raw STDERR
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot(
          'stderr-orphan-min',
        );
      });
    });
  });

  /**
   * .what = the repo-wide arm, `roles cost --all`: one report over every swept spec
   */
  given('[case8] a repo whose THREE specs all fit the budgets they declare', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-boot-budgets-many' }),
    );

    when('[t0] roles cost --all', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'cost', '--all'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0, and no spec warns', () => {
        expect(result.status).toEqual(0);
        expect(result.stderr.trim()).toEqual('');
      });

      then('it counts all three, and none is over', () => {
        expect(result.stdout).toContain('3 boot specs');
        expect(result.stdout).toContain('3 budgeted, all within budget');
      });

      then('it prints a row PER SPEC — the headroom steer', () => {
        // the caller asked for the roster, so a clean one still prints
        for (const slug of ['alpha', 'bravo', 'charlie'])
          expect(result.stdout).toContain(`role=${slug}`);
      });

      /**
       * .what = the bound is disclosed on the populated arm too; `[case11]` clamps the empty arm
       */
      then('it discloses the bound it swept, beside the roster', () => {
        expect(result.stdout).toContain('.agent/repo=*/role=*/boot.yml');
        expect(result.stdout).toContain('not swept');
        expect(result.stdout).toContain('roles cost --what');
      });

      /**
       * .what = one terminal elbow at the roster's depth, and it belongs to the reach header
       * .note = a snapshot cannot grade well-formedness (`rule.require.clamp-edge-cases`)
       */
      then('exactly ONE branch closes at the roster depth', () => {
        const terminal = result.stdout
          .split('\n')
          .filter((line) => line.startsWith('   └─'));

        expect(terminal).toHaveLength(1);
        expect(terminal[0]).toContain('swept');
      });

      then('the roster renders as snapshotted — on STDOUT', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT — no error-readout wrapper
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-all-under',
        );
      });
    });
  });

  /**
   * .what = all three row shapes at once — under, over, uncapped — so the budget column is
   *   proven per spec
   */
  given('[case9] a repo with one spec under, one over, and one uncapped', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-boot-budgets-mixed' }),
    );

    when('[t0] roles cost --all', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'cost', '--all'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits 0 — a report answers, it never refuses, even over budget', () => {
        // requirement 9: `--all` is a report a human typed; the refusal is the hook arm's
        expect(result.status).toEqual(0);
        expect(result.stderr.trim()).toEqual('');
      });

      then('it counts three specs, two budgeted, one over', () => {
        expect(result.stdout).toContain('3 boot specs');
        expect(result.stdout).toContain('2 budgeted, 1 over budget');
      });

      then('the over-budget row carries the marker, and no other does', () => {
        const rows = result.stdout
          .split('\n')
          .filter((line) => line.includes('role='));
        const marked = rows.filter((line) => line.includes('🟡'));
        expect(marked).toHaveLength(1);
        expect(marked[0]).toContain('role=breached');
      });

      then('the uncapped row says so, rather than render a blank column', () => {
        // an absent cap is a FACT about that spec. a blank would read as "the report forgot"
        expect(result.stdout).toContain('(no budget)');
      });

      then('the mixed roster renders as snapshotted — on STDOUT', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT — no error-readout wrapper
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-all-mixed',
        );
      });
    });

    when('[t1] roles cost --all --role capped', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'cost', '--all', '--role', 'capped'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it refuses — the sweep picks its own sources', () => {
        // a coordinate beside `--all` names a narrow the sweep cannot honor
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('--all cannot be used with');
      });

      then('the refusal renders as snapshotted — on STDERR', () => {
        // .readout = `asSnapshotSafe` over raw STDERR
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot(
          'stderr-all-with-role',
        );
      });
    });

    // `[t2]` and `[t3]`: `invokeRolesCostForAll` takes no input, so `--top` and `--if-present`
    //    are refused under `--all` rather than dropped (`rule.forbid.failhide`)
    when('[t2] roles cost --all --top 3', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'cost', '--all', '--top', '3'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it refuses — the roster ranks no batches to take a top of', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('--all cannot be used with');
        expect(result.stderr).toContain('--top');
      });

      then('the refusal renders as snapshotted — on STDERR', () => {
        // .readout = `asSnapshotSafe` over raw STDERR
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot(
          'stderr-all-with-top',
        );
      });
    });

    when('[t3] roles cost --all --if-present', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'cost', '--all', '--if-present'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it refuses — the sweep names no role dir to tolerate', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('--all cannot be used with');
        expect(result.stderr).toContain('--if-present');
      });

      then('the refusal renders as snapshotted — on STDERR', () => {
        // .readout = `asSnapshotSafe` over raw STDERR
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot(
          'stderr-all-with-if-present',
        );
      });
    });

    // `[t4]`: the report and the gate must agree on one count, since `roles cost` is where an
    //    author goes to find what the `roles boot` halt refused (`F17`)
    when('[t4] roles cost --all, then roles boot on the over-budget spec', () => {
      const cost = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'cost', '--all'],
          cwd: repo.path,
          logOnError: false,
        }),
      );
      const boot = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--repo', '.this', '--role', 'breached'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('the boot gate halts the spec the report marked over', () => {
        expect(boot.status).toEqual(2);
      });

      then('the report and the gate name one token count for that spec', () => {
        // the cost row reads `<tokens> / <cap> tokens`; the halt reads `payload  = <tokens> tokens`
        const costRow = cost.stdout
          .split('\n')
          .find((line) => line.includes('role=breached'));
        const costTokens = costRow?.match(/([\d,]+) \/ [\d,]+ tokens/)?.[1];
        const bootTokens = boot.stderr.match(/payload\s+=\s+([\d,]+) tokens/)?.[1];
        expect(costTokens).toBeDefined();
        expect(bootTokens).toEqual(costTokens);
      });
    });
  });

  given('[case7] a role dir with mixed compression', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-mixed-min' }),
    );

    when('[t0] roles cost --repo .this --role any', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'cost', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0, and ranks both briefs', () => {
        // the renderer prefers a `.md.min`, so a compressed brief costs what its `.min` costs
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('where the tokens go');
      });

      then('the report renders as snapshotted — on STDOUT', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-mixed-min',
        );
      });
    });
  });

  /**
   * .what = the sweep's tolerance arm: `getOneBootSpecCost` catches a `ConstraintError`,
   *   renders `asBootSpecUnreadableLines` to stderr, drops the row, and carries on
   * .note = the sound spec beside the broken one is what shows the sweep carried on
   */
  given('[case10] a repo where one spec cannot be parsed', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-boot-spec-unreadable' }),
    );

    when('[t0] roles cost --all', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'cost', '--all'],
          cwd: repo.path,
        }),
      );

      then('exits 0 — one unreadable spec does not refuse the report', () => {
        expect(result.status).toEqual(0);
      });

      then('the fault is SAID rather than absorbed, on stderr', () => {
        // a dropped row is said aloud (`rule.forbid.failhide`)
        expect(result.stderr).toContain('could not be read');
        expect(result.stderr).toContain('role=broken');
      });

      then('the fault wears `🟡`, never the caller-fault `✋`', () => {
        // `✋` binds to a refusal at exit 2 (`rule.require.unabridged-error-prefix`); this exits 0
        const [lineFault] = result.stderr
          .split('\n')
          .filter((line) => line.includes('could not be read'));
        expect(lineFault).toContain('🟡');
        expect(lineFault).not.toContain('✋');
      });

      then('the roster STILL prints the spec it could read', () => {
        expect(result.stdout).toContain('role=sound');
      });

      then('the counts reflect the ONE spec that was measured', () => {
        // the broken spec is absent from the tally, never counted at zero
        expect(result.stdout).toContain('1 boot spec');
        expect(result.stdout).not.toContain('role=broken');
      });

      then('the fault block renders as snapshotted — on STDERR', () => {
        // .readout = `asSnapshotSafe` over raw STDERR — no error-readout wrapper
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot(
          'stderr-all-unreadable',
        );
      });

      then('the roster renders as snapshotted — on STDOUT', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-all-unreadable',
        );
      });
    });
  });

  /**
   * .what = the sweep's empty surface, the first render a new adopter meets
   */
  given('[case11] a repo with a role dir and NO boot spec anywhere', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-no-boot-specs' }),
    );

    when('[t0] roles cost --all', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'cost', '--all'],
          cwd: repo.path,
        }),
      );

      then('exits 0 — an empty repo is an ANSWER, never a refusal', () => {
        expect(result.status).toEqual(0);
        expect(result.stderr.trim()).toEqual('');
      });

      then('it SAYS the set is empty rather than print a bare header', () => {
        // `define.invariant.empty-render-names-its-cause`
        expect(result.stdout).toContain(
          '🧢 0 boot specs — none found at the paths swept',
        );
      });

      /**
       * .what = the empty render bounds its own claim to the swept globs, and names a way past
       *   the bound (`rule.forbid.failhide`)
       */
      then('the empty render states its bound, and the way past it', () => {
        expect(result.stdout).toContain('at the paths swept');
        expect(result.stdout).toContain('.agent/repo=*/role=*/boot.yml');
        expect(result.stdout).toContain('not swept');
        expect(result.stdout).toContain('roles cost --what');
      });

      then('the empty render matches its snapshot — on STDOUT', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-all-empty',
        );
      });
    });
  });

  /**
   * .what = requirement 8's ownership split at the report grain: a linked row is tagged, since
   *   its budget is another repo's to raise
   * .note = one own spec beside one linked spec, so the tag is proven per row
   * .note = the link is a real `roles link` (`define.invariant.a-symlink-under-agent-is-foreign`)
   */
  given('[case12] a repo with one OWN spec and one LINKED spec', () => {
    const repo = useBeforeAll(async () => {
      const made = await genTestTempRepo({
        fixture: 'with-linked-and-own-budgets',
      });

      const linked = await invokeRhachetCliBinary({
        args: ['roles', 'link', '--repo', 'linked-repo', '--role', 'lodger'],
        cwd: made.path,
      });
      if (linked.status !== 0)
        throw new ConstraintError('roles link failed in the test fixture', {
          stderr: linked.stderr,
          stdout: linked.stdout,
          hint: 'run `npm run build` so the linked fixture sees a fresh dist, then re-run',
        });

      return made;
    });

    when('[t0] roles cost --all', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'cost', '--all'],
          cwd: repo.path,
        }),
      );

      then('exits 0 — a LINKED spec over its cap is reported, never refused', () => {
        // this repo cannot edit the linked spec (requirement 8's ownership split)
        expect(result.status).toEqual(0);
      });

      then('it costs BOTH specs — the own one and the linked one', () => {
        expect(result.stdout).toContain('2 boot specs');
        expect(result.stdout).toContain('role=resident');
        expect(result.stdout).toContain('role=lodger');
      });

      then('the LINKED row carries the ownership tag', () => {
        const rowLodger = result.stdout
          .split('\n')
          .find((line) => line.includes('role=lodger'));
        expect(rowLodger).toContain('(linked)');
      });

      then('the OWN row does NOT — the tag is per row, never per run', () => {
        // a hard-coded tag fails here
        const rowResident = result.stdout
          .split('\n')
          .find((line) => line.includes('role=resident'));
        expect(rowResident).not.toContain('(linked)');
      });

      then('the roster SAYS what the tag means, and what to do', () => {
        // the note says the budget is another repo's to raise (`rule.require.errors-name-the-fix`)
        expect(result.stdout).toContain('owned by another repo');
        expect(result.stdout).toContain('not yours to trim');
        expect(result.stdout).toContain('warns on it rather than halts');
      });

      then('the mixed-ownership roster renders as snapshotted — on STDOUT', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT — no error-readout wrapper
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-all-mixed-ownership',
        );
      });
    });
  });

  /**
   * .what = `--subject`, wired through `getAllSubjectSlugs`; the proof is `scoped < unscoped`,
   *   since a dropped flag still renders a well-formed full report (`rule.forbid.failhide`)
   * .note = the payload exceeds its `budget: 400`; `roles cost` reports, never refuses
   */
  given('[case13] a role whose boot declares TWO subjects', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-boot-budget-subject' }),
    );

    /**
     * .what = the token total a cost report states, read out of its own render
     * .why = the comparison below is the whole case, so the read of it is named once rather
     *        than re-derived per `then` (`rule.forbid.inline-decode-friction`)
     */
    const asTotalTokens = (stdout: string): number =>
      getOneStatsCount({ stdout, label: 'tokens' });

    when('[t0] roles cost --subject review', () => {
      const resultScoped = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'roles',
            'cost',
            '--repo',
            '.this',
            '--role',
            'any',
            '--subject',
            'review',
          ],
          cwd: repo.path,
        }),
      );
      const resultAll = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'cost', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(resultScoped.status).toEqual(0);
      });

      then('the scoped total is STRICTLY LESS than the unscoped total', () => {
        expect(asTotalTokens(resultScoped.stdout)).toBeLessThan(
          asTotalTokens(resultAll.stdout),
        );
        expect(asTotalTokens(resultScoped.stdout)).toBeGreaterThan(0);
      });

      then('it costs the named subject, and the shared always section', () => {
        // `always` rides every subject-scoped boot
        expect(resultScoped.stdout).toContain('review.md');
        expect(resultScoped.stdout).toContain('shared.md');
      });

      then('it does NOT cost the subject the caller did not name', () => {
        // an over-inclusive scope fails here
        expect(resultScoped.stdout).not.toContain('fulcrums.md');
      });

      then('the header quotes the slice it measured, unlike the whole spec', () => {
        // a narrowed readout that heads with the whole spec's line names no slice, so a
        // reader cannot tell which payload the number belongs to
        expect(resultScoped.stdout).toContain(
          '🧢 roles cost --repo .this --role any --subject review\n',
        );
        expect(resultAll.stdout).toContain(
          '🧢 roles cost --repo .this --role any\n',
        );
      });

      then('the scoped report renders as snapshotted — on STDOUT', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT — no error-readout wrapper
        expect(asSnapshotSafe(resultScoped.stdout)).toMatchSnapshot(
          'stdout-subject-one',
        );
      });
    });

    when('[t1] roles cost --subject review,fulcrums', () => {
      const resultBoth = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'roles',
            'cost',
            '--repo',
            '.this',
            '--role',
            'any',
            '--subject',
            'review,fulcrums',
          ],
          cwd: repo.path,
        }),
      );
      const resultOne = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'roles',
            'cost',
            '--repo',
            '.this',
            '--role',
            'any',
            '--subject',
            'review',
          ],
          cwd: repo.path,
        }),
      );

      then('exits with status 0, and costs both named subjects', () => {
        expect(resultBoth.status).toEqual(0);
        expect(resultBoth.stdout).toContain('review.md');
        expect(resultBoth.stdout).toContain('fulcrums.md');
      });

      then('the header quotes both subjects, in the canonical comma form', () => {
        expect(resultBoth.stdout).toContain(
          '🧢 roles cost --repo .this --role any --subject review,fulcrums\n',
        );
      });

      then('two subjects cost STRICTLY MORE than one', () => {
        // the comma split is the flag's contract (`getAllSubjectSlugs`)
        expect(asTotalTokens(resultBoth.stdout)).toBeGreaterThan(
          asTotalTokens(resultOne.stdout),
        );
      });

      then('the two-subject report renders as snapshotted — on STDOUT', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT — no error-readout wrapper
        expect(asSnapshotSafe(resultBoth.stdout)).toMatchSnapshot(
          'stdout-subject-two',
        );
      });
    });
  });

  given('[case14] a role dir that holds no resources', () => {
    const repo = useBeforeAll(async () => {
      const r = await genTestTempRepo({ fixture: 'minimal' });
      mkdirSync(join(r.path, '.agent', 'repo=.this', 'role=empty'), {
        recursive: true,
      });
      return r;
    });

    when('[t0] roles cost --repo .this --role empty', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'cost', '--repo', '.this', '--role', 'empty'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('it says the boot emits naught, rather than a total of zero', () => {
        expect(result.stdout).toContain('no resources found');
      });

      then('the empty report renders as snapshotted — on STDOUT', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-role-empty',
        );
      });
    });
  });

  given('[case15] a role whose boot.yml is in SIMPLE mode', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-boot-yaml-simple' }),
    );

    when('[t0] roles cost --repo .this --role any --subject test', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'roles',
            'cost',
            '--repo',
            '.this',
            '--role',
            'any',
            '--subject',
            'test',
          ],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it refuses, as roles boot does: --subject requires subject mode', () => {
        // a caller-fixable spec defect is a constraint (`rule.require.exit-code-semantics`)
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain(
          '--subject requires boot.yml in subject mode',
        );
      });

      then('the refusal renders as snapshotted — on STDERR', () => {
        // .readout = `asSnapshotSafe` over raw STDERR — no error-readout wrapper
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot(
          'stderr-subject-on-simple',
        );
      });
    });
  });
});
