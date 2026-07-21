import { given, then, when } from 'test-fns';

import { getDecodedRoleToken } from './getDecodedRoleToken';
import { getPreprocessedRoleArgv } from './getPreprocessedRoleArgv';

describe('getDecodedRoleToken', () => {
  given('[case1] a qualified `-repo/role` remove token', () => {
    when('[t0] preprocessed then decoded', () => {
      then('round-trips back to the natural -repo/role form', () => {
        const [encoded] = getPreprocessedRoleArgv({
          args: ['--roles', '-bhuild/reviewer'],
        }).slice(-1);
        expect(getDecodedRoleToken({ token: encoded! })).toEqual(
          '-bhuild/reviewer',
        );
      });
    });
  });

  given('[case2] a plain add/bare token', () => {
    when('[t0] decoded', () => {
      then('returns the token unchanged', () => {
        expect(getDecodedRoleToken({ token: '+architect' })).toEqual(
          '+architect',
        );
        expect(getDecodedRoleToken({ token: 'mechanic' })).toEqual('mechanic');
      });
    });
  });
});
