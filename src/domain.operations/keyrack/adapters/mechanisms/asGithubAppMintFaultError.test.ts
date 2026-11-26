import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asGithubAppMintFaultError } from './asGithubAppMintFaultError';

describe('asGithubAppMintFaultError', () => {
  given('[case1] a refusal with a known fault', () => {
    when('[t0] cast', () => {
      then('it returns the refusal', () => {
        const error = new ConstraintError('refused', { fault: 'key-refused' });
        expect(asGithubAppMintFaultError({ error })).toBe(error);
      });
    });
  });

  given('[case2] any other error', () => {
    when('[t0] a ConstraintError with a fault outside the closed set', () => {
      then('it returns null', () => {
        const error = new ConstraintError('other', { fault: 'disk-full' });
        expect(asGithubAppMintFaultError({ error })).toBeNull();
      });
    });

    when('[t1] a ConstraintError with no fault', () => {
      then('it returns null', () => {
        const error = new ConstraintError('other', {});
        expect(asGithubAppMintFaultError({ error })).toBeNull();
      });
    });

    when('[t2] a MalfunctionError that carries a known fault', () => {
      then('it returns null', () => {
        const error = new MalfunctionError('egress', { fault: 'key-refused' });
        expect(asGithubAppMintFaultError({ error })).toBeNull();
      });
    });
  });
});
