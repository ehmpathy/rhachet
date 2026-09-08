import { given, then, when } from 'test-fns';

import { asKeyrackAskFor } from './asKeyrackAskFor';

describe('asKeyrackAskFor', () => {
  given('[case1] `--for repo`', () => {
    when('[t0] the ask is cast', () => {
      then('it names the whole repo', () => {
        expect(asKeyrackAskFor({ for: 'repo', key: null })).toEqual({
          repo: true,
        });
      });
    });
  });

  given('[case2] `--key FOO`', () => {
    when('[t0] the ask is cast', () => {
      then('it names exactly that key', () => {
        expect(asKeyrackAskFor({ for: null, key: 'FOO' })).toEqual({
          keys: ['FOO'],
        });
      });
    });
  });

  given('[case3] BOTH `--for repo` and `--key FOO`', () => {
    when('[t0] the ask is cast', () => {
      // ⚠️ .why = the precedence clamp. `--for repo` outranks `--key`, and the downstream
      //        hint reasons from that same order (the `get` verb in `invokeKeyrack.ts` reports
      //        `keyed: false` for this ask). to flip it would silently narrow a sweep the
      //        human asked for to the one key they named beside it
      then('the sweep wins — the explicit ask outranks the key', () => {
        expect(asKeyrackAskFor({ for: 'repo', key: 'FOO' })).toEqual({
          repo: true,
        });
      });
    });
  });

  given('[case4] a bare ask — neither flag', () => {
    when('[t0] the ask is cast', () => {
      // .why = null, never a default. what a bare ask denotes differs per verb (`get` reads it
      //        as unstated; a bare `source` is a repo sweep), so the cast refuses to pick
      then('it yields null, so the verb states its own default', () => {
        expect(asKeyrackAskFor({ for: null, key: null })).toEqual(null);
      });
    });
  });

  given('[case5] a `--for` value that is not `repo`', () => {
    when('[t0] the ask is cast with a key beside it', () => {
      // .why = only the literal `repo` names a sweep. `--for` doubles as an alias for --owner
      //        on other verbs, so a stray value must not be read as a sweep request
      then('the key wins — only `repo` names a sweep', () => {
        expect(asKeyrackAskFor({ for: 'ehmpath', key: 'FOO' })).toEqual({
          keys: ['FOO'],
        });
      });
    });
  });
});
