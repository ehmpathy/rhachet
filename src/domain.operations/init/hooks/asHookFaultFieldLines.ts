import { HelpfulError } from 'helpful-errors';

/**
 * .what = one `key = value` line per metadata field of a hook sync fault, the hint last
 * .why = a sync refusal names what it refused and how to fix it in its metadata; the fault row
 *   prints only the message, so without these lines a role author reads the symptom alone
 *   (`rule.require.errors-name-the-fix`)
 * .note = a string value with a line break renders as json, so one field stays one line
 */
export const asHookFaultFieldLines = (input: { error: Error }): string[] => {
  const metadata: Record<string, unknown> =
    input.error instanceof HelpfulError ? (input.error.metadata ?? {}) : {};
  const keysOrdered = [
    ...Object.keys(metadata).filter((key) => key !== 'hint'),
    ...('hint' in metadata ? ['hint'] : []),
  ];
  return keysOrdered.map(
    (key) => `${key} = ${asFieldWords({ value: metadata[key] })}`,
  );
};

/**
 * .what = the words for one metadata value, on one line
 * .why = an Error serializes to `{}` under JSON.stringify; its class and message are the reason
 */
const asFieldWords = (input: { value: unknown }): string => {
  if (typeof input.value === 'string' && !/[\r\n]/.test(input.value))
    return input.value;
  if (input.value instanceof Error)
    return `${input.value.constructor.name}: ${input.value.message}`;
  return JSON.stringify(input.value);
};
