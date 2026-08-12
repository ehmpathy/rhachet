import { getError, given, then, when } from 'test-fns';

import { asKeyrackKeyReachFromFlag } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReachFromFlag';

/**
 * .what = clamps the flag-side twin of `asKeyrackKeyReachField` — the parse five cli commands
 *         shared as a hand-written ternary before it had one home
 * .why = the expression was identical at `get`, `source`, `set`, `del` and `unlock`, so a
 *        change to the parse, its error, or its validation had five sites to keep in step. one
 *        home means one place it can be got wrong, and this file is the test that guards it
 *
 * .note = ⚠️ `[case1]` is the half that carries e1. an absent flag must yield `undefined` and
 *         NOT `null` — the whole omit-when-absent rule downstream (`asKeyrackKeyReachField`,
 *         and through it every json render and the encrypted host manifest) rests on an
 *         absence that reads as `undefined`. a helper that normalized to `null` here would
 *         satisfy a naive "no reach" read and break every reachless payload one layer down
 */
describe('asKeyrackKeyReachFromFlag', () => {
  given('[case1:e1] the --reach flag was not passed', () => {
    when('[t0] the flag is absent from the opts object', () => {
      then('the reach is undefined, never null', () => {
        const reach = asKeyrackKeyReachFromFlag({});
        expect(reach).toBeUndefined();
        // ⚠️ the strict half: `toBeUndefined` passes for `undefined` only, but a future
        //    `?? null` would be caught here rather than three layers downstream
        expect(reach).not.toBeNull();
      });
    });

    when(
      '[t1] the flag is present but empty — the shape commander hands back',
      () => {
        // an unset commander option arrives as `undefined`; an empty string is what a
        // `--reach ''` produces, and both mean "no reach was named"
        then('an empty exid is treated as absent, never parsed', () => {
          expect(asKeyrackKeyReachFromFlag({ flag: '' })).toBeUndefined();
        });

        then('an explicit undefined behaves as an absent key does', () => {
          expect(
            asKeyrackKeyReachFromFlag({ flag: undefined }),
          ).toBeUndefined();
        });
      },
    );
  });

  given('[case2] the --reach flag names a reach', () => {
    when('[t0] a plaintext exid is passed', () => {
      then('it parses into a reach that carries the exid verbatim', () => {
        const reach = asKeyrackKeyReachFromFlag({ flag: 'beav@ehmpathy.com' });
        expect(reach).toBeDefined();
        expect(reach!.exid).toEqual('beav@ehmpathy.com');
      });

      // .note = an exid is PLAINTEXT and keyrack reads no sense into it. a bare word is a
      //         LEGAL exid, not a malformed uri — the scheme convention lives in the one
      //         mech that needs an org (`asGithubOrgFromReach`), never in this parse
      then('a bare word is a legal exid — no scheme is required here', () => {
        expect(asKeyrackKeyReachFromFlag({ flag: 'ehmpathy' })?.exid).toEqual(
          'ehmpathy',
        );
      });
    });
  });

  given('[case3] the flag holds an exid the domain refuses', () => {
    when('[t0] the exid is whitespace only', () => {
      // ⚠️ THE reason this parse sits at the cli boundary: it must fail against the flag a
      //    human just typed, never deep in a vault call whose error names a different cause
      then('it throws rather than yields a reach', async () => {
        const found = await getError(
          (async () => asKeyrackKeyReachFromFlag({ flag: '   ' }))(),
        );
        expect(found).toBeDefined();
      });
    });
  });
});
