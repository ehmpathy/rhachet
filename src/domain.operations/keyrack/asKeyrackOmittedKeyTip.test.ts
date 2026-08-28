import { given, then, when } from 'test-fns';

import { genMockKeyrackHostManifest } from '@src/.test/assets/genMockKeyrackHostManifest';

import { asKeyrackOmittedKeyTip } from './asKeyrackOmittedKeyTip';

/**
 * .what = clamps that an omitted key's tip names the move that ACTUALLY helps, which inverts
 *         on TWO axes: whether the manifest holds the slug at a reach, and what CAUSED the
 *         omission
 * .why = the tip is the one line a human copy-pastes. for a key held only at reaches, the
 *        reachless `set` tip is not merely unhelpful — obeyed literally it cuts a reachless
 *        TWIN under a slug already cut at reaches, and the unlock still fails afterwards
 *        (`rule.require.errors-name-the-fix`, `rule.forbid.friction-hazards`)
 * .note = four peer reviewers raised this independently (r1, r8, r9, r10). r1 added the grain
 *         half: from a repo whose manifest names an org, the tipped `set` files the twin at
 *         TREE grain when the ask needed GROVE grain (`rule.require.org-scope-grain-hardcut`)
 * .note = the REASON axis came from r7+r9 at i011: a reach-held key omitted as `lost` or
 *         `remote` is a fault of the STORE, so `unlock --reach` re-runs the read that just
 *         failed. only `absent` — the ask could not see it — wants the reach tip
 */
