import { given, then, useBeforeAll, when } from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import { getOneStatsCount } from '@/blackbox/.test/infra/getOneStatsCount';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = acceptance tests for `rhachet roles boot --what`, every caller-visible surface
 * .why = every variant a caller can encounter is snapped (`rule.require.contract-snapshot-exhaustiveness`)
 * .note = every snapshot names its stream and readout; a halt is snapped from stderr
 */
describe('rhachet roles boot --what', () => {
  const repo = useBeforeAll(async () =>
    genTestTempRepo({ fixture: 'with-boot-manifest' }),
  );

  const PATH_SPEC = '.behavior/v2026_09_17.demo';

  given('[case1] a manifest whose docs sit directly beside it', () => {
    when('[t0] roles boot --what', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--what', `${PATH_SPEC}/boot.yml`],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('it says the say briefs, and refs the ref brief by path', () => {
        // a route dir's docs sit directly beside its manifest, and they render
        expect(result.stdout).toContain('boot from a declared manifest');
        // the ref block hoists the shared base once; each line carries the name alone
        expect(result.stdout).toContain(`<briefs.ref base="${PATH_SPEC}/">`);
        expect(result.stdout).toContain('\n2.criteria.md\n');
        expect(result.stdout).not.toContain('held at `ref`, never resident');
      });

      then('it labels each resource by a real repo-root-relative path', () => {
        // a manifest has no repo=/role= coordinates, so it takes no synthetic
        // prefix. the path a reader sees is a path a reader can open
        expect(result.stdout).toContain(
          `<brief.say path="${PATH_SPEC}/0.wish.md">`,
        );
        expect(result.stdout).not.toContain('.agent/repo=');
      });

      then('the pass renders as snapshotted — on STDOUT', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT — no error-readout wrapper
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot('stdout-pass');
      });

      then('it emits NO advisory about the absent budget — on EITHER stream', () => {
        // the cap is opt-in, so an unbudgeted manifest earns no warn; `roles cost` answers its cost
        for (const stream of [result.stderr, result.stdout]) {
          expect(stream).not.toContain('no budget declared');
          expect(stream).not.toContain('uncapped');
        }
      });
    });
  });

  given('[case1b] a manifest that DECLARES a budget and sits under it', () => {
    when('[t0] roles boot --what', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--what', `${PATH_SPEC}/boot.under.yml`],
          cwd: repo.path,
        }),
      );

      then('exits with status 0, and renders the payload', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('boot from a declared manifest');
      });

      then('it emits NO uncapped warn — a declared cap is a cap', () => {
        // the counter-clamp: the warn is scoped, never unconditional (`rule.require.clamp-edge-cases`)
        expect(result.stderr).not.toContain('no budget declared');
        expect(result.stderr).not.toContain('uncapped');
      });

      then('the budgeted pass renders as snapshotted — on STDOUT', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-pass-budgeted',
        );
      });
    });
  });

  given('[case2] a manifest whose payload exceeds the budget it declares', () => {
    when('[t0] roles boot --what', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--what', `${PATH_SPEC}/boot.over.yml`],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with status 2 — the caller must trim their spec', () => {
        // a ConstraintError, never a MalfunctionError (`rule.require.exit-code-semantics`)
        expect(result.status).toEqual(2);
      });

      then('it emits NOT ONE BYTE of the payload it refused', () => {
        // the halt prints no payload, so it spends no tokens
        expect(result.stdout).not.toContain('<brief.say');
        expect(result.stdout).not.toContain('boot from a declared manifest');
      });

      then('the halt names the invocation that produced it', () => {
        expect(result.stderr).toContain(
          `roles boot --what ${PATH_SPEC}/boot.over.yml`,
        );
      });

      then('the halt names the four strategies, cheapest first', () => {
        const order = ['catalogize', 'condense', 'reference', 'eliminate'].map(
          (verb) => result.stderr.indexOf(verb),
        );
        expect(order.every((index) => index > -1)).toEqual(true);
        expect(order).toEqual([...order].sort((a, b) => a - b));
      });

      then('the halt names NO individual resource', () => {
        // the gate sees cost, never value, so it names no resource
        expect(result.stderr).not.toContain('0.wish.md');
        expect(result.stderr).not.toContain('1.vision.yield.md');
        expect(result.stderr).toContain('you choose which');
      });

      then('the halt renders as snapshotted — on STDERR', () => {
        // .readout = `asSnapshotSafe` over raw STDERR — no error-readout wrapper
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot('stderr-halt');
      });
    });
  });

  /**
   * .what = the subject-mode remedy ladder, five rungs with `narrow` first, as bytes off fd 2
   *   (`rule.require.test-coverage-by-grain`)
   * .note = `boot.over.subject.yml` declares the same three docs as `boot.over.yml`, so the two
   *   snapshots differ in the ladder alone
   */
  given('[case2b] an over-budget manifest in SUBJECT mode', () => {
    when('[t0] roles boot --what', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'roles',
            'boot',
            '--what',
            `${PATH_SPEC}/boot.over.subject.yml`,
          ],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with status 2, and emits no payload', () => {
        expect(result.status).toEqual(2);
        expect(result.stdout).not.toContain('<brief.say');
      });

      then('it offers a FIFTH strategy — narrow the subject', () => {
        // the remedy list is a function of mode alone; a subject-scoped spec earns one extra rung
        expect(result.stderr).toContain('five strategies');
        expect(result.stderr).toContain('narrow');
        expect(result.stderr).toContain('--subject');
      });

      then('the four base rungs still lead, cheapest first', () => {
        // the fifth rung is added; the four verbs keep their order
        const order = ['catalogize', 'condense', 'reference', 'eliminate'].map(
          (verb) => result.stderr.indexOf(verb),
        );
        expect(order.every((index) => index > -1)).toEqual(true);
        expect(order).toEqual([...order].sort((a, b) => a - b));
      });

      then('it still names NO individual resource', () => {
        // the five-rung halt names no resource, same as the four-rung one
        expect(result.stderr).not.toContain('0.wish.md');
        expect(result.stderr).not.toContain('1.vision.yield.md');
      });

      then('the five-rung ladder renders as snapshotted — on STDERR', () => {
        // .readout = `asSnapshotSafe` over raw STDERR — no error-readout wrapper
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot(
          'stderr-halt-subject',
        );
      });
    });
  });

  given('[case3] a --what path that points at no file', () => {
    when('[t0] roles boot --what', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--what', `${PATH_SPEC}/typo.yml`],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with status 2, and names the path', () => {
        // an explicit path that points at no file is a caller defect. it must NEVER
        // render an empty payload in silence
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('--what points at no file');
        expect(result.stderr).toContain('typo.yml');
      });

      then('the refusal renders as snapshotted — on STDERR', () => {
        // .readout = `asSnapshotSafe` over raw STDERR
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot('stderr-absent');
      });
    });
  });

  given('[case3a] a --what path one edit away from a real spec', () => {
    when('[t0] roles boot --what', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--what', `${PATH_SPEC}/boot.yaml`],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with status 2, and offers the near spec by its path', () => {
        // the offer is what a human sees on the commonest typo, so it is pinned through the binary
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('--what points at no file');
        expect(result.stderr).toContain('didYouMean');
        expect(result.stderr).toContain(`${PATH_SPEC}/boot.yml`);
      });

      then('the refusal and its offer render as snapshotted — on STDERR', () => {
        // .readout = `asSnapshotSafe` over raw STDERR
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot(
          'stderr-absent-near-miss',
        );
      });
    });
  });

  given('[case3b] a --what path that points at a DIRECTORY', () => {
    when('[t0] roles boot --what', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--what', PATH_SPEC],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with status 2, and says what it found', () => {
        // a directory passes `existsSync`; it is a caller defect, so it exits 2
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('--what points at no file');
        expect(result.stderr).toContain('a directory');
      });

      then('the refusal renders as snapshotted — on STDERR', () => {
        // .readout = `asSnapshotSafe` over raw STDERR
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot(
          'stderr-directory',
        );
      });
    });
  });

  given('[case4] a --what alongside --role', () => {
    when('[t0] roles boot --what --role', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'roles',
            'boot',
            '--what',
            `${PATH_SPEC}/boot.yml`,
            '--role',
            'any',
          ],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it refuses — a boot takes its spec from ONE place', () => {
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
  });

  given('[case5] a --what alongside --if-present', () => {
    when('[t0] roles boot --what --if-present', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'roles',
            'boot',
            '--what',
            `${PATH_SPEC}/boot.yml`,
            '--if-present',
          ],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it refuses — tolerance would hide a typo', () => {
        // --if-present exists to tolerate a role that is not linked HERE. a manifest is one
        // path the caller chose, so tolerance converts a typo into an empty boot
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain(
          '--what cannot be used with --if-present',
        );
      });

      then('the refusal renders as snapshotted — on STDERR', () => {
        // .readout = `asSnapshotSafe` over raw STDERR
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot(
          'stderr-with-if-present',
        );
      });
    });
  });

  given('[case6] a --what that reaches outside the repo', () => {
    when('[t0] roles boot --what', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--what', '../escaped/boot.yml'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it refuses at the repo boundary', () => {
        // the same boundary cpsafe / rmsafe / teesafe already hold — and the refusal must
        // precede the existence check, or the error names the wrong defect
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('--what reaches outside the repo');
      });

      then('the refusal renders as snapshotted — on STDERR', () => {
        // .readout = `asSnapshotSafe` over raw STDERR
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot(
          'stderr-outside-repo',
        );
      });
    });
  });

  given('[case7] a --what with an empty value', () => {
    when('[t0] roles boot --what ""', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--what', ''],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it refuses, and says what the flag takes', () => {
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('--what requires a path');
      });

      then('the refusal renders as snapshotted — on STDERR', () => {
        // .readout = `asSnapshotSafe` over raw STDERR
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot(
          'stderr-absent-value',
        );
      });
    });
  });

  /**
   * .what = the axis-E rejection invariants, at the caller's grain
   * .why = `z.number().int().positive()` refuses all three at parse. these clamp that the
   *        refusal REACHES a caller as an exit code and a legible message, rather than one
   *        that merely holds inside the schema.
   */
  const CASES_MALFORMED = [
    { case: 8, slug: 'zero', file: 'boot.zero.yml' },
    { case: 9, slug: 'negative', file: 'boot.negative.yml' },
    { case: 10, slug: 'non-numeric', file: 'boot.string.yml' },
    // a fractional budget is numeric and positive, yet no token count; `.int()` refuses it
    { case: 16, slug: 'fractional', file: 'boot.float.yml' },
  ];

  for (const one of CASES_MALFORMED)
    given(`[case${one.case}] a budget declared as ${one.slug}`, () => {
      when('[t0] roles boot --what', () => {
        const result = useBeforeAll(async () =>
          invokeRhachetCliBinary({
            args: ['roles', 'boot', '--what', `${PATH_SPEC}/${one.file}`],
            cwd: repo.path,
            logOnError: false,
          }),
        );

        then('it refuses at parse, and emits no payload', () => {
          expect(result.status).toEqual(2);
          expect(result.stdout).not.toContain('<brief.say');
        });

        then('the refusal renders as snapshotted — on STDERR', () => {
          // .readout = `asSnapshotSafe` over raw STDERR
          expect(asSnapshotSafe(result.stderr)).toMatchSnapshot(
            `stderr-budget-${one.slug}`,
          );
        });

        then('stdout renders as snapshotted — the empty half of the pair', () => {
          // requirement 6 snaps both streams; on a refusal the stdout half is the proof of absence
          expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
            `stdout-budget-${one.slug}`,
          );
        });
      });
    });

  given('[case11] a budget nested inside always:', () => {
    when('[t0] roles boot --what', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--what', `${PATH_SPEC}/boot.nested.yml`],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it refuses — the one forbidden cell', () => {
        // a nested budget would otherwise parse and mean naught, a silent pass
        expect(result.status).toEqual(2);
        expect(result.stderr).toContain('budget');
      });

      then('the refusal renders as snapshotted — on STDERR', () => {
        // .readout = `asSnapshotSafe` over raw STDERR
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot(
          'stderr-budget-nested',
        );
      });

      then('stdout renders as snapshotted — the empty half of the pair', () => {
        // requirement 6 snaps both streams; on a refusal the stdout half is the proof of absence
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-budget-nested',
        );
      });
    });
  });

  /**
   * .what = the twin of `[case11]`: a payload section under a key no mode reads (briefs under
   *   `subjct.repo:`, a typo for `subject.`), refused by `assertNoInertSection`
   * .note = snapped from stderr; a halt writes no payload to stdout
   */
  given('[case15] a payload section under a mistyped subject prefix', () => {
    when('[t0] roles boot --what', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--what', `${PATH_SPEC}/boot.mistyped.yml`],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('it refuses, and emits no payload', () => {
        expect(result.status).toEqual(2);
        expect(result.stdout).not.toContain('<brief.say');
      });

      // the refusal names the key the author typed
      then('🔴 it names the MISTYPED KEY, and the shape it expected', () => {
        expect(result.stderr).toContain('subjct.repo');
        expect(result.stderr).toContain('subject.');
      });

      then('the refusal renders as snapshotted — on STDERR', () => {
        // .readout = `asSnapshotSafe` over raw STDERR
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot(
          'stderr-section-mistyped',
        );
      });

      then('stdout renders as snapshotted — the empty half of the pair', () => {
        // requirement 6 snaps both streams; on a refusal the stdout half is the proof of absence
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-section-mistyped',
        );
      });
    });
  });

  /**
   * .what = a manifest's universe is every neighbor of the spec (`getAllBriefCandidateFiles.ts`),
   *   and an absent `say` key says all (`computeBootPlan.ts`), so a ref-only spec renders every
   *   neighbor resident
   * .note = pins current behavior (`rule.require.clamp-edge-cases`); the budget gate is the mitigation
   */
  given('[case12] a manifest in a BUSY dir that declares no say key', () => {
    const repoBusy = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-boot-manifest-busy-dir' }),
    );

    when('[t0] roles boot --what', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: [
            'roles',
            'boot',
            '--what',
            '.behavior/v2026_09_21.busy/boot.yml',
          ],
          cwd: repoBusy.path,
        }),
      );

      then('exits with status 0 — it is a surprise, never an error', () => {
        expect(result.status).toEqual(0);
      });

      then('the ONE curated doc is a ref, as the author asked', () => {
        expect(result.stdout).toContain('<briefs.ref base=');
        expect(result.stdout).toContain('2.criteria.md');
      });

      then('🔴 every NEIGHBOR is resident, though none was named', () => {
        // every neighbor lands resident, though the author named one file
        expect(result.stdout).toContain('inventory.of=seeds._.md');
        expect(result.stdout).toContain('inventory.of=fulcrums._.md');
        expect(result.stdout).toContain('has-questioned-assumptions.md');

        // ⚠️ and they are SAY rather than ref — the distinction is the whole cost. a ref
        //    line costs a path; a say block costs the file
        expect(result.stdout).toContain(
          '<brief.say path=".behavior/v2026_09_21.busy/.seeds/inventory.of=seeds._.md">',
        );
      });

      then('the payload renders as snapshotted — on STDOUT', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT — no error-readout wrapper
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-busy-dir-say-all',
        );
      });
    });
  });

  /**
   * .what = `--manifest`, the declared flag, driven through the binary; every other case boots
   *   via its alias `--what`
   * .note = asserts equality against `--what` rather than a second snapshot of one render
   */
  given('[case13] the wish-named --manifest flag, at the cli surface', () => {
    when('[t0] roles boot --manifest, beside roles boot --what', () => {
      const resultManifest = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--manifest', `${PATH_SPEC}/boot.yml`],
          cwd: repo.path,
        }),
      );

      const resultWhat = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--what', `${PATH_SPEC}/boot.yml`],
          cwd: repo.path,
        }),
      );

      then(
        '--manifest is ACCEPTED — exit 0, never an unknown-option refusal',
        () => {
          // without the `--manifest` declaration, commander exits nonzero
          expect(resultManifest.status).toEqual(0);
          expect(resultManifest.stderr).not.toContain('unknown option');
        },
      );

      then('it renders the payload, by the same path labels', () => {
        expect(resultManifest.stdout).toContain('boot from a declared manifest');
        expect(resultManifest.stdout).toContain(
          `<brief.say path="${PATH_SPEC}/0.wish.md">`,
        );
      });

      then(
        '🔴 it renders BYTE-IDENTICALLY to --what — an alias, never a variant',
        () => {
          // .readout = raw STDOUT on both sides, compared for equality
          expect(resultManifest.stdout).toEqual(resultWhat.stdout);
          expect(resultManifest.stderr).toEqual(resultWhat.stderr);
        },
      );
    });
  });

  /**
   * .what = two boots over one doc set, before and after the `reference` rung moves a say entry
   *   to ref; `files` counts say and ref together, so it does not move while `chars` falls
   * .note = pins current behavior; the two specs differ in one line, where `1.vision.yield.md` sits
   */
  given(
    '[case14] the authorship loop — the `reference` remedy, twice booted',
    () => {
      when('[t0] the same doc set, before and after one say → ref move', () => {
        const resultBefore = useBeforeAll(async () =>
          invokeRhachetCliBinary({
            args: [
              'roles',
              'boot',
              '--what',
              `${PATH_SPEC}/boot.loop.before.yml`,
            ],
            cwd: repo.path,
          }),
        );

        const resultAfter = useBeforeAll(async () =>
          invokeRhachetCliBinary({
            args: [
              'roles',
              'boot',
              '--what',
              `${PATH_SPEC}/boot.loop.after.yml`,
            ],
            cwd: repo.path,
          }),
        );

        const asCount = (stdout: string, label: string): number =>
          getOneStatsCount({ stdout, label });

        then('both boots succeed — the remedy is a legal edit', () => {
          expect(resultBefore.status).toEqual(0);
          expect(resultAfter.status).toEqual(0);
        });

        then('the remedy LANDED — one doc moved from say to ref', () => {
          // the premise: the two specs render different plans
          expect(resultBefore.stdout).toContain(
            `<brief.say path="${PATH_SPEC}/1.vision.yield.md">`,
          );
          expect(resultAfter.stdout).not.toContain(
            `<brief.say path="${PATH_SPEC}/1.vision.yield.md">`,
          );
        });

        then('say FELL, and ref ROSE — by one each', () => {
          expect(asCount(resultAfter.stdout, 'say')).toEqual(
            asCount(resultBefore.stdout, 'say') - 1,
          );
          expect(asCount(resultAfter.stdout, 'ref')).toEqual(
            asCount(resultBefore.stdout, 'ref') + 1,
          );
        });

        then('the payload really did get CHEAPER — the remedy works', () => {
          // the resident bytes fell
          expect(asCount(resultAfter.stdout, 'tokens')).toBeLessThan(
            asCount(resultBefore.stdout, 'tokens'),
          );
        });

        then('🔴 and yet the headline `files` count DID NOT MOVE', () => {
          // `files` sums say + ref, so a say-to-ref move leaves it unchanged
          expect(asCount(resultAfter.stdout, 'files')).toEqual(
            asCount(resultBefore.stdout, 'files'),
          );
        });

        // every assertion above is relative, so both renders are pinned
        //    (`rule.require.contract-snapshot-exhaustiveness`)
        then('the BEFORE render is pinned', () => {
          // .readout = `asSnapshotSafe` over raw STDOUT
          expect(asSnapshotSafe(resultBefore.stdout)).toMatchSnapshot(
            'stdout-loop-before',
          );
        });

        then('the AFTER render is pinned', () => {
          // .readout = `asSnapshotSafe` over raw STDOUT
          expect(asSnapshotSafe(resultAfter.stdout)).toMatchSnapshot(
            'stdout-loop-after',
          );
        });
      });
    },
  );

  /**
   * .what = no flag raises a budget for one invocation, so every raise is a line in a
   *   git-tracked spec a reviewer meets in the diff
   * .note = `CASES_MALFORMED` carries its own ordinals; check clashes against rendered titles
   */
  given(
    '[case17] the raise must land on the diff — no per-invocation override',
    () => {
      when('[t0] roles boot --what, with a --budget override attempted', () => {
        const result = useBeforeAll(async () =>
          invokeRhachetCliBinary({
            args: [
              'roles',
              'boot',
              '--what',
              `${PATH_SPEC}/boot.over.yml`,
              '--budget',
              '999999',
            ],
            cwd: repo.path,
            logOnError: false,
          }),
        );

        then('it is REFUSED — the flag does not exist', () => {
          // commander's unknown-option refusal exits 1, the same for every rhachet command
          expect(result.status).toEqual(1);
          expect(result.stderr).toContain('unknown option');
        });

        then('and no payload rode out on the back of it', () => {
          // no over-budget payload renders
          expect(result.stdout).not.toContain('<brief.say');
        });

        then('the refusal matches its snapshot', () => {
          // .readout = `asSnapshotSafe` over raw STDERR — commander's own unknown-option
          //   refusal
          expect(asSnapshotSafe(result.stderr)).toMatchSnapshot(
            'stderr-budget-flag-absent',
          );
        });
      });
    },
  );
});
