import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { assertKeyrackReachRequiresKey } from './assertKeyrackReachRequiresKey';

/**
 * .what = the shared "a reach requires a key" invariant, tested at its one home
 * .why = four call sites hand-authored this rule before it had a home, and each phrased it its
 *        own way. a test AT the assertion is what keeps the next caller from authoring a fifth:
 *        the rule now has one place to read and one place to break
 *
 * .note = the four callers each keep their own coverage of the WIRE-UP (that they pass the
 *         right `keyed`). this file covers the RULE. neither substitutes for the other — a
 *         caller that passed `keyed: true` unconditionally would be green here and wrong there
 */
describe('assertKeyrackReachRequiresKey', () => {
  const hint = 'name the key — rhx keyrack get --key $KEY --reach $EXID';

  given('[case1] no reach is asked for', () => {
    // e1: the reachless path is every call that exists today. it must take zero new branches,
    // which means it must not care what `keyed` says
    when('[t0] the ask is keyed', () => {
      then('it passes', () => {
        expect(() =>
          assertKeyrackReachRequiresKey({ keyed: true, hint }),
        ).not.toThrow();
      });
    });

    when('[t1] the ask is a bulk sweep', () => {
      then('it passes — a bulk sweep is ordinary without a reach', () => {
        expect(() =>
          assertKeyrackReachRequiresKey({ keyed: false, hint }),
        ).not.toThrow();
      });
    });

    // .note = `null` arrives here from callers whose reach is nullable rather than optional.
    //         it must read as "no reach", never as "a reach named null"
    when('[t2] the reach is explicitly null', () => {
      then('it passes — null is an absent reach, not a named one', () => {
        expect(() =>
          assertKeyrackReachRequiresKey({ reach: null, keyed: false, hint }),
        ).not.toThrow();
      });
    });
  });

  given('[case2] a reach is asked for, alongside a key', () => {
    when('[t0] the invariant is checked', () => {
      then('it passes — this is exactly what a reach is for', () => {
        expect(() =>
          assertKeyrackReachRequiresKey({
            reach: { exid: 'beav@ehmpathy.com' },
            keyed: true,
            hint,
          }),
        ).not.toThrow();
      });
    });
  });

  given('[case3] a reach is asked for across a bulk sweep', () => {
    const runIt = (): void =>
      assertKeyrackReachRequiresKey({
        reach: { exid: 'beav@ehmpathy.com' },
        keyed: false,
        hint,
      });

    when('[t0] the invariant is checked', () => {
      then('it refuses — never narrows the sweep silently', async () => {
        const error = await getError(runIt);
        expect(error).toBeInstanceOf(ConstraintError);
      });

      // ConstraintError is a CONTRACT, not decoration: it carries exit 2 (caller-fixable).
      // a MalfunctionError here would tell a caller who reads `$?` that their own typo was a
      // defect in keyrack (rule.require.exit-code-semantics)
      then('the refusal is caller-fixable, never a malfunction', async () => {
        const error = await getError(runIt);
        expect(error.constructor.name).toEqual('ConstraintError');
      });

      then('the message names the flag and the reason', async () => {
        const error = await getError(runIt);
        expect(error.message).toContain('--reach requires a key');
        expect(error.message).toContain('identity axis of ONE key');
      });

      // the reach is echoed so a human sees WHICH exid they named — with several reaches in
      // play, "a reach" alone would leave them to guess which call was refused
      then('the exid is echoed back to the human', async () => {
        const error = await getError(runIt);
        expect(error.message).toContain('beav@ehmpathy.com');
      });

      // THE reason the hint is per-caller rather than shared. a human copy-pastes this line,
      // so it must name the command they actually ran
      then('the caller-supplied hint reaches the human intact', async () => {
        const error = await getError(runIt);
        expect(error.message).toContain(hint);
      });

      then('the whole refusal is snapped', async () => {
        const error = await getError(runIt);
        expect(error.message).toMatchSnapshot();
      });
    });
  });

  given('[case4] two callers refuse the same shape', () => {
    // ⚠️ THE clamp this file exists for. the defect was four copies with four texts, so the
    // guarantee is not merely "it throws" — it is that every caller throws the SAME sentence.
    // a future site that re-hand-authored the message would go red here
    when('[t0] each supplies its own hint', () => {
      then('the message is identical; only the hint differs', async () => {
        const errorFromGet = await getError(() =>
          assertKeyrackReachRequiresKey({
            reach: { exid: 'beav@ehmpathy.com' },
            keyed: false,
            hint: 'name the key — rhx keyrack get --key $KEY --reach $EXID',
          }),
        );
        const errorFromUnlock = await getError(() =>
          assertKeyrackReachRequiresKey({
            reach: { exid: 'beav@ehmpathy.com' },
            keyed: false,
            hint: 'name the key — rhx keyrack unlock --env prep --key $KEY --reach $EXID',
          }),
        );

        // the shared half — the sentence before the metadata block
        const asSentence = (message: string): string =>
          message.split('\n')[0] ?? '';
        expect(asSentence(errorFromGet.message)).toEqual(
          asSentence(errorFromUnlock.message),
        );

        // the per-caller half — each names its own command
        expect(errorFromGet.message).toContain('keyrack get');
        expect(errorFromUnlock.message).toContain('keyrack unlock');
      });
    });
  });
});
