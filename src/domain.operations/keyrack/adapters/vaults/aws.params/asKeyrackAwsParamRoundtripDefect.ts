/**
 * .what = classify a just-written SSM value's read-back: null when it matches, else the
 *         defect (message + the right hint) for the caller to throw
 * .why = a broken write/grant must fail at set, not later at unlock; the two failure modes
 *        (absent read-back vs value mismatch) have distinct causes, so distinct hints
 *
 * .note = both hints state a value WAS written and REMAINS at exid despite the reported
 *         failure — the write landed before the verify ran, so a "failed" set changed live
 *         state; a re-set will overwrite it
 */
export const asKeyrackAwsParamRoundtripDefect = (input: {
  written: string;
  readback: { value: string } | null;
  exid: string;
}): { message: string; hint: string } | null => {
  // absent read-back — a path/consistency defect
  if (input.readback === null)
    return {
      message:
        'aws.params roundtrip verify: the just-written param did not read back',
      hint: `a path/consistency issue — confirm the param name and that the write landed. a value may now sit at ${input.exid}; a re-set will overwrite it, or remove it out-of-band`,
    };

  // value mismatch — a decrypt/grant defect
  if (input.readback.value !== input.written)
    return {
      message:
        'aws.params roundtrip verify: read-back value did not match the written blob',
      hint: `a decrypt/grant issue — confirm the kms:Decrypt grant on the key the SSM param uses. a blob now sits at ${input.exid}; a re-set will overwrite it once the grant is fixed`,
    };

  // clean roundtrip — no defect
  return null;
};
