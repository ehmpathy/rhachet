import { ConstraintError } from 'helpful-errors';

/**
 * .what = the stderr a failed measure prints, and the exit code it ends with
 * .why = the glyph, the class, and the exit code are read off the error itself, so a caller-fix
 *   error reads `✋ ConstraintError` and exits 2, and a system-fix error reads `💥` and exits 1;
 *   never one class pinned for all (`rule.require.unabridged-error-prefix`)
 *
 * .note = helpful-errors may carry its own `<glyph> <Class>: ` lead on the message; it is cut, so
 *   the header names the class once
 */
export const asMeasureErrorRender = (input: {
  error: unknown;
}): { stderr: string; exitCode: 1 | 2 } => {
  const isConstraint = input.error instanceof ConstraintError;
  const name = input.error instanceof Error ? input.error.constructor.name : 'Error';
  const lineFirst = input.error instanceof Error ? input.error.message.split('\n')[0] : String(input.error);
  const message = (lineFirst ?? '').replace(/^\S*\s*\w*Error:\s*/, '');
  const hint = (input.error as { metadata?: { hint?: unknown } } | null)?.metadata?.hint;
  return {
    stderr: [
      `${isConstraint ? '✋' : '💥'} ${name}: ${message}`,
      ...(typeof hint === 'string' ? [`   └─ ${hint}`] : []),
      '',
    ].join('\n'),
    exitCode: isConstraint ? 2 : 1,
  };
};
