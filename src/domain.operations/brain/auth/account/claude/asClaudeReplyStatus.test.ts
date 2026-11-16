import { given, then, when } from 'test-fns';

import { asClaudeReplyStatus } from './asClaudeReplyStatus';

const TEST_CASES = [
  {
    description: 'a mint that succeeds is ok',
    given: { call: 'mint', httpStatus: 200 },
    expect: 'ok',
  },
  {
    description: 'a read that succeeds is ok',
    given: { call: 'read', httpStatus: 200 },
    expect: 'ok',
  },
  {
    description: 'a throttled mint is rate-limited',
    given: { call: 'mint', httpStatus: 429 },
    expect: 'rate-limited',
  },
  {
    description: 'a throttled read is rate-limited',
    given: { call: 'read', httpStatus: 429 },
    expect: 'rate-limited',
  },
  {
    description: 'a mint the server faults on is unreadable',
    given: { call: 'mint', httpStatus: 503 },
    expect: 'unreadable',
  },
  {
    description: 'a read the server faults on is unreadable',
    given: { call: 'read', httpStatus: 500 },
    expect: 'unreadable',
  },
  {
    description: 'a redirect is unreadable, never followed',
    given: { call: 'read', httpStatus: 302 },
    expect: 'unreadable',
  },
  {
    description: 'a mint refused with 400 is dead (spent refresh token)',
    given: { call: 'mint', httpStatus: 400 },
    expect: 'dead',
  },
  {
    description: 'a mint refused with 401 is dead',
    given: { call: 'mint', httpStatus: 401 },
    expect: 'dead',
  },
  {
    description: 'a read refused with 401 is dead (lapsed access token)',
    given: { call: 'read', httpStatus: 401 },
    expect: 'dead',
  },
  {
    description: 'a read refused with 403 is dead',
    given: { call: 'read', httpStatus: 403 },
    expect: 'dead',
  },
  {
    description: 'a read with an odd 404 is unreadable, not dead',
    given: { call: 'read', httpStatus: 404 },
    expect: 'unreadable',
  },
] as const;

describe('asClaudeReplyStatus', () => {
  TEST_CASES.map((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] the reply is judged', () => {
        then(`it reads ${thisCase.expect}`, () => {
          expect(asClaudeReplyStatus(thisCase.given)).toEqual(thisCase.expect);
        });
      });
    }),
  );
});
