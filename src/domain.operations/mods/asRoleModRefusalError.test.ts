import { ConstraintError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { asRoleModRefusalError } from './asRoleModRefusalError';

describe('asRoleModRefusalError', () => {
  given('[case1] a refusal with a nearest held path', () => {
    when('[t0] the error is built', () => {
      const error = asRoleModRefusalError({
        role: 'surfer',
        problem: 'a mod file matches no held path',
        subject: 'briefs/rule.require.surf-wux.md',
        nearest: 'briefs/rule.require.surf-wax.md',
        fix: 'rename the file to the held path, or declare it as an add',
      });

      then(
        'it is a ConstraintError, so the caller is named as the fixer',
        () => {
          expect(error).toBeInstanceOf(ConstraintError);
        },
      );

      then('the header names the role and the problem', () => {
        expect(error.message).toContain(
          'the mod of role=surfer is refused: a mod file matches no held path',
        );
      });

      then(
        'it names the mod dir, the subject, the nearest, and the fix',
        () => {
          expect(error.message).toContain('.agent/repo=.mods/role=surfer/');
          expect(error.message).toContain('briefs/rule.require.surf-wux.md');
          expect(error.message).toContain('did you mean');
          expect(error.message).toContain('briefs/rule.require.surf-wax.md');
          expect(error.message).toContain('rename the file to the held path');
        },
      );
    });
  });

  given('[case2] a refusal with no nearest', () => {
    when('[t0] the error is built', () => {
      const error = asRoleModRefusalError({
        role: 'surfer',
        problem: 'the of names no linked role',
        subject: 'of: test/surfboard',
        nearest: null,
        fix: 'link the role with rhx init --roles, or fix the of',
      });

      then('it offers no "did you mean"', () => {
        expect(error.message).not.toContain('did you mean');
      });

      then('it still names the fix', () => {
        expect(error.message).toContain('link the role with rhx init --roles');
      });
    });
  });
});
