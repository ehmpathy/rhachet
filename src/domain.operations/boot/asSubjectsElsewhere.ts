/**
 * .what = the subjects a role declares that a focus did not name
 * .why = a focused render tells the brain which subjects live elsewhere, so it knows the role
 *        holds more than it was given
 *
 * .note = declared order is kept
 * .note = pure transformer — no i/o, deterministic
 */
export const asSubjectsElsewhere = (input: {
  declared: string[];
  given: string[];
}): string[] =>
  input.declared.filter((subject) => !input.given.includes(subject));
