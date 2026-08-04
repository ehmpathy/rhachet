import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asKeyrackUnlockExitCode } from './asKeyrackUnlockExitCode';

describe('asKeyrackUnlockExitCode', () => {
  given('[case1] a batch with no errored key', () => {
    when('[t0] only benign omissions (absent/lost/remote)', () => {
      then('it returns null so the exit code stays 0', () => {
        const code = asKeyrackUnlockExitCode({
          omitted: [
            { reason: 'absent' },
            { reason: 'lost' },
            { reason: 'remote' },
          ],
        });
        expect(code).toEqual(null);
      });
    });

    when('[t1] an empty omitted list', () => {
      then('it returns null', () => {
        expect(asKeyrackUnlockExitCode({ omitted: [] })).toEqual(null);
      });
    });
  });

  given('[case2] a batch whose every errored cause is caller-fixable', () => {
    when('[t0] each errored cause is a ConstraintError', () => {
      then('it returns 2 (fix config, then retry)', () => {
        const code = asKeyrackUnlockExitCode({
          omitted: [
            { reason: 'absent' },
            { reason: 'errored', cause: new ConstraintError('no region') },
            { reason: 'errored', cause: new ConstraintError('no grant') },
          ],
        });
        expect(code).toEqual(2);
      });
    });
  });

  given('[case3] a batch with any server/transient errored fault', () => {
    when('[t0] one errored cause is a MalfunctionError', () => {
      then('it returns 1', () => {
        const code = asKeyrackUnlockExitCode({
          omitted: [
            { reason: 'errored', cause: new ConstraintError('no region') },
            { reason: 'errored', cause: new MalfunctionError('ssm throttled') },
          ],
        });
        expect(code).toEqual(1);
      });
    });

    when('[t1] an errored cause is an unclassed value', () => {
      then('it returns 1', () => {
        const code = asKeyrackUnlockExitCode({
          omitted: [{ reason: 'errored', cause: 'boom' }],
        });
        expect(code).toEqual(1);
      });
    });
  });
});
