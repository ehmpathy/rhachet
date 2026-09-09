import { given, then, when } from 'test-fns';

import { asKeyrackSelectorOrg } from './asKeyrackSelectorOrg';

describe('asKeyrackSelectorOrg', () => {
  given('[case1] the flag was omitted', () => {
    when('[t0] the value is cast', () => {
      then('it yields absent, so the lookup takes the manifest org', () => {
        expect(asKeyrackSelectorOrg({ org: null })).toEqual(undefined);
      });
    });
  });

  given('[case2] `--org @this`', () => {
    when('[t0] the value is cast', () => {
      // .why = THE clamp for r006. verbatim, `@this` reaches the mismatch guard in
      //        getOneKeyrackGrantByKey and throws `org '@this' does not match manifest
      //        org '<x>'` — for the one value that names that very manifest
      then('it yields absent, never the literal sigil', () => {
        expect(asKeyrackSelectorOrg({ org: '@this' })).toEqual(undefined);
      });
    });
  });

  given('[case3] `--org @all`', () => {
    when('[t0] the value is cast', () => {
      // .why = the one value that names NO repo. the lookup's own `@all` branch must see it
      //        to build a machine-wide slug, so an expansion here would break the wish
      then('it passes through untouched', () => {
        expect(asKeyrackSelectorOrg({ org: '@all' })).toEqual('@all');
      });
    });
  });

  given('[case4] a literal org', () => {
    when('[t0] the value is cast', () => {
      then('it passes through untouched', () => {
        expect(asKeyrackSelectorOrg({ org: 'ehmpathy' })).toEqual('ehmpathy');
      });
    });
  });

  given('[case5] an org that merely starts with `@this`', () => {
    when('[t0] the value is cast', () => {
      // .why = the sigil test is an EXACT match, never a prefix. `@thisorg` is a literal org
      //        name, and to swallow it would silently retire the mismatch guard for it
      then('it passes through untouched', () => {
        expect(asKeyrackSelectorOrg({ org: '@thisorg' })).toEqual('@thisorg');
      });
    });
  });
});
