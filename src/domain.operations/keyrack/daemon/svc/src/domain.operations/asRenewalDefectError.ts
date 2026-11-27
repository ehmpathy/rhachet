/**
 * .what = the error text a `halted` renewal holds for a code defect
 * .why = a defect is named in `keyrack status`, so its text keeps the error's class
 *        (`TypeError: …`) — the one datum that tells a human it is ours to fix
 *        (rule.require.unabridged-error-prefix)
 *
 * .note = the class reads from the constructor, not `.name`: a subclass that does not
 *         set `.name` (as helpful-errors classes do not) still reads `Error` there
 * .note = it opens with `💥`, the glyph a server-owned fault carries, so a defect leaf
 *         reads like its peer fault leaf (`💥 MalfunctionError: …`) in one status tree
 *         (rule.forbid.stormcloud-for-errors)
 */
export const asRenewalDefectError = (input: { defect: unknown }): string =>
  input.defect instanceof Error
    ? `💥 defect ${input.defect.constructor.name}: ${input.defect.message}`
    : `💥 defect: ${String(input.defect)}`;
