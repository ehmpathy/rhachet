import { MalfunctionError } from 'helpful-errors';

/**
 * .what = whether a parsed json reply carries the string `systemMessage` a warn needs
 */
const isWarnReply = (reply: unknown): reply is { systemMessage: string } =>
  typeof reply === 'object' &&
  reply !== null &&
  'systemMessage' in reply &&
  typeof reply.systemMessage === 'string';

/**
 * .what = the text parsed as json, or null where it is no json
 * .why = an empty or non-json stdout is the same defect as a reply with no `systemMessage`; each
 *        shape reaches the one loud error below, never a bare SyntaxError
 * .note = an allowlist: only a SyntaxError is a non-json text; aught else raises
 */
const asJsonOrNull = (input: { text: string }): unknown => {
  try {
    return JSON.parse(input.text);
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error;
    return null;
  }
};

/**
 * .what = the json reply a stop hook prints to warn, parsed and its shape checked
 * .why = the brain-cli reads `systemMessage`; a reply that lacks it is a defect the clamp names,
 *        never a field the test reads as undefined
 */
export const asHookWarnReply = (input: {
  stdout: string;
}): { systemMessage: string } => {
  const lineLast = input.stdout.trim().split('\n').pop() ?? '';
  const reply = asJsonOrNull({ text: lineLast });
  if (!isWarnReply(reply))
    throw new MalfunctionError('stop hook stdout holds no json warn reply', {
      stdout: input.stdout,
      hint: 'a warn reply ends stdout with one json line that carries a string `systemMessage`',
    });
  return { systemMessage: reply.systemMessage };
};
