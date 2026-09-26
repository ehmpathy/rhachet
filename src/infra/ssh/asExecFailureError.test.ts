import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asExecFailureError } from './asExecFailureError';

const inputBase = {
  ranButRejected: {
    message: 'tool could not do the work',
    metadata: { keyPath: '/tmp/key' },
  },
  spawnFault: {
    message: 'tool failed to run',
    metadata: { keyPath: '/tmp/key' },
  },
};

describe('asExecFailureError', () => {
  given('[case1] the caught error is already a MalfunctionError', () => {
    const already = new MalfunctionError('already classified', {});

    when('[t0] classified', () => {
      then('it passes the same instance through unchanged', () => {
        const result = asExecFailureError({ ...inputBase, error: already });
        expect(result).toBe(already);
      });
    });
  });

  given('[case2] the caught error is already a ConstraintError', () => {
    const already = new ConstraintError('already classified', {});

    when('[t0] classified', () => {
      then('it passes the same instance through unchanged', () => {
        const result = asExecFailureError({ ...inputBase, error: already });
        expect(result).toBe(already);
      });
    });
  });

  given('[case3] the caught error carries a numeric exit status', () => {
    const ranButRejected = Object.assign(new Error('exit 1'), { status: 1 });

    when('[t0] classified', () => {
      const result = asExecFailureError({
        ...inputBase,
        error: ranButRejected,
      });

      then('it is a caller-fixable ConstraintError', () => {
        expect(result).toBeInstanceOf(ConstraintError);
      });

      then('it carries the ranButRejected message', () => {
        expect(result.message).toContain('tool could not do the work');
      });

      then('it bakes in the local-desktop retry hint', () => {
        expect(result.message).toContain('local desktop');
      });
    });
  });

  given('[case4] the caught error has no numeric exit status', () => {
    const spawnFault = new Error('spawn ENOENT');

    when('[t0] classified', () => {
      const result = asExecFailureError({ ...inputBase, error: spawnFault });

      then('it is a MalfunctionError', () => {
        expect(result).toBeInstanceOf(MalfunctionError);
      });

      then('it carries the spawnFault message', () => {
        expect(result.message).toContain('tool failed to run');
      });

      then('it carries the original reason', () => {
        expect(result.message).toContain('spawn ENOENT');
      });

      then('it names the fix — install the openssh client tools', () => {
        expect(result.message).toContain('openssh-client');
      });
    });
  });

  // clamp (rule.require.clamp-edge-cases): a SIGTERM-killed child (the 120s interactive
  // timeout fired while the human was at the dialog) has status:null + killed:true. it
  // must be caller-fixable (retry), NOT the spawn-fault "reinstall openssh" misdiagnosis.
  // reproduces r11's B2: the timeout-kill previously fell into the spawn-fault branch
  given(
    '[case5] the caught error was killed by the interactive timeout',
    () => {
      const timeoutKill = Object.assign(
        new Error('spawnSync ssh-add ETIMEDOUT'),
        {
          status: null,
          killed: true,
          signal: 'SIGTERM',
        },
      );

      when('[t0] classified', () => {
        const result = asExecFailureError({ ...inputBase, error: timeoutKill });

        then('it is a caller-fixable ConstraintError', () => {
          expect(result).toBeInstanceOf(ConstraintError);
        });

        then('it names the retry fix, not an openssh reinstall', () => {
          expect(result.message).toContain('timed out');
          expect(result.message.includes('openssh-client')).toBe(false);
        });
      });
    },
  );
});
