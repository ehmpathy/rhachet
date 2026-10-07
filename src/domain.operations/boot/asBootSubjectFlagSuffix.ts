/**
 * .what = the ` --subject a,b` suffix a halt appends to each command it prints, or '' for none
 * .why = the header and the cost line must quote the same slice the gate measured, so the
 *        suffix has one owner (`rule.require.named-transformers`)
 *
 * .note = `?.length` rather than a null check. an ABSENT `--subject` is `undefined` (boot every
 *   subject), so the flag is omitted and the extant render stays byte-identical. an empty
 *   `--subject` is refused upstream, so it cannot arrive here.
 */
export const asBootSubjectFlagSuffix = (input: {
  subjects: string[] | undefined;
}): string =>
  input.subjects?.length ? ` --subject ${input.subjects.join(',')}` : '';
