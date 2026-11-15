import { ConstraintError } from 'helpful-errors';

/**
 * .what = read a millisecond duration from an env var, or fall back to a default
 * .why = an unparseable override is a silent catastrophe for a daemon timer. parseInt
 *        yields NaN, and NaN poisons a duration in invisible ways: setInterval(fn, NaN)
 *        fires as fast as the loop allows, and `x < NaN` is always false, so a gate no
 *        longer holds. neither raises an error
 *
 * .note = caller-fixable (correct the env var) -> ConstraintError, not a server fault
 */
export const getOneDurationMsFromEnv = (input: {
  envVar: string;
  fallbackMs: number;
}): number => {
  const raw = process.env[input.envVar];
  if (!raw) return input.fallbackMs;

  // the whole string must be digits, not merely start with them
  // .why = parseInt is a *prefix* parse: '1.5px' yields 1, so a typo'd unit would
  // silently become a 1ms interval — a busy loop — rather than raise. the shape is
  // verified on the raw string so the leniency cannot reach the duration
  if (!/^\d+$/.test(raw) || parseInt(raw, 10) <= 0)
    throw new ConstraintError(
      `${input.envVar} must be a positive integer of milliseconds`, // e.g. "900000"
      {
        [input.envVar]: raw,
        hint: `set ${input.envVar} to a positive integer of milliseconds, digits only, e.g. "900000" — or unset it to fall back to ${input.fallbackMs}ms`,
      },
    );

  return parseInt(raw, 10);
};
