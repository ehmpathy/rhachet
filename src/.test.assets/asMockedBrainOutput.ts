import { ConstraintError } from 'helpful-errors';
import type { z } from 'zod';

/**
 * .what = parses a mocked brain's answer by the caller's schema; a misfit names output.<verb>
 * .why = a bare zod issue list names the key, but not the mock input that fills it; the hint
 *   points the suite author at the exact field to change
 */
export const asMockedBrainOutput = <TOutput>(input: {
  mock: 'genMockedBrainRepl' | 'genMockedBrainAtom';
  verb: 'ask' | 'act';
  schema: z.Schema<TOutput>;
  output: unknown;
}): TOutput => {
  // parse by the caller's schema
  const parsed = input.schema.safeParse(input.output);
  if (parsed.success) return parsed.data;

  // a misfit is a test setup slip: name each absent or wrong key, and the field to fix
  throw new ConstraintError(
    `${input.mock}'s answer to '${input.verb}' does not fit the caller's schema`,
    {
      mock: input.mock,
      verb: input.verb,
      output: input.output,
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
      hint: `set output.${input.verb} to the shape the caller's schema wants`,
    },
  );
};
