import { ConstraintError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asRepoBrainDirIsFileError } from './asRepoBrainDirIsFileError';

describe('asRepoBrainDirIsFileError', () => {
  given('[case1] a file at <repo>/.claude', () => {
    when('[t0] the refusal is built', () => {
      const error = asRepoBrainDirIsFileError({ linkPath: '/repo/.claude' });

      then('it is a constraint, so the human fixes it (exit 2)', () => {
        expect(error).toBeInstanceOf(ConstraintError);
      });

      then('it names the cause and the fix', () => {
        expect(error.message).toContain('<repo>/.claude is a file, not a dir');
        expect(error.message).toContain('move /repo/.claude aside');
      });
    });
  });
});
