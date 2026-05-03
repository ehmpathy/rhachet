import { given, then, when } from 'test-fns';

import { isEphemeralVault } from './isEphemeralVault';

describe('isEphemeralVault', () => {
  given('[case1] os.daemon vault', () => {
    when('[t0] checked', () => {
      then('returns true (ephemeral)', () => {
        expect(isEphemeralVault({ vault: 'os.daemon' })).toBe(true);
      });
    });
  });

  given('[case2] os.secure vault', () => {
    when('[t0] checked', () => {
      then('returns false (persistent)', () => {
        expect(isEphemeralVault({ vault: 'os.secure' })).toBe(false);
      });
    });
  });

  given('[case3] os.direct vault', () => {
    when('[t0] checked', () => {
      then('returns false (persistent)', () => {
        expect(isEphemeralVault({ vault: 'os.direct' })).toBe(false);
      });
    });
  });

  given('[case4] aws.config vault', () => {
    when('[t0] checked', () => {
      then('returns false (persistent)', () => {
        expect(isEphemeralVault({ vault: 'aws.config' })).toBe(false);
      });
    });
  });

  given('[case5] 1password vault', () => {
    when('[t0] checked', () => {
      then('returns false (persistent)', () => {
        expect(isEphemeralVault({ vault: '1password' })).toBe(false);
      });
    });
  });
});
