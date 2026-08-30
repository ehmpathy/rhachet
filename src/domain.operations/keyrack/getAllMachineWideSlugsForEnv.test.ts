import { given, then, when } from 'test-fns';

import { genMockKeyrackHostManifest } from '@src/.test/assets/genMockKeyrackHostManifest';

import { getAllMachineWideSlugsForEnv } from './getAllMachineWideSlugsForEnv';

/**
 * .what = unit proof for the machine-wide `@all` slug expander
 * .why = this is the bootstrap-to-clone resolver — it must surface every `@all.{env}.*` key from
 *        the host manifest with NO repo manifest, so a grove can unlock its credentials before any
 *        repo is cloned. a regression here silently breaks the no-manifest bootstrap path.
 */
describe('getAllMachineWideSlugsForEnv', () => {
  const hostManifest = genMockKeyrackHostManifest({
    hosts: {
      '@all.prod.BOOTSTRAP_TOKEN': { org: '@all', env: 'prod' },
      '@all.prod.ANTHROPIC_API_KEY': { org: '@all', env: 'prod' },
      '@all.test.CI_TOKEN': { org: '@all', env: 'test' },
      // a repo-scoped key that must NEVER be surfaced as machine-wide
      'testorg.prod.REPO_KEY': { org: 'testorg', env: 'prod' },
    },
  });

  given('[case1] no key ask (unlock every machine-wide key for an env)', () => {
    when('[t0] env=prod', () => {
      then(
        'returns every @all.prod.* slug, and no repo-scoped or other-env slug',
        () => {
          const slugs = getAllMachineWideSlugsForEnv({
            env: 'prod',
            keyAsk: null,
            hostManifest,
          });
          expect(slugs.sort()).toEqual(
            ['@all.prod.ANTHROPIC_API_KEY', '@all.prod.BOOTSTRAP_TOKEN'].sort(),
          );
          expect(slugs).not.toContain('testorg.prod.REPO_KEY');
          expect(slugs).not.toContain('@all.test.CI_TOKEN');
        },
      );
    });

    when('[t1] env=test', () => {
      then('returns only the @all.test.* slug', () => {
        const slugs = getAllMachineWideSlugsForEnv({
          env: 'test',
          keyAsk: null,
          hostManifest,
        });
        expect(slugs).toEqual(['@all.test.CI_TOKEN']);
      });
    });

    when('[t2] an env with no machine-wide keys', () => {
      then('returns an empty list (never an error)', () => {
        const slugs = getAllMachineWideSlugsForEnv({
          env: 'prep',
          keyAsk: null,
          hostManifest,
        });
        expect(slugs).toEqual([]);
      });
    });
  });

  given('[case2] a key-name ask (unlock one machine-wide key)', () => {
    when('[t0] the key exists for the env', () => {
      then('returns the single matched @all slug', () => {
        const slugs = getAllMachineWideSlugsForEnv({
          env: 'prod',
          keyAsk: 'BOOTSTRAP_TOKEN',
          hostManifest,
        });
        expect(slugs).toEqual(['@all.prod.BOOTSTRAP_TOKEN']);
      });
    });

    when('[t1] the key is absent for the env', () => {
      then('returns an empty list (the caller fails loud on absence)', () => {
        const slugs = getAllMachineWideSlugsForEnv({
          env: 'prod',
          keyAsk: 'NOPE_TOKEN',
          hostManifest,
        });
        expect(slugs).toEqual([]);
      });
    });
  });

  given('[case3] a full slug ask (org.env.key format) that is present', () => {
    when('[t0] the full @all slug is passed directly', () => {
      // .note = it yields the matched entry's own `slug` FIELD, never the ask. for a REACHLESS
      //         entry the two are byte-identical, so this reads as "as-is" — [case4][t2] is the
      //         same door walked with an ADDRESS, where they differ and the field is what matters
      then("returns the matched entry's own slug field", () => {
        const slugs = getAllMachineWideSlugsForEnv({
          env: 'prod',
          keyAsk: '@all.prod.ANTHROPIC_API_KEY',
          hostManifest,
        });
        expect(slugs).toEqual(['@all.prod.ANTHROPIC_API_KEY']);
      });
    });
  });

  given('[case4] entries keyed by an ADDRESS (a key cut at a reach)', () => {
    /**
     * .what = a manifest whose map keys are ADDRESSES, so each key DIFFERS from its `slug` field
     * .why = `hosts` is documented as "map of key ADDRESS to host configuration", and a key cut at
     *        a reach is filed at `slug@reachExid`. every fixture above is reachless, so the map key
     *        and the `slug` field happen to coincide — which is precisely why an address-keyed
     *        entry was never exercised, and why `@all` + `--reach` was left write-only
     * .note = held apart from the shared fixture above on purpose: the 6 cases above must stay
     *         byte-identical, so this manifest may not perturb them (acceptance 2)
     * .note = the SAME slug at TWO reaches — two addresses, one slug. the caller re-applies the
     *         asked reach per slug, so the expander must name the slug once
     */
    const hostManifestAddressed = genMockKeyrackHostManifest({
      hosts: {
        '@all.prep.BRAINS_AUTH@casey@ahction.com': {
          slug: '@all.prep.BRAINS_AUTH',
          org: '@all',
          env: 'prep',
          reach: { exid: 'casey@ahction.com' },
        },
        '@all.prep.BRAINS_AUTH@casey@ahbode.com': {
          slug: '@all.prep.BRAINS_AUTH',
          org: '@all',
          env: 'prep',
          reach: { exid: 'casey@ahbode.com' },
        },
        'testorg.prep.REPO_KEY': { org: 'testorg', env: 'prep' },
      },
    });

    when('[t0] a key-name ask for the reach-cut key', () => {
      // ⚠️ THE clamp for the headline defect. before the repair this yielded [] — the filter
      //    tested EXACT EQUALITY of an ADDRESS against the reachless slug, which can never match
      then('returns the BARE SLUG, never an address', () => {
        const slugs = getAllMachineWideSlugsForEnv({
          env: 'prep',
          keyAsk: 'BRAINS_AUTH',
          hostManifest: hostManifestAddressed,
        });
        expect(slugs).toEqual(['@all.prep.BRAINS_AUTH']);
      });
    });

    when('[t1] no key ask (the bulk path)', () => {
      // ⚠️ THE clamp for the quiet half. before the repair this returned both ADDRESSES, which
      //    the caller then fed forward as slugs — so the reach landed on them a SECOND time
      //
      // .note = this ONE equality carries both bound properties, so neither needs an assertion
      //         of its own: a single element proves the DEDUPE, and its exact value proves NO
      //         REACH RIDES THE RETURN — the invariant the caller leans on when it re-applies
      //         the asked reach per slug. a second `includes('@casey')` assertion beside it
      //         could never disagree with this one, so it clamped no edge this does not
      then('returns the slug ONCE, deduped across its two reaches', () => {
        const slugs = getAllMachineWideSlugsForEnv({
          env: 'prep',
          keyAsk: null,
          hostManifest: hostManifestAddressed,
        });
        expect(slugs).toEqual(['@all.prep.BRAINS_AUTH']);
      });
    });

    /**
     * .what = a full SLUG ask (no reach) against a manifest that holds the key ONLY at reaches
     * .why = `KeyrackKeyAsk` sanctions both forms — "the CLI accepts both formats for
     *        ergonomics" — and `invokeKeyrack.ts:1618` passes `--key` through with no
     *        normalization, so a human who copy-pastes the `slug` field out of `keyrack list`
     *        arrives here. the shortcut misses (the map is ADDRESS-keyed and holds no reachless
     *        twin), and the tail then rebuilt `@all.{env}.{keyAsk}` on an ask that ALREADY
     *        carried the prefix — `@all.prep.@all.prep.BRAINS_AUTH`, which can never match
     * .note = ⚠️ a latent defect the REACH feature switched on. pre-reach the map was
     *         slug-keyed, so the shortcut always hit and the tail's double-prefix was dead
     *         code; once the map became address-keyed, a miss could also mean "held, but only
     *         at a reach" — and the dead code went live and wrong. it is the wish's own
     *         silent-wrong-answer shape, reached through a different door
     */
    when(
      '[t4] a full SLUG (no reach) is asked for a reach-cut-only key',
      () => {
        then('returns the slug — never [] for a key that IS held', () => {
          const slugs = getAllMachineWideSlugsForEnv({
            env: 'prep',
            keyAsk: '@all.prep.BRAINS_AUTH',
            hostManifest: hostManifestAddressed,
          });
          expect(slugs).toEqual(['@all.prep.BRAINS_AUTH']);
        });
      },
    );

    when('[t5] a full slug that the manifest genuinely does NOT hold', () => {
      // .note = the guard against an over-broad repair: the normalization must never make an
      //         absent key come back. absence still reports absence
      then('returns an empty list', () => {
        const slugs = getAllMachineWideSlugsForEnv({
          env: 'prep',
          keyAsk: '@all.prep.NOPE_TOKEN',
          hostManifest: hostManifestAddressed,
        });
        expect(slugs).toEqual([]);
      });
    });

    when('[t2] a full ADDRESS is passed as the ask', () => {
      // ⚠️ the full-ask shortcut indexes this ADDRESS-keyed map directly, so it is the last door
      //    through which an address could leave this function dressed as a slug. it is reachable:
      //    a human may name the address they read out of `keyrack list`
      then('returns the BARE SLUG, never the address it was asked by', () => {
        const slugs = getAllMachineWideSlugsForEnv({
          env: 'prep',
          keyAsk: '@all.prep.BRAINS_AUTH@casey@ahction.com',
          hostManifest: hostManifestAddressed,
        });
        expect(slugs).toEqual(['@all.prep.BRAINS_AUTH']);
      });
    });

    /**
     * .what = the fixture generator refuses a reach-cut address whose `slug` was left to default
     * .why = the default is `slug ?? address`, so an entry filed WITHOUT an explicit slug lands
     *        with `slug === address` — and this expander would then hand that ADDRESS back as a
     *        slug, which the caller re-reaches, to rebuild the doubled-address write-only
     *        credential this whole repair exists to kill. prod cannot reach that state (the dao's
     *        schema + `assertKeyrackHostAddressed` refuse it at load) but a FIXTURE bypasses both
     * .note = without this clamp the guard is an unverified claim: every case above passes an
     *         explicit slug, so a guard that never fired would look identical
     */
    when('[t3] a reach-cut address is filed with no explicit slug', () => {
      then('the fixture generator fails loud, and names the fix', () => {
        expect(() =>
          genMockKeyrackHostManifest({
            hosts: {
              '@all.prep.BRAINS_AUTH@casey@ahction.com': {
                org: '@all',
                env: 'prep',
                reach: { exid: 'casey@ahction.com' },
              },
            },
          }),
        ).toThrow(/needs its `slug` declared/);
      });
    });
  });
});
