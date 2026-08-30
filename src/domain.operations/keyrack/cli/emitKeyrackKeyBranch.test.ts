import { given, then, when } from 'test-fns';

import { genMockKeyrackKeyGrant } from '@src/.test/assets/genMockKeyrackKeyGrant';
import { asKeyrackKeyReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReach';

import {
  emitKeyrackKeyBranch,
  formatKeyrackKeyBranch,
} from './emitKeyrackKeyBranch';

/**
 * .what = collects the lines `emitKeyrackKeyBranch` writes to stdout
 * .why = every case here reads the emitted tree, so each one patches `console.log`. with the
 *        restore placed AFTER the emit, a throw inside the emit skips it and leaves
 *        `console.log` patched for every later test in the process — later suites then write
 *        into an array nobody reads, and their output vanishes with no signal
 *        (`rule.forbid.failhide`). the restore belongs in a `finally`, which runs on the throw
 *        path too, so one faulted case can never silence the rest of the run.
 */
const getAllLinesEmitted = (
  input: Parameters<typeof emitKeyrackKeyBranch>[0],
): string[] => {
  const lines: string[] = [];
  const logBefore = console.log;
  console.log = (msg: string): number => lines.push(msg);
  try {
    emitKeyrackKeyBranch(input);
  } finally {
    console.log = logBefore;
  }
  return lines;
};

describe('emitKeyrackKeyBranch', () => {
  given('[case1] granted entry', () => {
    when('[t0] is last entry', () => {
      then('emits tree with └─ prefix', () => {
        const output = getAllLinesEmitted({
          entry: {
            type: 'granted',
            grant: genMockKeyrackKeyGrant({
              slug: 'ehmpathy.test.API_KEY',
              expiresAt: '2025-01-01T00:00:00.000Z' as never,
            }),
          },
          isLast: true,
        });

        expect(output).toEqual([
          '   └─ ehmpathy.test.API_KEY',
          '      ├─ vault: os.secure',
          '      ├─ mech: PERMANENT_VIA_REPLICA',
          '      └─ status: granted 🔑',
        ]);
      });
    });

    when('[t1] is not last entry', () => {
      then('emits tree with ├─ prefix', () => {
        const output = getAllLinesEmitted({
          entry: {
            type: 'granted',
            grant: genMockKeyrackKeyGrant({
              slug: 'ehmpathy.test.API_KEY',
              expiresAt: '2025-01-01T00:00:00.000Z' as never,
            }),
          },
          isLast: false,
        });

        expect(output[0]).toEqual('   ├─ ehmpathy.test.API_KEY');
        expect(output[1]).toContain('│  ├─');
      });
    });
  });

  /**
   * .what = clamps that a FAILURE row names WHICH reach it reports on
   * .why = a reachless bulk unlock enumerates one target per reach the rack holds, so ONE slug
   *        can file several rows in a single run. a vault-level fault (an expired sso session,
   *        a pruned daemon) hits every reach at once, so the human meets two byte-identical
   *        rows and cannot tell which account failed — or that two accounts are even involved
   *        rather than a duplicate-render defect (`rule.forbid.ambiguous-labels`)
   * .note = the SUCCESS branches (`granted`, `unlocked`) already solve exactly this. the fix
   *         carries their own treatment to the failure path rather than invent a second shape
   */
  given('[case1b] the same slug, failed at two different reaches', () => {
    const emitAt = (reach: { exid: string }): string[] =>
      getAllLinesEmitted({
        entry: {
          type: 'errored',
          slug: '@all.prep.BRAINS_AUTH',
          tip: 'sso session expired',
          reach,
        },
        isLast: true,
      });

    when('[t0] both rows are rendered', () => {
      // ⛔ THE CLAMP. before the repair both rows rendered slug + status + tip alone, so they
      //    were byte-identical and the human could read neither which account failed nor that
      //    two accounts were involved
      then('each row names its own reach', () => {
        expect(emitAt({ exid: 'casey@ahction.com' })).toEqual([
          '   └─ @all.prep.BRAINS_AUTH',
          '      ├─ reach: casey@ahction.com',
          '      ├─ status: errored 💥',
          '      └─ \x1b[2mtip: sso session expired\x1b[0m',
        ]);
      });

      then('the two rows are no longer identical', () => {
        expect(emitAt({ exid: 'casey@ahction.com' })).not.toEqual(
          emitAt({ exid: 'casey@ahbode.com' }),
        );
      });
    });

    // ⚠️ acceptance 2 at render grain: a reachless row must stay byte-identical, or every
    //    extant omission snapshot in the repo moves
    when('[t1] a REACHLESS failure row is rendered', () => {
      then('it carries no reach leaf at all', () => {
        const output = getAllLinesEmitted({
          entry: {
            type: 'lost',
            slug: 'testorg.prep.REPO_KEY',
            tip: 'rhx keyrack set --key REPO_KEY --env prep',
          },
          isLast: true,
        });

        expect(output).toEqual([
          '   └─ testorg.prep.REPO_KEY',
          '      ├─ status: lost 👻',
          '      └─ \x1b[2mtip: rhx keyrack set --key REPO_KEY --env prep\x1b[0m',
        ]);
      });
    });
  });

  given('[case2] absent entry', () => {
    when('[t0] with tip', () => {
      then('emits status and dimmed tip', () => {
        const output = getAllLinesEmitted({
          entry: {
            type: 'absent',
            slug: 'ehmpathy.test.MISSING_KEY',
            tip: 'rhx keyrack set --key MISSING_KEY --env test',
          },
          isLast: true,
        });

        expect(output).toEqual([
          '   └─ ehmpathy.test.MISSING_KEY',
          '      ├─ status: absent 🫧',
          '      └─ \x1b[2mtip: rhx keyrack set --key MISSING_KEY --env test\x1b[0m',
        ]);
      });
    });

    when('[t1] without tip', () => {
      then('emits status only', () => {
        const output = getAllLinesEmitted({
          entry: {
            type: 'absent',
            slug: 'ehmpathy.test.MISSING_KEY',
            tip: null,
          },
          isLast: true,
        });

        expect(output).toEqual([
          '   └─ ehmpathy.test.MISSING_KEY',
          '      └─ status: absent 🫧',
        ]);
      });
    });
  });

  given('[case3] locked entry', () => {
    when('[t0] with tip', () => {
      then('emits status and dimmed tip', () => {
        const output = getAllLinesEmitted({
          entry: {
            type: 'locked',
            slug: 'ehmpathy.test.LOCKED_KEY',
            tip: 'rhx keyrack unlock --key LOCKED_KEY',
          },
          isLast: true,
        });

        expect(output).toEqual([
          '   └─ ehmpathy.test.LOCKED_KEY',
          '      ├─ status: locked 🔒',
          '      └─ \x1b[2mtip: rhx keyrack unlock --key LOCKED_KEY\x1b[0m',
        ]);
      });
    });
  });

  given('[case4] blocked entry', () => {
    when('[t0] with reasons', () => {
      then('emits status, reasons tree, and dimmed tip', () => {
        const output = getAllLinesEmitted({
          entry: {
            type: 'blocked',
            slug: 'ehmpathy.test.BLOCKED_KEY',
            reasons: ['reason1', 'reason2'],
          },
          isLast: true,
        });

        expect(output).toEqual([
          '   └─ ehmpathy.test.BLOCKED_KEY',
          '      ├─ status: blocked 🚫',
          '      │  ├─ reason1',
          '      │  └─ reason2',
          '      └─ \x1b[2mtip: --allow-dangerous if you must\x1b[0m',
        ]);
      });
    });
  });

  given('[case5] unlocked entry', () => {
    when('[t0] with expiresAt', () => {
      then('emits env, org, vault, and expires in', () => {
        // set expiresAt to 30 minutes from now
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

        const output = getAllLinesEmitted({
          entry: {
            type: 'unlocked',
            grant: genMockKeyrackKeyGrant({
              slug: 'ehmpathy.test.API_KEY',
              expiresAt: expiresAt as never,
            }),
          },
          isLast: true,
        });

        expect(output[0]).toEqual('   └─ ehmpathy.test.API_KEY');
        expect(output[1]).toEqual('      ├─ env: test');
        expect(output[2]).toEqual('      ├─ org: ehmpathy');
        expect(output[3]).toEqual('      ├─ vault: os.secure');
        expect(output[4]).toContain('expires in: 30m');
      });
    });
  });

  /**
   * .what = the reach leaf on an unlocked branch, snapped beside its reachless twin
   * .why = the branch is what a human reads after `keyrack unlock`, so the leaf is a
   *        published contract. snapped side by side, the diff shows BOTH that a reach
   *        key gains the leaf and that a reachless key gains no leaf at all (e1)
   *        — rule.require.contract-snapshot-exhaustiveness
   */
  given('[case6] an unlocked entry cut for a reach', () => {
    const genUnlockedLines = (input: { exid?: string }): string[] =>
      formatKeyrackKeyBranch({
        entry: {
          type: 'unlocked',
          grant: genMockKeyrackKeyGrant({
            slug: 'ahbode.prep.EHMPATH_BEAVER_GITHUB_TOKEN',
            key: {
              secret: 'secret',
              grade: { protection: 'encrypted', duration: 'ephemeral' },
            },
            source: {
              vault: 'os.secure',
              mech: 'EPHEMERAL_VIA_GITHUB_APP',
            },
            env: 'prep',
            org: 'ahbode',
            ...(input.exid
              ? { reach: asKeyrackKeyReach({ exid: input.exid }) }
              : {}),
            // .note = 55m out from the clock, so the rendered ttl holds still in the snap
            expiresAt: new Date(
              Date.now() + 55 * 60 * 1000,
            ).toISOString() as never,
          }),
        },
        isLast: true,
      });

    when('[t0] the key was cut for no reach', () => {
      then('the branch carries no reach leaf (e1)', () => {
        const lines = genUnlockedLines({});
        expect(lines.filter((line) => line.includes('reach:'))).toHaveLength(0);
        expect(lines).toMatchSnapshot();
      });
    });

    when('[t1] the key was cut for a github org', () => {
      then('the reach leaf sits directly after org', () => {
        const lines = genUnlockedLines({ exid: 'github://org=ehmpathy' });
        const orgAt = lines.indexOf('      ├─ org: ahbode');
        expect(lines[orgAt + 1]).toEqual(
          '      ├─ reach: github://org=ehmpathy',
        );
        expect(lines).toMatchSnapshot();
      });
    });

    when('[t2] the key was cut for a claude account', () => {
      then('a plaintext exid renders verbatim, with no scheme parsed', () => {
        const lines = genUnlockedLines({ exid: 'beav@ehmpathy.com' });
        expect(lines).toContain('      ├─ reach: beav@ehmpathy.com');
        expect(lines).toMatchSnapshot();
      });
    });
  });

  /**
   * .what = the GRANTED branch must render the reach leaf, exactly as `unlocked` does
   * .why = `keyrack get` renders through this branch, and `get` is the command a consumer
   *        actually calls. without the leaf a caller can pass `--reach`, have it honored end to
   *        end, and see no trace of WHICH reach answered
   *
   * .note = this branch omitted the leaf while `unlocked` three cases below it had one, so the
   *         same key read two ways per which command was run — `get` named no reach at all,
   *         `unlock` named it
   */
  given('[case8] a granted entry that carries a reach', () => {
    const grantWithReach = genMockKeyrackKeyGrant({
      slug: 'ehmpathy.test.API_KEY',
      reach: asKeyrackKeyReach({ exid: 'beav@ehmpathy.com' }),
      expiresAt: '2025-01-01T00:00:00.000Z' as never,
    });

    when('[t0] the branch is formatted', () => {
      then('the reach leaf is rendered', () => {
        const lines = formatKeyrackKeyBranch({
          entry: { type: 'granted', grant: grantWithReach },
          isLast: true,
        });

        // ⚠️ THE clamp — absent the reach leaf, `keyrack get` never names the reach
        expect(lines).toContain('      ├─ reach: beav@ehmpathy.com');
      });

      then(
        'the reach leaf sits directly above vault, as it does on unlock',
        () => {
          const lines = formatKeyrackKeyBranch({
            entry: { type: 'granted', grant: grantWithReach },
            isLast: true,
          });

          const indexOfReach = lines.findIndex((line) =>
            line.includes('reach:'),
          );
          const indexOfVault = lines.findIndex((line) =>
            line.includes('vault:'),
          );
          expect(indexOfVault).toEqual(indexOfReach + 1);
        },
      );
    });

    when('[t1] the same branch carries NO reach', () => {
      then('e1: not one reach line is emitted', () => {
        const lines = formatKeyrackKeyBranch({
          entry: {
            type: 'granted',
            grant: genMockKeyrackKeyGrant({
              slug: 'ehmpathy.test.API_KEY',
              expiresAt: '2025-01-01T00:00:00.000Z' as never,
            }),
          },
          isLast: true,
        });

        expect(lines.some((line) => line.includes('reach:'))).toEqual(false);
      });
    });
  });

  /**
   * .what = clamps that the stdout capture restores `console.log` even when the emit throws
   * .why = every case in this file patches `console.log` to read the tree back. with the
   *        restore placed after the emit, a throw skips it and leaves the patch in place for
   *        the REST OF THE PROCESS — later suites then push their output into an array nobody
   *        reads, and their logs vanish with no signal (`rule.forbid.failhide`). the damage
   *        lands on tests that share no code with this one, which is what makes the leak
   *        expensive to trace
   * .note = the throw is real, not synthetic: `emitKeyrackKeyBranch` ends in an exhaustive
   *         `never` check that throws on an unknown entry type, so this exercises the actual
   *         fault path a future entry variant would take
   */
  given('[case9] the emit throws part way through a capture', () => {
    when('[t0] an unknown entry type reaches the exhaustive check', () => {
      then('the throw still reaches the caller', () => {
        expect(() =>
          getAllLinesEmitted({
            entry: { type: 'unheard-of' } as never,
            isLast: true,
          }),
        ).toThrow('unexpected entry type');
      });

      // ⛔ THE clamp. with the restore after the emit rather than in a `finally`, this is the
      //    assertion that goes red — `console.log` would still be the capture stub here
      then(
        'console.log is handed back, so later tests still write to stdout',
        () => {
          const logBefore = console.log;

          expect(() =>
            getAllLinesEmitted({
              entry: { type: 'unheard-of' } as never,
              isLast: true,
            }),
          ).toThrow();

          expect(console.log).toBe(logBefore);
        },
      );
    });
  });
});
