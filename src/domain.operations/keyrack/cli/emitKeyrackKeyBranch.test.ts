import { given, then, when } from 'test-fns';

import { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';
import { asKeyrackKeyReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReach';

import {
  emitKeyrackKeyBranch,
  formatKeyrackKeyBranch,
} from './emitKeyrackKeyBranch';

describe('emitKeyrackKeyBranch', () => {
  given('[case1] granted entry', () => {
    when('[t0] is last entry', () => {
      then('emits tree with └─ prefix', () => {
        const output: string[] = [];
        const originalLog = console.log;
        console.log = (msg: string) => output.push(msg);

        emitKeyrackKeyBranch({
          entry: {
            type: 'granted',
            grant: new KeyrackKeyGrant({
              slug: 'ehmpathy.test.API_KEY',
              key: {
                secret: 'secret',
                grade: { protection: 'encrypted', duration: 'permanent' },
              },
              source: { vault: 'os.secure', mech: 'PERMANENT_VIA_REPLICA' },
              env: 'test',
              org: 'ehmpathy',
              expiresAt: '2025-01-01T00:00:00.000Z' as any,
            }),
          },
          isLast: true,
        });

        console.log = originalLog;

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
        const output: string[] = [];
        const originalLog = console.log;
        console.log = (msg: string) => output.push(msg);

        emitKeyrackKeyBranch({
          entry: {
            type: 'granted',
            grant: new KeyrackKeyGrant({
              slug: 'ehmpathy.test.API_KEY',
              key: {
                secret: 'secret',
                grade: { protection: 'encrypted', duration: 'permanent' },
              },
              source: { vault: 'os.secure', mech: 'PERMANENT_VIA_REPLICA' },
              env: 'test',
              org: 'ehmpathy',
              expiresAt: '2025-01-01T00:00:00.000Z' as any,
            }),
          },
          isLast: false,
        });

        console.log = originalLog;

        expect(output[0]).toEqual('   ├─ ehmpathy.test.API_KEY');
        expect(output[1]).toContain('│  ├─');
      });
    });
  });

  given('[case2] absent entry', () => {
    when('[t0] with tip', () => {
      then('emits status and dimmed tip', () => {
        const output: string[] = [];
        const originalLog = console.log;
        console.log = (msg: string) => output.push(msg);

        emitKeyrackKeyBranch({
          entry: {
            type: 'absent',
            slug: 'ehmpathy.test.MISSING_KEY',
            tip: 'rhx keyrack set --key MISSING_KEY --env test',
          },
          isLast: true,
        });

        console.log = originalLog;

        expect(output).toEqual([
          '   └─ ehmpathy.test.MISSING_KEY',
          '      ├─ status: absent 🫧',
          '      └─ \x1b[2mtip: rhx keyrack set --key MISSING_KEY --env test\x1b[0m',
        ]);
      });
    });

    when('[t1] without tip', () => {
      then('emits status only', () => {
        const output: string[] = [];
        const originalLog = console.log;
        console.log = (msg: string) => output.push(msg);

        emitKeyrackKeyBranch({
          entry: {
            type: 'absent',
            slug: 'ehmpathy.test.MISSING_KEY',
            tip: null,
          },
          isLast: true,
        });

        console.log = originalLog;

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
        const output: string[] = [];
        const originalLog = console.log;
        console.log = (msg: string) => output.push(msg);

        emitKeyrackKeyBranch({
          entry: {
            type: 'locked',
            slug: 'ehmpathy.test.LOCKED_KEY',
            tip: 'rhx keyrack unlock --key LOCKED_KEY',
          },
          isLast: true,
        });

        console.log = originalLog;

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
        const output: string[] = [];
        const originalLog = console.log;
        console.log = (msg: string) => output.push(msg);

        emitKeyrackKeyBranch({
          entry: {
            type: 'blocked',
            slug: 'ehmpathy.test.BLOCKED_KEY',
            reasons: ['reason1', 'reason2'],
          },
          isLast: true,
        });

        console.log = originalLog;

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
        const output: string[] = [];
        const originalLog = console.log;
        console.log = (msg: string) => output.push(msg);

        // set expiresAt to 30 minutes from now
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

        emitKeyrackKeyBranch({
          entry: {
            type: 'unlocked',
            grant: new KeyrackKeyGrant({
              slug: 'ehmpathy.test.API_KEY',
              key: {
                secret: 'secret',
                grade: { protection: 'encrypted', duration: 'permanent' },
              },
              source: { vault: 'os.secure', mech: 'PERMANENT_VIA_REPLICA' },
              env: 'test',
              org: 'ehmpathy',
              expiresAt: expiresAt as any,
            }),
          },
          isLast: true,
        });

        console.log = originalLog;

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
          grant: new KeyrackKeyGrant({
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
            ).toISOString() as any,
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
    const grantWithReach = new KeyrackKeyGrant({
      slug: 'ehmpathy.test.API_KEY',
      key: {
        secret: 'secret',
        grade: { protection: 'encrypted', duration: 'permanent' },
      },
      source: { vault: 'os.secure', mech: 'PERMANENT_VIA_REPLICA' },
      env: 'test',
      org: 'ehmpathy',
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
            grant: new KeyrackKeyGrant({
              slug: 'ehmpathy.test.API_KEY',
              key: {
                secret: 'secret',
                grade: { protection: 'encrypted', duration: 'permanent' },
              },
              source: { vault: 'os.secure', mech: 'PERMANENT_VIA_REPLICA' },
              env: 'test',
              org: 'ehmpathy',
              expiresAt: '2025-01-01T00:00:00.000Z' as never,
            }),
          },
          isLast: true,
        });

        expect(lines.some((line) => line.includes('reach:'))).toEqual(false);
      });
    });
  });
});
