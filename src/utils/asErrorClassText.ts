import { HelpfulError } from 'helpful-errors';

import { asThrownValueText } from './asThrownValueText';

/**
 * .what = an arbitrary caught value as `<ClassName>: <message>` — the class token first
 * .why = the class is the actionable token and the one a reader greps. a report that shows a
 *        glyph alone cannot be searched for, and a glyph is a VERDICT: stamp a literal class
 *        on an error whose class you never read and the line asserts a classification nobody
 *        made (`rule.require.unabridged-error-prefix`)
 *
 * 🚨 .why a HelpfulError takes a different branch = it already bakes `<glyph> <ClassName>: `
 *   at the front of `.message`, so a prepended class token would render a SECOND one beside
 *   it — the same defect the frame produces when a throw site bakes its own glyph
 *   (`assureUniqueRoles`). so here the baked prefix is USED rather than duplicated.
 *
 * ⚠️ the metadata blob is redacted off a HelpfulError's message. `HelpfulError` appends its
 *   serialized metadata to `.message`, which is right for a stderr render that has the room
 *   and wrong for a one-row report line, where it buries the sentence.
 *
 * .note = ONE owner, deliberately. four sites render a caught error into an operational
 *   report — the boot-failure headline, the hook-sync row, the package-load row, and the
 *   config-load row — and a copy at each would drift on the day the class-token shape moves.
 */
export const asErrorClassText = (input: { error: unknown }): string => {
  const { error } = input;

  // a HelpfulError owns its own `<glyph> <ClassName>: ` prefix — use it, never a second one
  if (error instanceof HelpfulError) return error.redact(['metadata']).message;

  // an unclassified Error carries no prefix, so its bare class keeps the line findable
  if (error instanceof Error)
    return `${error.constructor.name}: ${error.message}`;

  // a non-Error throw has no class and no message; a total render is all there is to report
  return asThrownValueText(error);
};
