import { given, then, when } from 'test-fns';

import { getDecodedRoleDeltaToken } from './getDecodedRoleDeltaToken';
import { getPreprocessedRoleArgv } from './getPreprocessedRoleArgv';

describe('getDecodedRoleDeltaToken', () => {
  given('[case1] a qualified `-repo/role` remove token', () => {
    when('[t0] preprocessed then decoded', () => {
      then('round-trips back to the natural -repo/role form', () => {
        const [encoded] = getPreprocessedRoleArgv({
          args: ['--roles', '-bhuild/reviewer'],
        }).slice(-1);
        expect(getDecodedRoleDeltaToken({ token: encoded! })).toEqual(
          '-bhuild/reviewer',
        );
      });
    });
  });

  given('[case2] a plain add/bare token', () => {
    when('[t0] decoded', () => {
      then('returns the token unchanged', () => {
        expect(getDecodedRoleDeltaToken({ token: '+architect' })).toEqual(
          '+architect',
        );
        expect(getDecodedRoleDeltaToken({ token: 'mechanic' })).toEqual(
          'mechanic',
        );
      });
    });
  });
});
