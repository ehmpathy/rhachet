import { given, then, when } from 'test-fns';

import { withAbsentAsNull } from './withAbsentAsNull';

const asErrno = (input: { code: string }): NodeJS.ErrnoException =>
  Object.assign(new Error(`errno ${input.code}`), { code: input.code });

describe('withAbsentAsNull', () => {
  given('[case1] a read that returns', () => {
    when('[t0] the read runs', () => {
      then('its value comes back', () => {
        expect(withAbsentAsNull({ read: () => 'content' })).toEqual('content');
      });
    });
  });

  given('[case2] a read whose path is absent', () => {
    when('[t0] the read throws ENOENT', () => {
      then('null comes back', () => {
        expect(
          withAbsentAsNull({
            read: () => {
              throw asErrno({ code: 'ENOENT' });
            },
          }),
        ).toBeNull();
      });
    });

    when('[t1] the read throws ENOTDIR', () => {
      then('null comes back', () => {
        expect(
          withAbsentAsNull({
            read: () => {
              throw asErrno({ code: 'ENOTDIR' });
            },
          }),
        ).toBeNull();
      });
    });
  });

  given('[case3] a read that fails for another cause', () => {
    when('[t0] the read throws EACCES', () => {
      then('the error surfaces', () => {
        expect(() =>
          withAbsentAsNull({
            read: () => {
              throw asErrno({ code: 'EACCES' });
            },
          }),
        ).toThrow('errno EACCES');
      });
    });

    when('[t1] the read throws an error with no code', () => {
      then('the error surfaces', () => {
        expect(() =>
          withAbsentAsNull({
            read: () => {
              throw new TypeError('a defect');
            },
          }),
        ).toThrow(TypeError);
      });
    });
  });
});
