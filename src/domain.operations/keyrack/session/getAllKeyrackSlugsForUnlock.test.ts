import { getError, given, then, when } from 'test-fns';

import { genMockKeyrackHostManifest } from '@src/.test/assets/genMockKeyrackHostManifest';
import { genMockKeyrackRepoManifest } from '@src/.test/assets/genMockKeyrackRepoManifest';

import { getAllKeyrackSlugsForUnlock } from './getAllKeyrackSlugsForUnlock';

/**
 * .what = the direct clamp on the three scopes one `unlock` ask can sweep
 * .why = these branches were reachable ONLY through a daemon-bound async unlock while they lived
 *        as an inline IIFE, so the decision a human most wants to check was the one hardest to
 *        exercise. the extraction buys unit reach; this file is what SPENDS it — a move that
 *        yields no new test has only relocated the code
 *
 * .note = every row below runs with no daemon, no socket, and no temp repo. that is the whole
 *         property under test as much as any single assertion is
 */
describe('getAllKeyrackSlugsForUnlock', () => {
  const hostManifest = genMockKeyrackHostManifest({
    hosts: {
      '@all.camp.GITHUB_TOKEN': { env: 'camp', org: '@all' },
      '@all.prep.SHARED_TOKEN': { env: 'prep', org: '@all' },
      'ehmpathy.sudo.LAPTOP_PW': { env: 'sudo', org: 'ehmpathy' },
    },
  });

  const repoManifest = genMockKeyrackRepoManifest({
    org: 'ehmpathy',
    envs: ['prep'],
    keys: {
      'ehmpathy.prep.AWS_PROFILE': { env: 'prep', name: 'AWS_PROFILE' },
    },
  });

  given('[case1] a repo manifest and machine-wide keys in the same env', () => {
    when('[t0] no --org filter is named', () => {
      const slugs = getAllKeyrackSlugsForUnlock({
        env: 'prep',
        keyAsk: null,
        repoManifest,
        hostManifest,
        orgFilter: null,
      });

      // ⚠️ .why = this row is the one that must never change. the union IS the extant default,
      //        and an `@this` default would silently drop every machine-wide key from the sweep
      then(
        'the swept set is the UNION — repo keys and machine-wide keys',
        () => {
          expect(slugs).toContain('ehmpathy.prep.AWS_PROFILE');
          expect(slugs).toContain('@all.prep.SHARED_TOKEN');
        },
      );
    });

    when('[t1] --org @all narrows to the box', () => {
      const slugs = getAllKeyrackSlugsForUnlock({
        env: 'prep',
        keyAsk: null,
        repoManifest,
        hostManifest,
        orgFilter: '@all',
      });

      then('only the machine-wide key survives', () => {
        expect(slugs).toEqual(['@all.prep.SHARED_TOKEN']);
      });
    });

    when('[t2] --org resolves to the repo org', () => {
      const slugs = getAllKeyrackSlugsForUnlock({
        env: 'prep',
        keyAsk: null,
        repoManifest,
        hostManifest,
        orgFilter: 'ehmpathy',
      });

      then('only the repo key survives', () => {
        expect(slugs).toEqual(['ehmpathy.prep.AWS_PROFILE']);
      });
    });

    when('[t3] --org names an org that is neither', () => {
      const slugs = getAllKeyrackSlugsForUnlock({
        env: 'prep',
        keyAsk: null,
        repoManifest,
        hostManifest,
        orgFilter: 'otherorg',
      });

      // .why = the honest answer to "keys of otherorg" is an empty set. a per-sigil branch would
      //        have had no arm for this ask and would have fallen through to the repo's own keys
      then(
        'the answer is an empty set, never this repo under another name',
        () => {
          expect(slugs).toEqual([]);
        },
      );
    });
  });

  given('[case2] NO repo manifest — the machine-wide bootstrap path', () => {
    when('[t0] an env is named', () => {
      const slugs = getAllKeyrackSlugsForUnlock({
        env: 'camp',
        keyAsk: null,
        repoManifest: null,
        hostManifest,
        orgFilter: null,
      });

      then('the machine-wide keys for that env unlock with no manifest', () => {
        expect(slugs).toEqual(['@all.camp.GITHUB_TOKEN']);
      });
    });

    when('[t1] no env is named', () => {
      const error = getError(() =>
        getAllKeyrackSlugsForUnlock({
          env: null,
          keyAsk: null,
          repoManifest: null,
          hostManifest,
          orgFilter: null,
        }),
      );

      // .why = with no manifest there is no env to default from, so the ask is under-specified.
      //        it is the caller's to fix ⇒ a ConstraintError that renders blocked at exit 2
      then('it refuses loud, and names the fix', () => {
        expect(error.message).toContain('requires --env');
      });
    });

    when('[t2] a machine-wide key is named but absent', () => {
      const error = getError(() =>
        getAllKeyrackSlugsForUnlock({
          env: 'camp',
          keyAsk: 'ABSENT_KEY',
          repoManifest: null,
          hostManifest,
          orgFilter: null,
        }),
      );

      then('it refuses loud rather than unlock an empty set', () => {
        expect(error.message).toContain('machine-wide key not found');
      });
    });
  });

  given('[case3] a sudo ask', () => {
    when('[t0] a key is named', () => {
      const slugs = getAllKeyrackSlugsForUnlock({
        env: 'sudo',
        keyAsk: 'LAPTOP_PW',
        repoManifest,
        hostManifest,
        orgFilter: null,
      });

      then('the sudo slug resolves', () => {
        expect(slugs).toEqual(['ehmpathy.sudo.LAPTOP_PW']);
      });
    });

    when('[t1] no key is named', () => {
      const error = getError(() =>
        getAllKeyrackSlugsForUnlock({
          env: 'sudo',
          keyAsk: null,
          repoManifest,
          hostManifest,
          orgFilter: null,
        }),
      );

      // .why = a sudo credential is named, never swept — a bulk sudo unlock would grant far more
      //        than any one ask intends
      then('it refuses loud', () => {
        expect(error.message).toContain('sudo credentials require --key');
      });
    });
  });

  given('[case5] a bare ask, whose env the manifest never declares', () => {
    // ⚠️ .why = the one scene where `input.env` and the derived env DIVERGE. with `--env`
    //        omitted and `manifest.envs` empty, `assertKeyrackEnvIsSpecified` yields `all`
    //        while `input.env` stays null — so a refusal that reads `input.env` renders
    //        `for env=null` and a `--env null` a human cannot paste back, in the SAME sentence
    //        that names `@all.all.FOO`. one sentence, two envs
    // ⚠️ .why.clamp = a refusal is exercised by every earlier row too, so a bare "it throws"
    //        assertion would have passed throughout the defect. these rows assert the CONTENT,
    //        and one asserts an ABSENCE — the only shape that catches a null that renders
    const manifestEnvless = genMockKeyrackRepoManifest({
      org: 'ehmpathy',
      envs: [],
      keys: {},
    });

    when('[t0] a key is asked that no manifest declares', () => {
      const error = getError(() =>
        getAllKeyrackSlugsForUnlock({
          env: null,
          keyAsk: 'ABSENT_KEY',
          repoManifest: manifestEnvless,
          hostManifest,
          orgFilter: null,
        }),
      );

      then('the refusal names the DERIVED env, never a null', () => {
        expect(error.message).toContain('ABSENT_KEY');
        expect(JSON.stringify(error)).toContain('env=all');
      });

      then('and it never renders the word null anywhere a human reads', () => {
        // ⚠️ the assertion that bites. `env=null` and `--env null` both read as literal
        //    text, so only a NEGATIVE clamp on that text catches them
        expect(JSON.stringify(error)).not.toContain('null');
      });

      then('so the fix it names is one a human can paste back verbatim', () => {
        expect(JSON.stringify(error)).toContain(
          'rhx keyrack set --key ABSENT_KEY --env all',
        );
      });
    });
  });

  given('[case4] a KEYED ask whose key the --org filter excludes', () => {
    // ⚠️ .why = the filter-empty and the absent-key are the same EMPTY SET, so the extant
    //        not-found refusals would claim a key the box HOLDS is absent — and send a human to
    //        `keyrack set` to re-mint a credential they already have. on a SWEEP the empty set is
    //        the honest answer; on a keyed ask it is a falsehood, so the two cases must split
    when('[t0] the key is machine-wide but --org names the repo org', () => {
      const error = getError(() =>
        getAllKeyrackSlugsForUnlock({
          env: 'prep',
          keyAsk: 'SHARED_TOKEN',
          repoManifest,
          hostManifest,
          orgFilter: 'ehmpathy',
        }),
      );

      then('it says the FILTER excluded it, never that it is absent', () => {
        expect(error.message).toContain('excluded by --org filter');
        expect(error.message).not.toContain('not found');
      });

      then(
        'it names the org that holds it, so the flag can be corrected',
        () => {
          expect(JSON.stringify(error)).toContain('@all');
        },
      );
    });

    when('[t1] the key is repo-scoped but --org is @all', () => {
      const error = getError(() =>
        getAllKeyrackSlugsForUnlock({
          env: 'prep',
          keyAsk: 'AWS_PROFILE',
          repoManifest,
          hostManifest,
          orgFilter: '@all',
        }),
      );

      then('it says the FILTER excluded it', () => {
        expect(error.message).toContain('excluded by --org filter');
        expect(error.message).not.toContain('not found');
      });
    });

    when('[t2] a sudo key is named but --org excludes its org', () => {
      const error = getError(() =>
        getAllKeyrackSlugsForUnlock({
          env: 'sudo',
          keyAsk: 'LAPTOP_PW',
          repoManifest,
          hostManifest,
          orgFilter: '@all',
        }),
      );

      then('it says the FILTER excluded it, never "sudo key not found"', () => {
        expect(error.message).toContain('excluded by --org filter');
        expect(error.message).not.toContain('sudo key not found');
      });
    });

    when('[t3] the key is genuinely absent, under a filter', () => {
      const error = getError(() =>
        getAllKeyrackSlugsForUnlock({
          env: 'prep',
          keyAsk: 'ABSENT_KEY',
          repoManifest,
          hostManifest,
          orgFilter: '@all',
        }),
      );

      // .why = the not-found refusal is CORRECT here, and this fix must not soften it
      then('the not-found refusal still stands', () => {
        expect(error.message).toContain('not found');
        expect(error.message).not.toContain('excluded by --org filter');
      });
    });

    when('[t4] a SWEEP is emptied by the filter', () => {
      const slugs = getAllKeyrackSlugsForUnlock({
        env: 'prep',
        keyAsk: null,
        repoManifest,
        hostManifest,
        orgFilter: 'otherorg',
      });

      // .why = the empty set IS the honest answer to "keys of otherorg" — a sweep must not be
      //        dragged into the keyed-ask refusal
      then('it still yields an empty set rather than a refusal', () => {
        expect(slugs).toEqual([]);
      });
    });
  });
});
