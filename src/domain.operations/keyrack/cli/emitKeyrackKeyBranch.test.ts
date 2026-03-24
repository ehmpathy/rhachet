import { given, then, when } from 'test-fns';

import { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';

import { emitKeyrackKeyBranch } from './emitKeyrackKeyBranch';

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
});
