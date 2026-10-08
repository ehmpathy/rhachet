import { ConstraintError } from 'helpful-errors';
import { lstatSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  given,
  then,
  useBeforeAll,
  useThen,
  useWhen,
  when,
} from 'test-fns';

import { genTestTempRepo } from '@/blackbox/.test/infra/genTestTempRepo';
import {
  asSnapshotSafe,
  invokeRhachetCliBinary,
} from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = acceptance tests for the budget gate on the ROLE-DEFAULT arm of `roles boot`
 * .why = the manifest arm and the pre-publish gate have their own suites; this one grades a
 *        boot at a role coordinate, refused by the cap that role's own spec declares
 * .note = every snapshot names its stream and readout; the halt is snapped from stderr
 */
describe('rhachet roles boot — the budget gate, on a role coordinate', () => {
  /**
   * .why = the gate on an unbudgeted render: never refused, always called out as budgetless
   */
  given('[case1] a role spec that declares NO budget', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-boot-yaml-simple' }),
    );

    when('[t0] roles boot --repo .this --role any', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0, and renders', () => {
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('<stats>');
      });

      then('its stats call it out as budgetless', () => {
        // the cap is opt-in, so the `<stats>` callout names the absence and refuses naught
        expect(result.stdout).toMatch(/tokens ≈ \d+ \/ unlimited budget/);
      });

      then('it writes naught to stderr — a budgetless boot is never refused', () => {
        expect(result.stderr).toEqual('');
      });

      then('and the whole render is snapshotted', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-unbudgeted',
        );
      });
    });
  });

  /**
   * .why = the `<stats>` lines are read as a set, so the snapshot pins the whole block at once
   */
  given('[case2] a role spec that fits the budget it declares', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-boot-budget-under' }),
    );

    when('[t0] roles boot --repo .this --role any', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0', () => {
        expect(result.status).toEqual(0);
      });

      then('its stats report the measured count against the cap', () => {
        // the scope label reads the same here, in the halt, and in `<stats>`
        //    (`rule.forbid.domain-term-inconsistency`)
        expect(result.stdout).toContain('(full emitted payload, o200k_base)');
        expect(result.stdout).toMatch(
          /budget = [\d,]+ \/ 5,000 tokens \(\d+% used\)/,
        );
      });

      then('the payload renders as snapshotted — on STDOUT', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT; the token count is deterministic, so pinned
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-boot-under',
        );
      });
    });
  });

  /**
   * .why = a role-default boot over its own declared budget, on an own spec; the halt is snapped
   */
  given('[case3] a role spec that EXCEEDS the budget it declares', () => {
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

      then('exits with status 2 — the caller must fix their spec', () => {
        // the spec is the caller's to trim (`rule.require.exit-code-semantics`)
        expect(result.status).toEqual(2);
      });

      then('NO payload is emitted — the halt spends naught', () => {
        // a boot's output is the context injection, so the halt renders none of it
        expect(result.stdout).not.toContain('<brief.say');
        expect(result.stdout).not.toContain('<stats>');
      });

      then('the halt names the four strategies, cheapest first', () => {
        const order = ['catalogize', 'condense', 'reference', 'eliminate'].map(
          (verb) => result.stderr.indexOf(verb),
        );
        expect(order.every((index) => index > -1)).toEqual(true);
        expect(order).toEqual([...order].sort((a, b) => a - b));
      });

      then('the halt names NO individual resource', () => {
        // the gate sees cost, never value, so it names no resource; the check names fixture
        //    paths since the `condense` gloss itself mentions `x.md`
        expect(result.stderr).not.toContain('briefs/core.md');
        expect(result.stderr).not.toContain('readme.md');
      });

      then('the halt renders as snapshotted — on STDERR', () => {
        // .readout = `asSnapshotSafe` over raw STDERR — no error-readout wrapper
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot(
          'stderr-boot-over',
        );
      });
    });
  });

  /**
   * .what = a spec reached through a real `roles link` symlink is foreign, so the gate warns
   *   rather than halts
   * .note = the link source is a package under the fixture's `node_modules/`, declared by a
   *   `rhachet.repo.yml` (`rule.forbid.rhachet-use-ts`)
   */
  given('[case4] a LINKED role whose spec exceeds its own budget', () => {
    const repo = useBeforeAll(async () => {
      const made = await genTestTempRepo({
        fixture: 'with-linked-role-over-budget',
      });

      // the real link, via `roles link`
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

    when('[t0] the spec `roles link` produced', () => {
      then('it is a real SYMLINK — the premise the gate reads', () => {
        // the case's precondition, clamped (`rule.require.clamp-the-premise-a-guard-rests-on`)
        const pathToSpec = join(
          repo.path,
          '.agent/repo=linked-repo/role=lodger/boot.yml',
        );
        expect(lstatSync(pathToSpec).isSymbolicLink()).toEqual(true);
      });
    });

    when('[t1] roles boot --repo linked-repo --role lodger', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--repo', 'linked-repo', '--role', 'lodger'],
          cwd: repo.path,
        }),
      );

      then('exits with status 0 — it WARNS, and never halts', () => {
        // a foreign spec lives in another repo's published artifact, never the caller's to edit
        expect(result.status).toEqual(0);
      });

      then('it names the overage, and says the spec is not the caller\u2019s', () => {
        expect(result.stderr).toContain('over budget');
        expect(result.stderr).toContain('not yours to trim');
      });

      then('it offers NO remedy ladder — every rung would be unreachable', () => {
        // each strategy would name a write into a version-pinned store
        for (const verb of ['catalogize', 'condense', 'reference', 'eliminate'])
          expect(result.stderr).not.toContain(verb);
      });

      then('the warn renders as snapshotted — on STDERR', () => {
        // .readout = `asSnapshotSafe` over raw STDERR — no error-readout wrapper
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot(
          'stderr-warn-linked',
        );
      });
    });

    /**
     * .what = the same foreign spec at the report grain: `roles cost --all` marks its row
     *   (`asBootCostSweepRow`), over the real link `[t0]` clamps
     * .note = the report is not a gate; it answers regardless of who owns the spec
     */
    when('[t2] roles cost --all, over the same real link', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'cost', '--all'],
          cwd: repo.path,
        }),
      );

      then(
        'exits with status 0 — a report reports, whoever owns the spec',
        () => {
          expect(result.status).toEqual(0);
        },
      );

      then(
        '🔴 the FOREIGN over-budget spec is in the roster, and marked',
        () => {
          // the row names the `.agent/` path a reader can address, never the store path the
          // symlink resolves to — `fast-glob` yields what it MATCHED
          const rowLinked = result.stdout
            .split('\n')
            .find((line) =>
              line.includes('.agent/repo=linked-repo/role=lodger/boot.yml'),
            );
          expect(rowLinked).toBeDefined();
          expect(rowLinked).toContain('🟡');
        },
      );

      then('the report offers NO remedy ladder — it never advises at all', () => {
        // a report does not advise; the ladder belongs at the halt only
        for (const verb of ['catalogize', 'condense', 'reference', 'eliminate'])
          expect(result.stdout).not.toContain(verb);
      });

      then('the roster renders as snapshotted — on STDOUT', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT — no error-readout wrapper
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-cost-all-linked',
        );
      });
    });
  });

  /**
   * .what = in subject mode, the budget is measured against the narrowed payload, never the
   *   whole spec
   * .note = both `when`s share one fixture, spec, and cap; only `--subject` differs
   */
  given(
    '[case5] a SUBJECT-mode role spec whose cap sits between its subjects',
    () => {
      const repo = useBeforeAll(async () =>
        genTestTempRepo({ fixture: 'with-boot-budget-subject' }),
      );

      when('[t0] roles boot --subject review — the lighter selection', () => {
        const result = useBeforeAll(async () =>
          invokeRhachetCliBinary({
            args: [
              'roles',
              'boot',
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

        then('exits with status 0 — the narrowed payload fits', () => {
          expect(result.status).toEqual(0);
        });

        then('it rendered the SELECTED subject, and not its peer', () => {
          // the selection precondition (`rule.require.clamp-the-premise-a-guard-rests-on`)
          expect(result.stdout).toContain('briefs/review.md');
          expect(result.stdout).toContain('briefs/shared.md');
          expect(result.stdout).not.toContain('briefs/fulcrums.md');
        });

        then('its stats report the NARROWED count against the same cap', () => {
          // the cap has headroom on both sides: ~72% here, ~162% at `[t1]`
          expect(result.stdout).toMatch(
            /budget = [\d,]+ \/ 400 tokens \(\d+% used\)/,
          );
        });

        then('the narrowed payload renders as snapshotted — on STDOUT', () => {
          // .readout = `asSnapshotSafe` over raw STDOUT — no error-readout wrapper
          expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
            'stdout-subject-narrowed-under',
          );
        });
      });

      when(
        '[t1] roles boot --subject review,fulcrums — the wider selection',
        () => {
          const result = useBeforeAll(async () =>
            invokeRhachetCliBinary({
              args: [
                'roles',
                'boot',
                '--repo',
                '.this',
                '--role',
                'any',
                '--subject',
                'review,fulcrums',
              ],
              cwd: repo.path,
              logOnError: false,
            }),
          );

          then('exits with status 2 — the SAME cap, a wider selection', () => {
            // the spec is unchanged since `[t0]`; only the selection widened
            expect(result.status).toEqual(2);
          });

          then('NO payload is emitted', () => {
            expect(result.stdout).not.toContain('<brief.say');
            expect(result.stdout).not.toContain('<stats>');
          });

          then('the halt offers the FIFTH rung — narrow the subject', () => {
            // the rung only a subject-mode spec earns; `[t0]` shows it works
            expect(result.stderr).toContain('five strategies');
            expect(result.stderr).toContain('--subject');
          });

          then('🔴 the halt names WHICH subjects were in scope', () => {
            // `narrow` takes a subject slug, so the halt names the subjects in scope
            expect(result.stderr).toContain('in scope — 2 subjects');
            expect(result.stderr).toMatch(/review\s+−\s*\d+ tokens/);
            expect(result.stderr).toMatch(/fulcrums\s+−\s*\d+ tokens/);
          });

          then(
            '🔴 the per-subject number is a MARGIN — what a drop recovers',
            () => {
              // each margin is a re-plan without the subject; `shared.md` and all chrome
              //    survive every drop, so the margins sum to less than the payload
              const payload = Number(
                /payload  = ([\d,]+) tokens/
                  .exec(result.stderr)?.[1]
                  ?.replace(/,/g, ''),
              );
              const margins = [
                ...result.stderr.matchAll(/−\s*([\d,]+) tokens/g),
              ].map((match) => Number(match[1]!.replace(/,/g, '')));

              // the positive: two rows, each a real recovery rather than a zero
              expect(margins).toHaveLength(2);
              for (const margin of margins) expect(margin).toBeGreaterThan(0);

              // a strict shortfall proves the number is marginal, not an attributed share
              expect(margins[0]! + margins[1]!).toBeLessThan(payload);

              // the header must not invite the sum the arithmetic above forbids
              expect(result.stderr).toContain('what a drop of each recovers');
            },
          );

          then('🔴 BOTH printed commands carry the selection that was measured', () => {
            // the header and the cost command both carry the caller's `--subject`, so the cost
            //   the author reruns matches the slice the halt quoted
            const [header, ...rest] = result.stderr.split('\n');
            expect(header).toContain('--subject review,fulcrums');

            const lineCost = rest.find((line) => line.includes('cost'));
            expect(lineCost).toContain('--subject review,fulcrums');
          });

          then('the halt names NO individual resource', () => {
            // the gate sees cost, never value
            expect(result.stderr).not.toContain('briefs/fulcrums.md');
            expect(result.stderr).not.toContain('briefs/review.md');
          });

          then('the halt renders as snapshotted — on STDERR', () => {
            // .readout = `asSnapshotSafe` over raw STDERR — no error-readout wrapper
            expect(asSnapshotSafe(result.stderr)).toMatchSnapshot(
              'stderr-subject-widened-over',
            );
          });
        },
      );

      when(
        '[t2] roles boot --subject review --subject fulcrums — the repeated form',
        () => {
          // commander keeps only the LAST value of a repeated flag, so with no collector this
          //   call booted `fulcrums` alone and dropped `review` in silence
          const result = useBeforeAll(async () =>
            invokeRhachetCliBinary({
              args: [
                'roles',
                'boot',
                '--repo',
                '.this',
                '--role',
                'any',
                '--subject',
                'review',
                '--subject',
                'fulcrums',
              ],
              cwd: repo.path,
              logOnError: false,
            }),
          );

          then('exits with status 2 — the same verdict as the comma form', () => {
            expect(result.status).toEqual(2);
          });

          then('🔴 BOTH subjects were in scope — none dropped', () => {
            expect(result.stderr).toContain('in scope — 2 subjects');
            expect(result.stderr).toMatch(/review\s+−\s*\d+ tokens/);
            expect(result.stderr).toMatch(/fulcrums\s+−\s*\d+ tokens/);
          });

          then('the halt renders as snapshotted — on STDERR', () => {
            // .readout = `asSnapshotSafe` over raw STDERR — no error-readout wrapper
            expect(asSnapshotSafe(result.stderr)).toMatchSnapshot(
              'stderr-subject-widened-over-repeated',
            );
          });
        },
      );
    },
  );

  /**
   * .what = a breach the ref roster carries: the headline says `some resources must go`, never
   *   `say`, since a say trim cannot close it
   * .note = `[t0]` measures the premise via `rhx cost` (`rule.require.clamp-the-premise-a-guard-rests-on`);
   *   the say set alone sits far under the cap
   * .note = ref files are one line each; a ref emits only its path
   */
  given('[case6] a breach the REF roster carries, not the say set', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-boot-budget-ref-dominated' }),
    );

    when('[t0] roles cost --repo .this --role any — the premise', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'cost', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
        }),
      );

      then('🔴 the REF roster outranks every resident document', () => {
        // the column sorts heaviest first, so rank order is the measurement
        const lines = result.stdout.split('\n');
        const rankOf = (needle: string): number =>
          lines.findIndex((line) => line.includes(needle));

        const rankRoster = rankOf('briefs.ref');
        expect(rankRoster).toBeGreaterThan(-1);

        for (const resident of ['briefs/core.md', 'readme.md']) {
          const rankResident = rankOf(resident);
          expect(rankResident).toBeGreaterThan(-1);
          expect(rankRoster).toBeLessThan(rankResident);
        }
      });

      then('the report renders as snapshotted — on STDOUT', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT — no error-readout wrapper
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-ref-dominated-cost',
        );
      });
    });

    when('[t1] roles boot --repo .this --role any — the halt', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
          logOnError: false,
        }),
      );

      then('exits with status 2 — the cap is breached', () => {
        expect(result.status).toEqual(2);
      });

      then('🔴 the headline does NOT narrow the claim to `say`', () => {
        // asserted from both sides; the positive alone matches a headline narrowed to `say`
        expect(result.stderr).toContain('some resources must go');
        expect(result.stderr).not.toContain('some say resources must go');
        expect(result.stderr).not.toContain('say resources');
      });

      then('the ladder still offers the two CLASS-NEUTRAL rungs', () => {
        // `catalogize` and `eliminate` reach refs; `condense` and `reference` act on say alone
        expect(result.stderr).toContain('catalogize');
        expect(result.stderr).toContain('eliminate');
      });

      then('the halt names NO individual resource', () => {
        // the gate sees cost, never value, so it names no resource
        expect(result.stderr).not.toContain('briefs/core.md');
        expect(result.stderr).not.toContain('refs/reference.on-');
      });

      then('the halt renders as snapshotted — on STDERR', () => {
        // .readout = `asSnapshotSafe` over raw STDERR — no error-readout wrapper
        expect(asSnapshotSafe(result.stderr)).toMatchSnapshot(
          'stderr-ref-dominated-over',
        );
      });
    });
  });

  /**
   * .what = the steer band: a payload high against its cap, yet under it
   * .note = every assertion is a range, never an exact percentage
   */
  given('[case7] a payload HIGH against its cap, and under it', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-boot-budget-steer' }),
    );

    when('[t0] roles boot --repo .this --role any', () => {
      const result = useBeforeAll(async () =>
        invokeRhachetCliBinary({
          args: ['roles', 'boot', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
        }),
      );

      then('🔴 it STEERS rather than refuses — exit 0, and the payload lands', () => {
        // under the cap, the gate steers and never halts
        expect(result.status).toEqual(0);
        expect(result.stdout).toContain('<stats>');
        expect(result.stdout).toContain('# core');
      });

      then('🔴 the headroom is in the HIGH band — asserted as a range', () => {
        const used = Number(
          /budget = [\d,]+ \/ [\d,]+ tokens \((\d+)% used\)/.exec(result.stdout)?.[1],
        );

        // the pair bounds the band from both sides
        expect(used).toBeGreaterThanOrEqual(75);
        expect(used).toBeLessThanOrEqual(100);
      });

      then('🔴 no refusal reaches stderr — a steer is silent about remedy', () => {
        // a steer shows the number and offers no ladder
        expect(result.stderr).not.toContain('over budget');
        expect(result.stderr).not.toContain('some resources must go');
        expect(result.stderr).not.toContain('cheapest first');

        // and naught else either — a steer writes no line to stderr at all
        expect(result.stderr).toEqual('');
      });

      then('the steer line renders as snapshotted — on STDOUT', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT — no error-readout wrapper
        expect(asSnapshotSafe(result.stdout)).toMatchSnapshot(
          'stdout-steer-band',
        );
      });
    });
  });

  /**
   * .what = the steer tracks the payload across two boots
   * .note = every assertion here is relational, never a literal percentage
   */
  given('[case8] a cap with room for TWO boots, and a say set that grows', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-boot-budget-climb' }),
    );

    // an object, never a bare number: `useWhen`/`useThen` return a proxy, which cannot wrap a primitive
    const steerBefore = useWhen('[t0] the role boots', () => {
      const readout = useThen(
        'it steers — exit 0, and under its cap',
        async () => {
          const result = await invokeRhachetCliBinary({
            args: ['roles', 'boot', '--repo', '.this', '--role', 'any'],
            cwd: repo.path,
          });

          expect(result.status).toEqual(0);
          expect(result.stderr).not.toContain('over budget');

          return {
            used: Number(
              /budget = [\d,]+ \/ [\d,]+ tokens \((\d+)% used\)/.exec(
                result.stdout,
              )?.[1],
            ),
            stdout: asSnapshotSafe(result.stdout),
          };
        },
      );

      return readout;
    });

    when('[t1] a brief lands in the say set, and the role boots again', () => {
      const steerAfter = useThen(
        'the SECOND boot steers too — exit 0, and still under its cap',
        async () => {
          // the new brief matches the spec's glob, so the spec itself is untouched
          writeFileSync(
            join(
              repo.path,
              '.agent/repo=.this/role=any/briefs/second.md',
              ),
            [
              '# second',
              '',
              'a brief the author wrote between the two boots. it costs real tokens, and it is',
              'small enough that the payload still lands under the cap — so what the author sees',
              'is a steer that moved, never a refusal.',
              '',
            ].join('\n'),
          );

          const result = await invokeRhachetCliBinary({
            args: ['roles', 'boot', '--repo', '.this', '--role', 'any'],
            cwd: repo.path,
          });

          expect(result.status).toEqual(0);
          expect(result.stderr).not.toContain('over budget');

          return {
            used: Number(
              /budget = [\d,]+ \/ [\d,]+ tokens \((\d+)% used\)/.exec(
                result.stdout,
              )?.[1],
            ),
            stdout: asSnapshotSafe(result.stdout),
          };
        },
      );

      then('🔴 the headroom CLIMBED — the steer tracks the payload', () => {
        // a constant or stale steer line fails here
        expect(steerAfter.used).toBeGreaterThan(steerBefore.used);
      });

      then('🔴 and BOTH boots landed under — a climb, never a breach', () => {
        // the climb alone would also pass on a breach
        expect(steerBefore.used).toBeLessThanOrEqual(100);
        expect(steerAfter.used).toBeLessThanOrEqual(100);
      });

      then('and BOTH renders are pinned — the climb, seen', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT, captured in each `[tn]` above
        // .note = the pair is for review; the climb itself is graded by `toBeGreaterThan`
        expect(steerBefore.stdout).toMatchSnapshot('stdout-climb-before');
        expect(steerAfter.stdout).toMatchSnapshot('stdout-climb-after');
      });
    });
  });

  /**
   * .what = the authorship loop (vision `case=7.the-authorship-loop`): boot, meet the halt,
   *   take the `condense` rung, boot again, and pass
   * .note = the rung touches no part of the spec, so the verdict flip is due to the trim alone
   */
  given('[case9] a breach the author CLOSES, and boots again', () => {
    const repo = useBeforeAll(async () =>
      genTestTempRepo({ fixture: 'with-boot-budget-loop' }),
    );

    const pathToSpec = () =>
      join(repo.path, '.agent/repo=.this/role=any/boot.yml');

    // an object, never a primitive (see `[case8]`)
    const halt = useWhen('[t0] the role boots, and the cap REFUSES it', () => {
      // the `useThen` fetches; each assertion sits in its own `then`
      const readout = useThen('the boot returns', async () => {
        const result = await invokeRhachetCliBinary({
          args: ['roles', 'boot', '--repo', '.this', '--role', 'any'],
          cwd: repo.path,
          logOnError: false,
        });

        return {
          status: result.status,
          stdout: result.stdout,
          stderr: result.stderr,
          spec: readFileSync(pathToSpec(), 'utf8'),
        };
      });

      then('it halts — exit 2, and no payload lands', () => {
        expect(readout.status).toEqual(2);
        expect(readout.stdout).not.toContain('<stats>');
      });

      then('the halt renders as snapshotted — on STDERR', () => {
        // the halt half of the loop; `[t1]` pins the recovered render
        // .readout = `asSnapshotSafe` over raw STDERR — no error-readout wrapper
        expect(asSnapshotSafe(readout.stderr)).toMatchSnapshot(
          'stderr-loop-halt',
        );
      });

      return readout;
    });

    when('[t1] the author takes the CONDENSE rung, and boots again', () => {
      const pass = useThen(
        'the SAME command now passes — exit 2 became exit 0',
        async () => {
          // the `.md.min` the `condense` gloss names; the renderer prefers it
          writeFileSync(
            join(repo.path, '.agent/repo=.this/role=any/briefs/core.md.min'),
            [
              '# core',
              '',
              'a boot renders only where its payload sits under its declared cap. the cap counts',
              'the full emitted payload. a breach offers four moves, cheapest first, and names no',
              'document — the gate sees cost, the author holds value.',
              '',
            ].join('\n'),
          );

          const result = await invokeRhachetCliBinary({
            args: ['roles', 'boot', '--repo', '.this', '--role', 'any'],
            cwd: repo.path,
          });

          expect(result.status).toEqual(0);

          return {
            stdout: result.stdout,
            spec: readFileSync(pathToSpec(), 'utf8'),
            used: Number(
              /budget = [\d,]+ \/ [\d,]+ tokens \((\d+)% used\)/.exec(
                result.stdout,
              )?.[1],
            ),
          };
        },
      );

      then('🔴 the halt had named the very rung the author took', () => {
        // the rung taken is the rung the halt named
        expect(halt.stderr).toContain('condense');
        expect(halt.stderr).toContain('author an x.md.min beside x.md');
      });

      then('🔴 the SPEC never changed — one declared cap, two verdicts', () => {
        // the cap is unchanged, so the flip is due to the payload (`rule.require.clamp-the-premise-a-guard-rests-on`)
        expect(pass.spec).toEqual(halt.spec);
        expect(pass.spec).toContain('tokens: 400');
      });

      then('🔴 the recovered boot lands UNDER — the loop actually closes', () => {
        // .note = the status flip in `[t1]` grades that `condense` moves the counted payload
        expect(pass.used).toBeLessThanOrEqual(100);
      });

      then('the body carries the CONDENSED variant, not the original', () => {
        // the negative proves the `.min` replaced its source rather than joined it
        expect(pass.stdout).toContain(
          'a boot renders only where its payload sits under',
        );
        expect(pass.stdout).not.toContain('.what the ladder deliberately omits');
      });

      then('the recovered render matches its snapshot — on STDOUT', () => {
        // .readout = `asSnapshotSafe` over raw STDOUT — no error-readout wrapper
        expect(asSnapshotSafe(pass.stdout)).toMatchSnapshot(
          'stdout-loop-recovered',
        );
      });
    });
  });
});
