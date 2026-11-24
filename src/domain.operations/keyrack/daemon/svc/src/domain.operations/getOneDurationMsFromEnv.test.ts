import { ConstraintError } from 'helpful-errors';
import { getError } from 'test-fns';

import { getOneDurationMsFromEnv } from './getOneDurationMsFromEnv';

const ENV_VAR = 'KEYRACK_TEST_DURATION_MS';

describe('getOneDurationMsFromEnv', () => {
  // .note = deliberate mutation: each case sets the env var; restore after each
  const envBefore = process.env[ENV_VAR];
  afterEach(() => {
    if (envBefore === undefined) delete process.env[ENV_VAR];
    if (envBefore !== undefined) process.env[ENV_VAR] = envBefore;
  });

  test('an unset var falls back to the default', () => {
    delete process.env[ENV_VAR];
    expect(
      getOneDurationMsFromEnv({ envVar: ENV_VAR, fallbackMs: 500 }),
    ).toEqual(500);
  });

  test('a digits-only var yields its value', () => {
    process.env[ENV_VAR] = '900000';
    expect(
      getOneDurationMsFromEnv({ envVar: ENV_VAR, fallbackMs: 500 }),
    ).toEqual(900000);
  });

  const REFUSED = ['1.5px', '0', '-5', 'abc'];
  REFUSED.map((raw) =>
    test(`a var of "${raw}" is refused with a ConstraintError`, () => {
      process.env[ENV_VAR] = raw;
      const error = getError(() =>
        getOneDurationMsFromEnv({ envVar: ENV_VAR, fallbackMs: 500 }),
      );
      expect(error).toBeInstanceOf(ConstraintError);
      expect(error.message).toContain(ENV_VAR);
    }),
  );
});
