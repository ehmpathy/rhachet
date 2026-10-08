import { Command } from 'commander';
import { getError, given, then, useThen, when } from 'test-fns';

import { genSampleFileTree } from '@src/.test/assets/genSampleFileTree';
import { asLogLines } from '@src/.test/infra/asLogLines';

import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { invokeRolesBoot } from './invokeRolesBoot';

/**
 * .what = clamps the budget gate — the refusal, its readout, and its silence on stdout
 * .why = requirement 2 demands a LOUD HARD STOP that spends naught, and requirement 3
 *        demands the refusal name the moves that close it. both are caller-visible, and
 *        neither is provable from a unit of the counter alone.
 */
describe('invokeRolesBoot budget (integration)', () => {
  const testDir = resolve(__dirname, './.temp/invokeRolesBoot.budget');
  const originalCwd = process.cwd();

  /**
   * .what = writes a route dir whose docs sit directly beside its manifest
   * .why = the vision's own worked example, and the shape a route manifest takes
   */
  const genRouteDir = (input: { slug: string; spec: string }): string => {
    genSampleFileTree({
      dir: resolve(testDir, `.behavior/${input.slug}`),
      files: {
        '0.wish.md': '# the wish\n'.concat(
          'boot from a declared manifest, under a declared cap.\n'.repeat(40),
        ),
        '1.vision.yield.md': '# the vision\n'.concat(
          'the wish, executed against this codebase.\n'.repeat(40),
        ),
        'boot.yml': input.spec,
      },
    });
    return `.behavior/${input.slug}/boot.yml`;
  };

  // a cap no real payload can meet — the docs above are ~400 tokens
  const pathOverSimple = (): string =>
    genRouteDir({
      slug: 'over.simple',
      spec: ['budget:', '  tokens: 20', 'briefs:', "  say: ['*.md']", ''].join(
        '\n',
      ),
    });

  const pathOverSubject = (): string =>
    genRouteDir({
      slug: 'over.subject',
      spec: [
        'budget:',
        '  tokens: 20',
        'always:',
        '  briefs:',
        "    say: ['0.wish.md']",
        'subject.vision:',
        '  briefs:',
        "    say: ['1.vision.yield.md']",
        '',
      ].join('\n'),
    });

  // subject mode by SCHEMA, with no subject section to narrow — the seam `case2b` clamps
  const pathOverAlwaysOnly = (): string =>
    genRouteDir({
      slug: 'over.always-only',
      spec: [
        'budget:',
        '  tokens: 20',
        'always:',
        '  briefs:',
        "    say: ['*.md']",
        '',
      ].join('\n'),
    });

  const pathUnder = (): string =>
    genRouteDir({
      slug: 'under',
      spec: [
        'budget:',
        '  tokens: 5000',
        'briefs:',
        "  say: ['*.md']",
        '',
      ].join('\n'),
    });

  const pathUnbudgeted = (): string =>
    genRouteDir({
      slug: 'unbudgeted',
      spec: ['briefs:', "  say: ['*.md']", ''].join('\n'),
    });

  beforeAll(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);
  });

  afterAll(() => {
    process.chdir(originalCwd);
    rmSync(testDir, { recursive: true, force: true });
  });

  const rolesCommand = new Command('roles');
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    logSpy.mockClear();
    errSpy.mockClear();
  });

  invokeRolesBoot({ command: rolesCommand });

  given('[case1] a manifest whose payload exceeds its declared budget', () => {
    when('[t0] the boot is run against it', () => {
      /**
       * 🔴 .what = ONE halt, observed once — the route dir is rewritten to disk and the cli
       *   re-parsed per run, so a run per assertion is the redundant-expensive-operation
       *   class outright (`rule.forbid.redundant-expensive-operations`).
       *
       * 🔴 .why = captured here, not read per `then` — the suite's `beforeEach` clears both
       *   spies, so a later read risks a vacuous pass (`rule.forbid.failhide`).
       */
      const halt = useThen('it refuses', async () => {
        const path = pathOverSimple();
        const error = await getError(
          rolesCommand.parseAsync(['boot', '--what', path], { from: 'user' }),
        );
        return {
          message: error.message,
          countStdoutCalls: logSpy.mock.calls.length,
          lines: asLogLines(errSpy),
          readout: asLogLines(errSpy).join('\n'),
        };
      });

      then('it refuses, and names the overage', () => {
        expect(halt.message).toContain(
          'boot payload exceeds its declared budget',
        );

        // HelpfulError serializes its metadata into the message, so the declared cap and
        // the overage travel with the error rather than only with the stderr readout
        expect(halt.message).toMatch(/"budget":\s*20/);
        expect(halt.message).toMatch(/"over":\s*\d+/);
      });

      then('it emits NOT ONE BYTE of the payload it refuses', () => {
        // 🔴 requirement 2, read strictly — a halt that first prints the payload has
        //    already spent the tokens it refuses to authorize.
        // 🟡 the count is captured at the moment of the run, never read from the spy here —
        //    the spy is cleared between `then`s, so a read here would pass vacuously
        expect(halt.countStdoutCalls).toEqual(0);
      });

      then('it renders the overage readout to stderr', () => {
        // stderr, never stdout — a machine that pipes stdout gets a clean payload or naught
        expect(halt.readout).toContain('over budget');
        expect(halt.readout).toContain('budget   = 20 tokens');
        expect(halt.readout).toContain('over by');
        expect(halt.lines.length).toBeGreaterThan(0);
      });

      then('it names the four strategies, cheapest first', () => {
        // the ladder of loss — requirement 3. the ORDER is the pit of success, so it is
        // asserted as an order rather than as a set
        const order = ['catalogize', 'condense', 'reference', 'eliminate'].map(
          (verb) => halt.readout.indexOf(verb),
        );
        expect(order.every((index) => index > -1)).toEqual(true);
        expect(order).toEqual([...order].sort((a, b) => a - b));

        expect(halt.readout).toContain('four strategies');
        expect(halt.readout).toContain('under `not`');
      });

      then('it names NO individual resource', () => {
        // 🔴 the gate sees a resource's COST and not its VALUE, so advice sorted by cost
        //    would be advice sorted by the one quantity
        //    uncorrelated with the decision. this assertion is NEGATIVE on purpose: it
        //    forbids a builder who would re-add the breakdown as a kindness
        expect(halt.readout).not.toContain('0.wish.md');
        expect(halt.readout).not.toContain('1.vision.yield.md');
        expect(halt.readout).toContain('you choose which');
      });
    });
  });

  given('[case2] an over-budget manifest in SUBJECT mode', () => {
    when('[t0] the boot is run against it', () => {
      // 🔴 ONE halt, observed once — see `[case1]` for why the observations are captured
      //    here rather than read from the spies inside each `then`
      const halt = useThen('it refuses', async () => {
        const path = pathOverSubject();
        await getError(
          rolesCommand.parseAsync(['boot', '--what', path], { from: 'user' }),
        );
        return { readout: asLogLines(errSpy).join('\n') };
      });

      then('it offers a fifth strategy — narrow the subject', () => {
        // the remedy list is a function of MODE — a subject-scoped spec can boot fewer
        // sections, which a simple-mode spec cannot
        expect(halt.readout).toContain('narrow');
        expect(halt.readout).toContain('--subject');
        expect(halt.readout).toContain('five strategies');
      });

      then('the five-rung ladder renders as snapshotted — on STDERR', () => {
        // 🟡 a `toContain` pair cannot see alignment — the visual layout of the ladder,
        //   column by column, so the whole render is pinned instead
        //   (`rule.forbid.snapshot-visual-blemishes`,
        //   `rule.require.contract-snapshot-exhaustiveness`)
        //
        // .readout = raw STDERR, no error-readout wrapper. the fixture is byte-deterministic
        //   (fixed docs, repeated 40x), so the counts inside are stable across machines
        expect(halt.readout).toMatchSnapshot('stderr-halt-subject');
      });
    });
  });

  given('[case2b] an over-budget manifest with ONLY an always: section', () => {
    when('[t0] the boot is run against it', () => {
      then(
        'it offers FOUR strategies — narrow would shrink naught',
        async () => {
          const path = pathOverAlwaysOnly();

          await getError(
            rolesCommand.parseAsync(['boot', '--what', path], {
              from: 'user',
            }),
          );

          const readout = asLogLines(errSpy).join('\n');

          // 🔴 an `always:`-only spec IS subject mode by SCHEMA and declares no subject
          //    section at all, so a `narrow` rung there names a move that shrinks naught.
          //    the readout's mode asks what the caller can DO, never which schema validated
          expect(readout).toContain('four strategies');
          expect(readout).not.toContain('narrow');
          expect(readout).not.toContain('--subject');
        },
      );
    });
  });

  given('[case3] a manifest whose payload fits its declared budget', () => {
    when('[t0] the boot is run against it', () => {
      // 🔴 ONE boot, observed once — see `[case1]`. the `countStderrCalls` capture is the
      //    trap that shape exists for: `expect(errSpy).not.toHaveBeenCalled()` read from a
      //    later `then` would pass VACUOUSLY against the `beforeEach`-cleared spy
      //    (`rule.forbid.failhide`)
      const boot = useThen('it renders', async () => {
        const path = pathUnder();
        await rolesCommand.parseAsync(['boot', '--what', path], {
          from: 'user',
        });
        return {
          lines: asLogLines(logSpy),
          countStderrCalls: errSpy.mock.calls.length,
        };
      });

      then('it renders, and refuses naught', () => {
        expect(boot.lines).toContainEqual(
          expect.stringContaining('boot from a declared manifest'),
        );
        expect(boot.countStderrCalls).toEqual(0);
      });

      then('its stats report the MEASURED count against the cap', () => {
        const lines = boot.lines;

        // the number the stats report is the number the gate enforced — a second
        // tokenization would be both a cost and a chance to disagree
        //
        // 🔴 the label names the SCOPE, and it must match the halt's word for word: one
        //    quantity, one word (`rule.forbid.domain-term-inconsistency`)
        expect(lines).toContainEqual(
          expect.stringMatching(
            /tokens = [\d,]+ \(full emitted payload, o200k_base\)/,
          ),
        );
        expect(lines).toContainEqual(
          expect.stringMatching(
            /budget = [\d,]+ \/ 5,000 tokens \(\d+% used\)/,
          ),
        );

        // 🔴 the `chars / 4` estimate is DROPPED where a budget is declared — two token
        //    numbers over two different scopes read as a contradiction
        expect(lines).not.toContainEqual(expect.stringContaining('tokens ≈'));

        // 🔴 and `chars` goes with it, for the identical reason: it sums SAY content alone
        //    while the measured count covers the whole emitted body, so the two would sit
        //    on adjacent lines over different scopes with no label to part them.
        //
        //    this assertion is NEGATIVE on purpose: `chars` is in the extant block, so the
        //    reflex of a later reader is to restore it as a kindness. requirement 4 governs
        //    the UNBUDGETED render alone, which `[case4]` pins.
        expect(lines).not.toContainEqual(expect.stringContaining('chars ='));
      });
    });
  });

  given('[case4] a manifest that declares NO budget', () => {
    when('[t0] the boot is run against it', () => {
      then('it renders, exactly as it does today', async () => {
        const path = pathUnbudgeted();

        await rolesCommand.parseAsync(['boot', '--what', path], {
          from: 'user',
        });

        // requirement 4 — the cap is opt-in per manifest, and an unbudgeted boot pays
        // naught for it: the counter is never reached, so the tokenizer is never loaded
        const lines = asLogLines(logSpy);

        expect(lines).toContainEqual(
          expect.stringContaining('boot from a declared manifest'),
        );

        // 🔴 NO refusal on stderr. the cap is opt-in by construction, so a manifest with no
        //    `budget` is never halted nor warned — its callout rides in-band, in `<stats>`
        expect(asLogLines(errSpy)).toEqual([]);

        // the estimate, called out as budgetless — and no measured budget line at all
        expect(lines).toContainEqual(
          expect.stringMatching(/tokens ≈ \d+ \/ unlimited budget/),
        );
        expect(lines).not.toContainEqual(expect.stringContaining('budget ='));

        // 🔴 the POSITIVE CONTROL for `[case3]`'s `chars` drop. without it, a build that
        //    deleted the `chars` line outright would pass BOTH cases — the negative
        //    assertion cannot part "dropped where a budget is declared" from "gone
        //    everywhere", and the second would breach requirement 4 in silence.
        expect(lines).toContainEqual(expect.stringContaining('chars ='));
      });
    });
  });
});
