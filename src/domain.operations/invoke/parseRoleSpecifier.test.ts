import { BadRequestError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { parseRoleSpecifier } from './parseRoleSpecifier';

describe('parseRoleSpecifier', () => {
  given('[case1] unqualified role specifier', () => {
    when('[t0] parseRoleSpecifier is called with "mechanic"', () => {
      then('returns repo=null and role="mechanic"', () => {
        const result = parseRoleSpecifier({ specifier: 'mechanic' });
        expect(result).toEqual({ repo: null, role: 'mechanic' });
      });
    });

    when('[t1] parseRoleSpecifier is called with "behaver"', () => {
      then('returns repo=null and role="behaver"', () => {
        const result = parseRoleSpecifier({ specifier: 'behaver' });
        expect(result).toEqual({ repo: null, role: 'behaver' });
      });
    });
  });

  given('[case2] qualified role specifier', () => {
    when('[t0] parseRoleSpecifier is called with "ehmpathy/mechanic"', () => {
      then('returns repo="ehmpathy" and role="mechanic"', () => {
        const result = parseRoleSpecifier({ specifier: 'ehmpathy/mechanic' });
        expect(result).toEqual({ repo: 'ehmpathy', role: 'mechanic' });
      });
    });

    when('[t1] parseRoleSpecifier is called with "bhuild/behaver"', () => {
      then('returns repo="bhuild" and role="behaver"', () => {
        const result = parseRoleSpecifier({ specifier: 'bhuild/behaver' });
        expect(result).toEqual({ repo: 'bhuild', role: 'behaver' });
      });
    });
  });

  given('[case3] specifier with whitespace', () => {
    when('[t0] parseRoleSpecifier is called with " mechanic "', () => {
      then('trims and returns repo=null and role="mechanic"', () => {
        const result = parseRoleSpecifier({ specifier: ' mechanic ' });
        expect(result).toEqual({ repo: null, role: 'mechanic' });
      });
    });

    when('[t1] parseRoleSpecifier is called with " ehmpathy/mechanic "', () => {
      then('trims and returns repo="ehmpathy" and role="mechanic"', () => {
        const result = parseRoleSpecifier({ specifier: ' ehmpathy/mechanic ' });
        expect(result).toEqual({ repo: 'ehmpathy', role: 'mechanic' });
      });
    });
  });

  given('[case4] empty specifier', () => {
    when('[t0] parseRoleSpecifier is called with ""', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(() =>
          parseRoleSpecifier({ specifier: '' }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('cannot be empty');
      });
    });

    when('[t1] parseRoleSpecifier is called with "   "', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(() =>
          parseRoleSpecifier({ specifier: '   ' }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('cannot be empty');
      });
    });
  });

  given('[case5] specifier with empty repo', () => {
    when('[t0] parseRoleSpecifier is called with "/mechanic"', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(() =>
          parseRoleSpecifier({ specifier: '/mechanic' }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('repo part');
      });
    });
  });

  given('[case6] specifier with empty role', () => {
    when('[t0] parseRoleSpecifier is called with "ehmpathy/"', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(() =>
          parseRoleSpecifier({ specifier: 'ehmpathy/' }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('role part');
      });
    });
  });

  given('[case7] specifier with multiple slashes', () => {
    when('[t0] parseRoleSpecifier is called with "ehmpathy/foo/bar"', () => {
      then('throws BadRequestError', async () => {
        const error = await getError(() =>
          parseRoleSpecifier({ specifier: 'ehmpathy/foo/bar' }),
        );
        expect(error).toBeInstanceOf(BadRequestError);
        expect(error.message).toContain('multiple slashes');
      });
    });
  });
});
