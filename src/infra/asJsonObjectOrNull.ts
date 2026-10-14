import { asRecordOrNull } from './asRecordOrNull';

/**
 * .what = parse content as a json object, or null when it is not one (bad json, an array, a scalar)
 * .why = a settings file a human or a role init wrote may be any of those; each reader must tell a
 *        usable object apart from the rest without a throw
 * .note = the settings layout and the settings shield both read through this, and must agree on
 *   what a usable object is
 */
export const asJsonObjectOrNull = (input: {
  content: string;
}): Record<string, unknown> | null =>
  asRecordOrNull({ value: asJsonOrUndefined({ content: input.content }) });

/**
 * .what = parse content as json, or undefined when it is not json
 * .note = only a `SyntaxError` means "not json"; any other fault propagates (failhide)
 */
const asJsonOrUndefined = (input: { content: string }): unknown => {
  try {
    return JSON.parse(input.content);
  } catch (error) {
    if (error instanceof SyntaxError) return undefined;
    throw error;
  }
};
