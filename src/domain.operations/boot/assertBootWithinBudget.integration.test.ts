import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { getError, given, then, useBeforeAll, when } from 'test-fns';

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { assertBootWithinBudget } from './assertBootWithinBudget';

/**
 * .what = clamps the gate's COMPARATOR at its exact boundary — `payload === budget` passes,
 *   and one token below it refuses
 *
 * .why = the boundary is the one input that parts `<=` from `<` (`rule.require.clamp-edge-cases`)
 * .note = the budget is derived from a measured run, so it tracks the tokenizer, not a literal
 * .note = `genStatsLines` returns no line, so the payload is stable across the runs
 * .note = integration grain: the gate loads the tokenizer from disk
 */
describe('assertBootWithinBudget — the exact boundary (integration)', () => {
  const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => errSpy.mockClear());
  afterAll(() => errSpy.mockRestore());

  const of = {
    linesBody: [
      '<brief.say path="briefs/one.md">',
      'a payload whose exact token count is what this case is about.',
      '</brief.say>',
    ],
    genStatsLines: (): string[] => [],
  };

  const anchor = {
    rung: 'halt' as const,
    invocation: 'roles boot --what boot.yml',
    mode: 'simple' as const,
    coordinates: '--what boot.yml',
    subjects: null,
  };

  given('[case1] a payload measured against a cap set to its own count', () => {
    // the measurement, taken under a cap no payload of this size can breach
    //
    // .note = returns an object, both caps computed inside it — `useBeforeAll` hands back
    //   a proxy that resolves on property access, not a bare number
    const counted = useBeforeAll(async () => {
      const measured = await assertBootWithinBudget({
        of,
        budget: { tokens: 1_000_000 },
        ...anchor,
      });
      return { exact: measured!.tokens, oneBelow: measured!.tokens - 1 };
    });

    when('[t0] the cap EQUALS the payload', () => {
      then('it passes — the comparator is `<=`, never `<`', async () => {
        const measured = await assertBootWithinBudget({
          of,
          budget: { tokens: counted.exact },
          ...anchor,
        });

        // the positive half: the comparator is `<=`, so an equal cap passes
        expect(measured).toEqual({ tokens: counted.exact });

        // a pass renders no readout at all — the halt is the only writer of stderr
        expect(errSpy).not.toHaveBeenCalled();
      });
    });

    when('[t1] the cap is ONE TOKEN below the payload', () => {
      then('it refuses — the boundary sits exactly at the count', async () => {
        const error = await getError(
          assertBootWithinBudget({
            of,
            budget: { tokens: counted.oneBelow },
            ...anchor,
          }),
        );

        // the negative half: one token below the cap refuses
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain(
          'boot payload exceeds its declared budget',
        );
        expect(error.message).toMatch(/"over":\s*1/);
      });
    });
  });

  /**
   * .what = a fault in the subject re-walk costs the prices and no more — the halt survives,
   *   the roster is still named, and the fault is disclosed (`rule.forbid.failhide`)
   * .why = the re-walk reads the filesystem after the breach is proven, so it can fault
   *   before the ladder prints
   * .note = the fault is injected at the roster seam, which is deterministic where a vanish
   *   race is not (`rule.forbid.race-conditions`)
   */
  given('[case2] a subject roster whose re-walk faults mid-price', () => {
    const rosterWithFault = {
      inScope: ['alpha', 'beta'],
      // a real fs fault — the read of a brief absent from disk raises a genuine `ENOENT`
      genPayloadWithout: async (): Promise<never> => {
        readFileSync(join(__dirname, 'briefs', 'vanished.md'));
        throw new MalfunctionError('the absent brief was read', {
          path: 'briefs/vanished.md',
        });
      },
    };

    when('[t0] the payload also breaches its budget', () => {
      const attempted = useBeforeAll(async () => {
        const error = await getError(
          assertBootWithinBudget({
            of,
            budget: { tokens: 1 },
            rung: 'halt' as const,
            invocation: 'roles boot --subject alpha --subject beta',
            mode: 'subject' as const,
            coordinates: '--subject alpha --subject beta',
            subjects: rosterWithFault,
          }),
        );
        return {
          error,
          rendered: errSpy.mock.calls.map((call) => String(call[0])).join('\n'),
        };
      });

      // a fault in the re-walk must not downgrade the halt already proven
      then(
        '🔴 the HALT survives — the gate still refuses, with its numbers',
        () => {
          expect(attempted.error).toBeInstanceOf(ConstraintError);
          expect(attempted.error.message).toContain(
            'boot payload exceeds its declared budget',
          );
          expect(attempted.error.message).toMatch(/"budget":\s*1/);
        },
      );

      // the fault costs the PRICES, not the NAMES — only the price needs the walk
      then('🔴 the roster is still NAMED — only the prices are lost', () => {
        expect(attempted.rendered).toContain('alpha');
        expect(attempted.rendered).toContain('beta');
        expect(attempted.rendered).toContain('2 subjects');
      });

      // the anti-failhide assertion: the fault reaches the one party who can act on it
      then(
        'the fault is DISCLOSED, with its own cause, never swallowed',
        () => {
          expect(attempted.rendered).toContain('could not be measured');
          expect(attempted.rendered).toContain('ENOENT');
          expect(attempted.rendered).toContain('vanished.md');
        },
      );

      // the remedy ladder is the whole point of the halt, and it is computed from the MODE
      // rather than from the roster — so a walk fault must not cost it either
      then('the remedy ladder is unchanged — a fault costs no remedy', () => {
        expect(attempted.rendered).toContain('catalogize');
        expect(attempted.rendered).toContain('eliminate');
      });
    });
  });

  /**
   * .what = the other half of the `case2` catch: a `MalfunctionError` rethrows rather than
   *   ride into the halt as a disclosed line
   * .why = an environmental fault sits beside a breach the caller must fix; a
   *   `MalfunctionError` is our defect, and a `ConstraintError` would send the caller to edit a
   *   manifest that was never wrong
   */
  given('[case3] a subject roster whose re-walk raises OUR own defect', () => {
    const rosterMalfunction = {
      inScope: ['alpha', 'beta'],
      genPayloadWithout: async (): Promise<never> => {
        throw new MalfunctionError('token count did not converge', {
          attempts: 3,
        });
      },
    };

    when('[t0] the payload also breaches its budget', () => {
      const attempted = useBeforeAll(async () => {
        const error = await getError(
          assertBootWithinBudget({
            of,
            budget: { tokens: 1 },
            rung: 'halt' as const,
            invocation: 'roles boot --subject alpha --subject beta',
            mode: 'subject' as const,
            coordinates: '--subject alpha --subject beta',
            subjects: rosterMalfunction,
          }),
        );
        return {
          error,
          rendered: errSpy.mock.calls.map((call) => String(call[0])).join('\n'),
        };
      });

      // the teeth: a malfunction here must never fold into the halt as a caller defect
      then(
        '🔴 the MALFUNCTION escapes — it is never reclassified as a caller defect',
        () => {
          expect(attempted.error).toBeInstanceOf(MalfunctionError);
          expect(attempted.error).not.toBeInstanceOf(ConstraintError);
          expect(attempted.error.message).toContain('did not converge');
        },
      );

      // the second teeth: no halt render precedes the rethrow
      then('and NO halt is rendered — the gate emits naught at all', () => {
        expect(attempted.rendered).not.toContain('over budget');
        expect(attempted.rendered).not.toContain('catalogize');
      });
    });
  });

  /**
   * .what = a caller-fixable re-walk fault whose message carries metadata fills ONE tree row
   * .why = a HelpfulError's message appends its serialized metadata on the lines below the
   *   first, and the fault row is a single treestruct line
   */
  given(
    '[case4] a subject roster whose re-walk raises a ConstraintError with metadata',
    () => {
      const rosterConstraint = {
        inScope: ['alpha', 'beta'],
        genPayloadWithout: async (): Promise<never> => {
          throw new ConstraintError('boot.yml has invalid schema', {
            issueMarker: 'zod-issue-detail',
          });
        },
      };

      when('[t0] the payload also breaches its budget', () => {
        const attempted = useBeforeAll(async () => {
          const error = await getError(
            assertBootWithinBudget({
              of,
              budget: { tokens: 1 },
              rung: 'halt' as const,
              invocation: 'roles boot --subject alpha --subject beta',
              mode: 'subject' as const,
              coordinates: '--subject alpha --subject beta',
              subjects: rosterConstraint,
            }),
          );
          return {
            error,
            rendered: errSpy.mock.calls
              .map((call) => String(call[0]))
              .join('\n'),
          };
        });

        then('the halt survives', () => {
          expect(attempted.error).toBeInstanceOf(ConstraintError);
          expect(attempted.error.message).toContain(
            'boot payload exceeds its declared budget',
          );
        });

        then('the fault row names the cause on its one line', () => {
          expect(attempted.rendered).toContain(
            'could not be measured — ✋ ConstraintError: boot.yml has invalid schema',
          );
        });

        then('🔴 the metadata never leaks into the tree', () => {
          expect(attempted.rendered).not.toContain('zod-issue-detail');
        });
      });
    },
  );
});
