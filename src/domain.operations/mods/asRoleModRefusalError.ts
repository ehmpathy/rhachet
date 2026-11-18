import { ConstraintError } from 'helpful-errors';

/**
 * .what = the one refusal shape for every mod a render cannot apply
 * .why = each refusal names the mod dir, what is wrong, and the fix; a uniform shape lets
 *        a reader scan many refusals, and lets a test assert on one header form
 *
 * .note = `nearest` is the "did you mean" — a held path, a linked `repo/role`, or null
 */
export const asRoleModRefusalError = (input: {
  role: string;
  problem: string;
  subject: string;
  nearest: string | null;
  fix: string;
}): Error =>
  new ConstraintError(
    `the mod of role=${input.role} is refused: ${input.problem}`,
    {
      mod: `.agent/repo=.mods/role=${input.role}/`,
      subject: input.subject,
      ...(input.nearest ? { 'did you mean': input.nearest } : {}),
      fix: input.fix,
    },
  );
