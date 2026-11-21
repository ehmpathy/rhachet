import { ConstraintError } from 'helpful-errors';

import { asTextWithFinalNewlineDropped } from '@src/infra/asTextWithFinalNewlineDropped';
import { getStdinContent } from '@src/infra/getStdinContent';

/**
 * .what = read the `keyrack set --source` value off stdin; null when the flag is absent
 * .why = a box with no tty and no gh (a grove off ec2) cannot run the guided setup, so it
 *        files a source credential it reads from upstream on a pipe
 *
 * .note = every refusal names the flag, never the value: a credential is never echoed
 * .note = a tty is refused rather than awaited — `--source` exists for a pipe, and a human
 *         at a terminal has the guided setup (drop `--source`)
 * .note = which vault accepts a piped source is the vault's own declaration
 *         (`isSourcePipedAccepted`); `setKeyrackKeyHost` refuses the rest before any write,
 *         so this getter holds no vault list
 * .note = only one final newline is stripped, the same as the extant piped replica prompt
 *         (`promptHiddenInput`), so a secret piped either way stores byte-identical
 */
export const getOneKeyrackSetSourcePiped = async (
  input: {
    flag: string | null;
    isStdinTty: boolean;
  },
  context?: { stdin?: AsyncIterable<unknown> },
): Promise<string | null> => {
  // no flag, no piped source — the vault runs its guided setup
  if (input.flag === null) return null;

  // refuse any value but the @stdin sentinel
  if (input.flag !== '@stdin')
    throw new ConstraintError('--source accepts only @stdin', {
      hint: 'pipe the source in: `<upstream read> | rhx keyrack set ... --source @stdin`',
    });

  // refuse a terminal — no pipe was given
  if (input.isStdinTty)
    throw new ConstraintError('--source @stdin found a terminal, not a pipe', {
      hint: 'pipe the source in: `<upstream read> | rhx keyrack set ... --source @stdin`, or drop --source to run the guided setup',
    });

  // read the pipe, strip one final newline; refuse an empty one
  const text = await getStdinContent({ trim: false }, context);
  const source = asTextWithFinalNewlineDropped({ text });
  if (source.trim() === '')
    throw new ConstraintError('--source @stdin received an empty value', {
      hint: 'check the upstream read; it wrote no bytes to the pipe',
    });
  return source;
};
