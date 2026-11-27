import { HelpfulError } from 'helpful-errors';

/**
 * .what = the fix a mod fault carries, or null where it names none
 * .why = every mod refusal sets `fix` in its metadata; each surface that names a fault reads it
 *        one way, so the boot, the readout, and the stop teach the same words
 *
 * .note = a refusal that names candidates (`did you mean`) carries them in the fix, since each
 *   surface shows one fix line and no metadata
 */
export const asRoleModFaultFix = (input: { error: Error }): string | null => {
  if (!(input.error instanceof HelpfulError)) return null;
  const metadata = input.error.metadata ?? {};
  const fix = metadata.fix;
  if (typeof fix !== 'string') return null;
  const candidates = metadata['did you mean'];
  if (typeof candidates !== 'string') return fix;
  return `${fix} (did you mean: ${candidates})`;
};
