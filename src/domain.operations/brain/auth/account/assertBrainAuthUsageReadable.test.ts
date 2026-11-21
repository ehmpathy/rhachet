import { getError, given, then, when } from 'test-fns';

import { genSampleBrainAuthUsage as genUsage } from '@src/.test/assets/genSampleBrainAuthUsage';

import { assertBrainAuthUsageReadable } from './assertBrainAuthUsageReadable';

describe('assertBrainAuthUsageReadable', () => {
  given('[case1] one account read, one timed out (case=11 [t0])', () => {
    when('[t0] the table is judged', () => {
      then('it passes, so get exits 0', () => {
        expect(() =>
          assertBrainAuthUsageReadable({
            usages: [
              genUsage({ email: 'a@example.com', status: 'read' }),
              genUsage({ email: 'b@example.com', status: 'unreadable' }),
            ],
            owner: 'ehmpath',
          }),
        ).not.toThrow();
      });
    });
  });

  given('[case2] every account rate-limited (case=11 [t1])', () => {
    when('[t0] the table is judged', () => {
      then(
        'it fails as a malfunction, so get exits 1 and the hint says wait',
        async () => {
          const error = await getError(() =>
            assertBrainAuthUsageReadable({
              usages: [
                genUsage({ email: 'a@example.com', status: 'rate-limited' }),
                genUsage({ email: 'b@example.com', status: 'rate-limited' }),
              ],
              owner: 'ehmpath',
            }),
          );
          expect(error.constructor.name).toEqual('MalfunctionError');
          expect(error.message).toContain('wait a few minutes');
          expect(error.message).not.toContain('rhx brains auth set');
          expect(error).toMatchSnapshot();
        },
      );
    });
  });

  given('[case3] every account dead', () => {
    when('[t0] the table is judged', () => {
      then(
        'it fails as a constraint, so get exits 2 and names set',
        async () => {
          const error = await getError(() =>
            assertBrainAuthUsageReadable({
              usages: [genUsage({ email: 'a@example.com', status: 'dead' })],
              owner: 'ehmpath',
            }),
          );
          expect(error.constructor.name).toEqual('ConstraintError');
          expect(error.message).toContain('rhx brains auth set --brain claude');
          expect(error).toMatchSnapshot();
        },
      );
    });
  });

  given('[case3b] only the signed-in login, refused', () => {
    when('[t0] the table is judged', () => {
      then(
        'it fails as a constraint, and names /login, never set',
        async () => {
          const error = await getError(() =>
            assertBrainAuthUsageReadable({
              usages: [
                genUsage({
                  email: 'a@example.com',
                  status: 'dead',
                  signedIn: true,
                }),
              ],
              owner: 'ehmpath',
            }),
          );
          expect(error.constructor.name).toEqual('ConstraintError');
          expect(error.message).toContain('run `/login` in any claude session');
          expect(error.message).not.toContain('rhx brains auth set');
          expect(error).toMatchSnapshot();
        },
      );
    });
  });

  given('[case3c] the signed-in login and a stored one, both refused', () => {
    when('[t0] the table is judged', () => {
      then('the hint names each fix for its own kind', async () => {
        const error = await getError(() =>
          assertBrainAuthUsageReadable({
            usages: [
              genUsage({
                email: 'a@example.com',
                status: 'dead',
                signedIn: true,
              }),
              genUsage({ email: 'b@example.com', status: 'dead' }),
            ],
            owner: 'ehmpath',
          }),
        );
        expect(error.message).toContain(
          '`/login` in claude for the signed-in one',
        );
        expect(error.message).toContain('rhx brains auth set --brain claude');
        expect(error).toMatchSnapshot();
      });
    });
  });

  given('[case4] only the grove, named unverified', () => {
    when('[t0] the table is judged', () => {
      then('it passes: the row names its own fix', () => {
        expect(() =>
          assertBrainAuthUsageReadable({
            usages: [
              genUsage({ email: 'a@example.com', status: 'unverified' }),
            ],
            owner: 'ehmpath',
          }),
        ).not.toThrow();
      });
    });
  });

  given('[case5] no account stored', () => {
    when('[t0] the table is judged', () => {
      then('it passes: the empty table names set', () => {
        expect(() =>
          assertBrainAuthUsageReadable({ usages: [], owner: 'ehmpath' }),
        ).not.toThrow();
      });
    });
  });

  given('[case6] no row read, and the keyrack would not open one', () => {
    when('[t0] the table is judged', () => {
      then(
        'it fails as a constraint, so get exits 2 and names the unlock',
        async () => {
          const error = await getError(() =>
            assertBrainAuthUsageReadable({
              usages: [
                genUsage({ email: 'a@example.com', status: 'locked' }),
                genUsage({ email: 'b@example.com', status: 'dead' }),
              ],
              owner: 'ehmpath',
            }),
          );
          expect(error.constructor.name).toEqual('ConstraintError');
          expect(error.message).toContain(
            'rhx keyrack unlock --owner ehmpath --env prep',
          );
          expect(error).toMatchSnapshot();
        },
      );
    });
  });
});
