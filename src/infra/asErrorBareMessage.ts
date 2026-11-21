import { HelpfulError } from 'helpful-errors';

/**
 * .what = an error's human message, with no class prefix, metadata, or cause
 * .why = a HelpfulError bakes "<glyph> <ClassName>: " and its metadata json into `.message`; a
 *        caller that re-renders or re-wraps the fault needs the headline alone
 *
 * .note = the strip keys on the actual class name (constructor.name), and only where the token
 *         sits at the very start after an optional glyph run, so a mid-message occurrence is
 *         never cut; otherwise the message is kept verbatim
 */
export const asErrorBareMessage = (input: { error: unknown }): string => {
  // redact metadata + cause from a HelpfulError, so the message holds the headline only
  const rawMessage =
    input.error instanceof HelpfulError
      ? input.error.redact(['metadata', 'cause']).message
      : input.error instanceof Error
        ? input.error.message
        : String(input.error);

  // strip the class-name prefix off the real class token
  const className =
    input.error instanceof Error ? input.error.constructor.name : null;
  const markerAt = className ? rawMessage.indexOf(`${className}: `) : -1;
  if (className === null || markerAt < 0) return rawMessage;
  if (!/^[^A-Za-z]*$/.test(rawMessage.slice(0, markerAt))) return rawMessage;
  return rawMessage.slice(markerAt + `${className}: `.length);
};