describe('asKeyrackOmittedKeyTip', () => {
  given('[case1] a slug the manifest holds ONLY at reaches', () => {
    const hostManifest = genMockKeyrackHostManifest({
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
      },
    });

    when('[t0] the tip is built for an `absent` omission', () => {
      const tip = asKeyrackOmittedKeyTip({
        slug: '@all.prep.BRAINS_AUTH',
        reason: 'absent',
        hostManifest,
      });

      // ⛔ THE CLAMP. the extant unconditional tip renders the `set` form here, so this is RED
      //    before the repair — and a human who obeyed it cut a third, reachless twin
      then('it never tips toward a reachless `set`', () => {
        expect(tip).not.toContain('keyrack set');
      });

      then('it names the move that actually works — unlock AT a reach', () => {
        expect(tip).toContain(
          'rhx keyrack unlock --key BRAINS_AUTH --env prep --reach casey@ahbode.com',
        );
      });

      // ⛔ THE PEER-DISCLOSURE CLAMP. a command may name only ONE reach, but this rack holds
      //    TWO. to name one in silence reads as "this key has one reach" — an unambiguous
      //    claim, and a false one (`rule.forbid.ambiguous-labels`). the human must see the
      //    whole set to pick their own account, never obey a pick made for them
      then('it discloses the peer reaches the command could not name', () => {
        expect(tip).toEqual(
          'rhx keyrack unlock --key BRAINS_AUTH --env prep --reach casey@ahbode.com  # also cut at: casey@ahction.com',
        );
      });

      // ⛔ THE PASTE CLAMP. a tip is the ONE line a human copy-pastes, so the disclosure must
      //    not travel with the paste as stray positional args — the tool's own hint would fail
      //    the moment it is used, the "actively harmful help" class
      //    `rule.forbid.friction-hazards` grades worst. behind a `#` it is visible to the
      //    reader and invisible to the shell
      then('the whole line stays runnable when pasted', () => {
        const beforeComment = tip.split('#')[0]!.trim();
        expect(beforeComment).toEqual(
          'rhx keyrack unlock --key BRAINS_AUTH --env prep --reach casey@ahbode.com',
        );
        expect(tip).toContain('#');
      });

      // ⚠️ deterministic across runs: the reaches are sorted, so one rack renders one tip.
      //    absent the sort, map-iteration order would make this snapshot-hostile
      then('it picks the same reach on every run', () => {
        expect(
          asKeyrackOmittedKeyTip({
            slug: '@all.prep.BRAINS_AUTH',
            reason: 'absent',
            hostManifest,
          }),
        ).toEqual(tip);
      });
    });

    // ⛔ THE REASON GATE. `lost` and `remote` are faults of the STORE, not of the ask — an
    //    `unlock --reach` re-runs the read that just failed and omits the key again for the
    //    same cause. to tip it would be the very misdirection this transformer exists to end
    when('[t1] the SAME key is omitted as `lost` or `remote`', () => {
      then(
        'it never tips `unlock --reach`, which cannot cure either cause',
        () => {
          for (const reason of ['lost', 'remote'] as const)
            expect(
              asKeyrackOmittedKeyTip({
                slug: '@all.prep.BRAINS_AUTH',
                reason,
                hostManifest,
              }),
            ).not.toContain('keyrack unlock');
        },
      );

      // ⛔ THE TWIN CLAMP, on the OTHER door. a bare `set` on an ADDRESSED vault files a new
      //    REACHLESS entry under a slug already cut at reaches — it does NOT restore the lost
      //    credential, so the unlock still fails afterwards and a twin now exists. that is the
      //    exact misdirection this transformer exists to end, merely reached through the
      //    `lost`/`remote` door rather than the `absent` one. the re-store must land at the
      //    SAME ADDRESS, so it carries `--reach`
      // ⛔ THE ROW-REACH CLAMP. a reachless bulk unlock enumerates one target per reach, so
      //    this ONE slug files TWO rows in a single run — and each renders a `reach:` leaf of
      //    its own. absent the row's reach, both rows carried the SAME tip (the sorted first),
      //    so the row that read `reach: casey@ahction.com` was tipped to re-cut
      //    `casey@ahbode.com`: a tip that contradicts the leaf directly above it, and which
      //    obeyed literally re-cuts the WRONG account while the failed one stays lost
      //
      // ⚠️ the peer disclosure inverts with it, so the named reach never also discloses
      //    itself — a line that read `--reach A  # also cut at: A` would be plainly absurd
      then(
        'each row is tipped at ITS OWN reach, with the peer disclosed',
        () => {
          expect(
            asKeyrackOmittedKeyTip({
              slug: '@all.prep.BRAINS_AUTH',
              reason: 'lost',
              reach: { exid: 'casey@ahction.com' },
              hostManifest,
            }),
          ).toEqual(
            'rhx keyrack set --key BRAINS_AUTH --env prep --org @all --reach casey@ahction.com  # also cut at: casey@ahbode.com',
          );
        },
      );

      then('it tips `set` AT the reach — a bare set would cut a twin', () => {
        expect(
          asKeyrackOmittedKeyTip({
            slug: '@all.prep.BRAINS_AUTH',
            reason: 'remote',
            hostManifest,
          }),
        ).toEqual(
          'rhx keyrack set --key BRAINS_AUTH --env prep --org @all --reach casey@ahbode.com  # also cut at: casey@ahction.com',
        );
      });
    });
  });

  given(
    '[case1b] a slug held ONLY at reaches, on a vault that cannot ADDRESS one',
    () => {
      const hostManifest = genMockKeyrackHostManifest({
        hosts: {
          '@all.prep.ENVVAR_KEY@casey@ahction.com': {
            slug: '@all.prep.ENVVAR_KEY',
            org: '@all',
            env: 'prep',
            vault: 'os.envvar',
            reach: { exid: 'casey@ahction.com' },
          },
        },
      });

      // ⛔ THE VAULT-ADDRESSABILITY CLAMP. an `os.envvar` entry stores ONE value per bare name,
      //    so `unlock --reach` against it is refused outright by `assertKeyrackReachAddressable`.
      //    to tip that reach hands the human a command guaranteed to fail — a SECOND error, of a
      //    wholly different cause, on a credential the tip just called reachable. RED before the
      //    repair, which scanned every reach the rack held with no vault filter at all
      when('[t0] the tip is built for an `absent` omission', () => {
        const tip = asKeyrackOmittedKeyTip({
          slug: '@all.prep.ENVVAR_KEY',
          reason: 'absent',
          hostManifest,
        });

        then('it never tips a reach the vault cannot serve', () => {
          expect(tip).not.toContain('--reach');
        });

        // ⚠️ and the fallback is the RIGHT move here, not merely a safe one: such a vault holds
        //    no per-reach slot at all, so its reachless value IS the value. the `set` tip that
        //    would be harmful on an ADDRESSED vault is correct on this one
        then('it tips `set`, at the machine-wide grain', () => {
          expect(tip).toEqual(
            'rhx keyrack set --key ENVVAR_KEY --env prep --org @all',
          );
        });
      });

      // ⛔ THE PROMOTION GATE. the row's own reach LEADS the tip — but only ever from among
      //    the reaches the VAULT can address. were a row reach promoted unconditionally, this
      //    entry would tip `--reach casey@ahction.com` on a vault that stores ONE value per
      //    bare name, so the tipped command is refused outright by
      //    `assertKeyrackReachAddressable` — a SECOND error, of a wholly different cause, on
      //    a credential the tip just called reachable. the gate is what stops the promotion
      //    from a re-open of the very door the vault filter closed
      when('[t1] the SAME row carries that unaddressable reach', () => {
        then('the row reach is still never promoted into the tip', () => {
          expect(
            asKeyrackOmittedKeyTip({
              slug: '@all.prep.ENVVAR_KEY',
              reason: 'lost',
              reach: { exid: 'casey@ahction.com' },
              hostManifest,
            }),
          ).toEqual('rhx keyrack set --key ENVVAR_KEY --env prep --org @all');
        });
      });
    },
  );

  given(
    '[case1c] the SAME shape on a vault that defers its refusal to the mech',
    () => {
      const hostManifest = genMockKeyrackHostManifest({
        hosts: {
          '@all.prep.SSO_KEY@casey@ahction.com': {
            slug: '@all.prep.SSO_KEY',
            org: '@all',
            env: 'prep',
            vault: 'aws.config',
            reach: { exid: 'casey@ahction.com' },
          },
        },
      });

      // ⚠️ THE GUARD AGAINST AN OVER-BROAD REPAIR. `aws.config` is VIA_MECH, not UNADDRESSABLE —
      //    its entry IS held at a composite address like any other, so the key is genuinely
      //    stored per-reach and the unlock may well serve. to drop it with the unaddressable
      //    ones would suppress a CORRECT tip and send the human to `set`, which on an ADDRESSED
      //    vault cuts the reachless twin this transformer exists to prevent
      when('[t0] the tip is built', () => {
        then('it still tips `unlock --reach`', () => {
          expect(
            asKeyrackOmittedKeyTip({
              slug: '@all.prep.SSO_KEY',
              reason: 'absent',
              hostManifest,
            }),
          ).toEqual(
            'rhx keyrack unlock --key SSO_KEY --env prep --reach casey@ahction.com',
          );
        });
      });
    },
  );

  given('[case2] a slug the manifest genuinely does NOT hold', () => {
    const hostManifest = genMockKeyrackHostManifest({
      hosts: { 'testorg.prep.OTHER_KEY': { org: 'testorg', env: 'prep' } },
    });

    when('[t0] the tip is built', () => {
      // ⚠️ the guard against an over-broad repair: a genuinely absent key must STILL be tipped
      //    toward `set`. a change that suppressed every tip would swap one
      //    `rule.require.errors-name-the-fix` breach for another
      then('it keeps the extant `set` tip, byte-identical', () => {
        expect(
          asKeyrackOmittedKeyTip({
            slug: 'testorg.prep.MISSING_KEY',
            reason: 'absent',
            hostManifest,
          }),
        ).toEqual('rhx keyrack set --key MISSING_KEY --env prep');
      });
    });
  });

  given('[case3] a slug the manifest holds REACHLESSLY', () => {
    const hostManifest = genMockKeyrackHostManifest({
      hosts: { 'testorg.prep.REPO_KEY': { org: 'testorg', env: 'prep' } },
    });

    when('[t0] the tip is built', () => {
      // a reachless entry omitted for some other cause (lost/remote) is not a reach problem,
      // so the `set` tip remains the right one — the reach branch must not capture it
      then('it keeps the `set` tip', () => {
        expect(
          asKeyrackOmittedKeyTip({
            slug: 'testorg.prep.REPO_KEY',
            reason: 'lost',
            hostManifest,
          }),
        ).toEqual('rhx keyrack set --key REPO_KEY --env prep');
      });
    });
  });

  given('[case4] no host manifest at all (the bootstrap path)', () => {
    when('[t0] the tip is built for a MACHINE-WIDE slug', () => {
      // `unlock` runs with NO manifest on the bootstrap-to-clone path, so a null manifest is a
      // real state here, never a defensive guard — it must not throw
      //
      // ⛔ THE GRAIN CLAMP. a bare `set` infers grain from the repo manifest, so from a repo
      //    whose manifest names an org it files a TREE-grain `testorg.prep.BOOTSTRAP_TOKEN`
      //    when the failed unlock needed the GROVE-grain `@all.` key — a silent cross-grain
      //    write that leaves the unlock just as broken
      //    (`rule.require.org-scope-grain-hardcut`). from a cwd with no manifest at all, the
      //    bare form has no org to infer and errors outright
      then('the `set` tip carries `--org @all`', () => {
        expect(
          asKeyrackOmittedKeyTip({
            slug: '@all.prep.BOOTSTRAP_TOKEN',
            reason: 'absent',
            hostManifest: null,
          }),
        ).toEqual(
          'rhx keyrack set --key BOOTSTRAP_TOKEN --env prep --org @all',
        );
      });
    });

    // ⚠️ the flag is added for the `@all` namespace ALONE. a repo-scoped key must stay
    //    byte-identical, or every extant absent-key tip changes shape
    when('[t1] the tip is built for a REPO-scoped slug', () => {
      then('the `set` tip carries no org flag', () => {
        expect(
          asKeyrackOmittedKeyTip({
            slug: 'testorg.prep.REPO_KEY',
            reason: 'absent',
            hostManifest: null,
          }),
        ).toEqual('rhx keyrack set --key REPO_KEY --env prep');
      });
    });
  });
});
