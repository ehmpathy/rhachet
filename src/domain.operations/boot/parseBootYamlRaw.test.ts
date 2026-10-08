import { ConstraintError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { parseBootYamlRaw } from './parseBootYamlRaw';

describe('parseBootYamlRaw', () => {
  given('[case1] valid yaml', () => {
    when('[t0] parsed', () => {
      then('it returns the raw value, unvalidated', () => {
        const raw = parseBootYamlRaw({
          content: 'budget:\n  tokens: 5000\n',
          path: 'role=any/boot.yml',
        });
        expect(raw).toEqual({ budget: { tokens: 5000 } });
      });
    });
  });

  given('[case2] invalid yaml', () => {
    when('[t0] parsed', () => {
      then('it refuses with a ConstraintError that names the path', () => {
        const error = getError(() =>
          parseBootYamlRaw({
            content: 'always:\n  briefs: [unclosed\n',
            path: 'role=any/boot.yml',
          }),
        );
        expect(error).toBeInstanceOf(ConstraintError);
        expect(error.message).toContain('boot.yml has invalid yaml');
        expect(error.message).toContain('role=any/boot.yml');
      });
    });
  });
});
