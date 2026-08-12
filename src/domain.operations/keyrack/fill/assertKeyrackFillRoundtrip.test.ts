import { MalfunctionError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import type { KeyrackGrantAttempt } from '@src/domain.objects/keyrack';

import { assertKeyrackFillRoundtrip } from './assertKeyrackFillRoundtrip';

/**
 * .what = clamps that a failed `fill` roundtrip halts the run, as the defect it is
 * .why = the class this throw carries decides the exit code a human sees — a
 *        MalfunctionError is exit 1 (a defect in keyrack), a ConstraintError is exit 2
 *        (a setup gap the caller closes). the two read as opposite instructions, and no
 *        compiler checks that the class matches the message's own claim
 *        (rule.require.exit-code-semantics)
 * .note = `[case2]`'s class assertion is the clamp. it goes red the moment this throw is
 *         reclassified toward the caller-fixable family
 * .note = a third case stood here until 2026-08-05 and is now retired rather than moved.
 *         it handed the raised error to `fill`'s `prefer` skip-allowlist and asserted the
 *         allowlist rejected it — a real pair while `prefer` existed, since a swallow
 *         there rendered a self-declared defect as a benign yellow line. `prefer` is gone,
 *         so `fill` holds no catch this throw can reach, and the assertion had no pair
 *         left to hold together. an assertion that cannot bite is worse than absent — it
 *         reads as protection while it guards no defect
 */
describe('assertKeyrackFillRoundtrip', () => {
  const anAttempt = (
    status: KeyrackGrantAttempt['status'],
  ): KeyrackGrantAttempt =>
    status === 'granted'
      ? ({ status: 'granted', grant: {} as never } as KeyrackGrantAttempt)
      : status === 'blocked'
        ? ({
            status: 'blocked',
            slug: 'ehmpathy.test.FOO',
            reasons: ['nope'],
          } as KeyrackGrantAttempt)
        : ({
            status,
            slug: 'ehmpathy.test.FOO',
            message: 'not here',
          } as KeyrackGrantAttempt);

  given('[case1] the key reads back after it was set and unlocked', () => {
    when('[t0] the attempt is granted', () => {
      then('it does not throw — the happy path is silent', () => {
        expect(() =>
          assertKeyrackFillRoundtrip({
            attempt: anAttempt('granted'),
            keyName: 'FOO',
            slug: 'ehmpathy.test.FOO',
            owner: 'ehmpath',
            resultsSoFar: [],
          }),
        ).not.toThrow();
      });
    });
  });

  given('[case2] the key cannot be read back', () => {
    // every non-granted status means the same impossible thing here: we wrote it, we
    // unlocked it, and we cannot see it
    const statuses = ['absent', 'locked', 'blocked'] as const;

    statuses.forEach((status) => {
      when(`[t0] the attempt is ${status}`, () => {
        then(
          'it throws a MalfunctionError — a defect, never a setup gap',
          async () => {
            const error = await getError(async () =>
              assertKeyrackFillRoundtrip({
                attempt: anAttempt(status),
                keyName: 'FOO',
                slug: 'ehmpathy.test.FOO',
                owner: 'ehmpath',
                resultsSoFar: [],
              }),
            );
            expect(error).toBeInstanceOf(MalfunctionError);
          },
        );

        then('the message names the status it actually saw', async () => {
          const error = await getError(async () =>
            assertKeyrackFillRoundtrip({
              attempt: anAttempt(status),
              keyName: 'FOO',
              slug: 'ehmpathy.test.FOO',
              owner: 'ehmpath',
              resultsSoFar: [],
            }),
          );
          expect(error.message).toContain('roundtrip verification failed');
          expect(error.message).toContain(`status=${status}`);
          expect(error.message).toContain('FOO');
        });
      });
    });
  });

  /**
   * .what = r011's item 3 — a mid-loop halt must not discard the work already done
   * .why = `fill`'s loop is `keys × owners × reaches`. before this, a halt on the last
   *        target reported only WHICH target failed, so the N already vaulted became
   *        invisible to a programmatic caller — work that happened, reported as if it had
   *        not (`rule.require.failloud`). the human path was never affected: the tree had
   *        already printed a ✓ per target
   *
   * .note = this is the half of r011's ask that is SEPARABLE. items 1–2 (the
   *         `unlockOneKeyrackSlugAtReach` decomposition) change every unlock path in the
   *         repo and stay the wisher's call; this one is metadata on a throw, and it needed
   *         no part of that refactor
   * .note = `resultsSoFar` is REQUIRED, never optional, and that is the clamp's other half.
   *         an optional field lets a new call site omit it in silence — which is precisely
   *         the shape of the gap being closed. the compiler caught all three extant call
   *         sites the moment it was added
   */
  given('[case3] targets were provisioned before the halt fired', () => {
    const resultsSoFar = [
      { slug: 'ehmpathy.test.FOO', owner: 'ehmpath', status: 'set' as const },
      {
        slug: 'ehmpathy.test.FOO',
        owner: 'ehmpath',
        reach: { exid: 'beav@ehmpathy.com' },
        status: 'set' as const,
      },
    ];

    when('[t0] the roundtrip fails at a later target', () => {
      const raise = async () =>
        await getError(async () =>
          assertKeyrackFillRoundtrip({
            attempt: anAttempt('absent'),
            keyName: 'FOO',
            slug: 'ehmpathy.test.FOO',
            owner: 'ehmpath',
            reach: { exid: 'vlad@ehmpathy.com' },
            resultsSoFar,
          }),
        );

      // THE clamp. without it the caller sees a bare message and cannot tell whether the
      // run provisioned none of its targets or nearly all of them
      then('the error carries every target already provisioned', async () => {
        const error = await raise();
        expect(
          (error as { metadata?: Record<string, unknown> }).metadata,
        ).toMatchObject({ resultsSoFar });
      });

      // the count rides beside the array because a rendered error line truncates the array
      then('the error states how many, as a bare number', async () => {
        const error = await raise();
        expect(
          (error as { metadata?: Record<string, unknown> }).metadata,
        ).toMatchObject({ resultsSoFarCount: 2 });
      });

      // the second half of the fix: a slug names ALL of a key's reaches, so the slug
      // alone cannot say which one failed
      then(
        'the error names WHICH reach failed, not just the slug',
        async () => {
          const error = await raise();
          expect(
            (error as { metadata?: Record<string, unknown> }).metadata,
          ).toMatchObject({ reach: { exid: 'vlad@ehmpathy.com' } });
        },
      );
    });

    when('[t1] the roundtrip succeeds', () => {
      then('no halt fires, so no report is owed', () => {
        expect(() =>
          assertKeyrackFillRoundtrip({
            attempt: anAttempt('granted'),
            keyName: 'FOO',
            slug: 'ehmpathy.test.FOO',
            owner: 'ehmpath',
            reach: { exid: 'vlad@ehmpathy.com' },
            resultsSoFar,
          }),
        ).not.toThrow();
      });
    });
  });
});
