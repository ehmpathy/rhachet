import { ConstraintError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asKeyrackDeclastructPeerDefect } from './asKeyrackDeclastructPeerDefect';

/**
 * .what = unit clamp for the declastruct-aws peer-absent classification
 * .why = the peer-absent hint is the ONE message a user without the optional peer sees (uc14). the
 *   loader's happy path is integration-tested (the peer IS installed in dev), so the absent branch
 *   can only be exercised via a fabricated caught error — this clamps BOTH the exact user-faced
 *   text AND the allowlist boundary (a non-peer error must rethrow, never be masked as "install
 *   the peer"). the reviewer flagged the absent branch as zero-coverage (r10.4)
 */
describe('asKeyrackDeclastructPeerDefect', () => {
  given('[case1] a module-not-found error for the peer (by message)', () => {
    when('[t0] the caught error message names the absent peer module', () => {
      const cause = new Error(
        "Cannot find module 'declastruct-aws' imported from ...",
      );

      then('it returns a ConstraintError that states the install fix', () => {
        const defect = asKeyrackDeclastructPeerDefect(cause);
        expect(defect).toBeInstanceOf(ConstraintError);
        expect(defect?.message).toContain('needs the declastruct-aws peer');
      });

      then('the hint states the exact install command', () => {
        const defect = asKeyrackDeclastructPeerDefect(cause);
        // the one user-faced recovery step — pinned so a future phrasing change is caught
        expect(JSON.stringify(defect)).toContain('pnpm add declastruct-aws');
      });
    });
  });

  given('[case2] a module-not-found error for the peer (by code)', () => {
    when('[t0] the caught error carries ERR_MODULE_NOT_FOUND', () => {
      const cause = Object.assign(new Error('boom'), {
        code: 'ERR_MODULE_NOT_FOUND',
      });

      then('it returns the install-fix ConstraintError', () => {
        const defect = asKeyrackDeclastructPeerDefect(cause);
        expect(defect).toBeInstanceOf(ConstraintError);
      });
    });
  });

  given('[case3] a non-peer error (a real malfunction)', () => {
    when('[t0] the caught error is unrelated to an absent peer', () => {
      const cause = new Error(
        'SyntaxError: Unexpected token in declastruct-aws internals',
      );

      then('it returns null (signal to rethrow unchanged, never mask)', () => {
        // the allowlist boundary: a real malfunction must NOT be dressed up as "install the peer"
        expect(asKeyrackDeclastructPeerDefect(cause)).toBeNull();
      });
    });
  });

  given('[case4] a thrown non-error value', () => {
    when('[t0] the caught value is not an Error instance', () => {
      then(
        'it returns null (only a real module-not-found is caller-fixable)',
        () => {
          expect(asKeyrackDeclastructPeerDefect('a string throw')).toBeNull();
        },
      );
    });
  });
});
