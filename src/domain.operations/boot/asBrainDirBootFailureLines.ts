import { HelpfulError } from 'helpful-errors';

import { asErrorClassText } from '@src/utils/asErrorClassText';

import { asBrainDirBootScopeLabel } from './asBrainDirBootScopeLabel';
import type { BrainDirBootFailure } from './BrainDirBootRender';

/**
 * .what = the stderr lines for one brain dir that failed to render: the scope, the error class and
 *         message, then every metadata field the throw site supplied, the hint last
 * .why = a sweep continues past a failure, so each failure must be named where a human reads it,
 *        with all its context and its fix, and never as a raw stack
 *
 * .note = a HelpfulError's message appends its serialized metadata; the message is redacted of that
 *         blob so each field rides on a line of its own instead — no field is dropped
 */
export const asBrainDirBootFailureLines = (input: {
  failure: BrainDirBootFailure;
}): string[] => {
  const { cause } = input.failure;
  const label = asBrainDirBootScopeLabel({ scope: input.failure.scope });

  // the class name is the one token a reader greps: a HelpfulError's message already opens with
  // its `<glyph> <ClassName>:`, and an unclassified cause gets its bare class so it stays findable
  const isHelpful = cause instanceof HelpfulError;
  const message = asErrorClassText({ error: cause });
  const headline = `✗ boot.md (${label}) not written: ${message}`;

  // every metadata field the throw site supplied, the hint last so the fix reads final
  const metadata: Record<string, unknown> = isHelpful
    ? (cause.metadata ?? {})
    : {};
  const keysOrdered = [
    ...Object.keys(metadata).filter((key) => key !== 'hint'),
    ...('hint' in metadata ? ['hint'] : []),
  ];
  const fieldLines = keysOrdered.map((key, index) => {
    const value = metadata[key];
    const words = asFieldWords({ value });
    const branch = index === keysOrdered.length - 1 ? '└─' : '├─';
    return `   ${branch} ${key}: ${words}`;
  });
  return [headline, ...fieldLines];
};

/**
 * .what = the words for one metadata field value
 * .why = an Error serializes to `{}` under JSON.stringify, so a `cause` field would print blank;
 *        its class and message are the reason a human needs
 */
const asFieldWords = (input: { value: unknown }): string => {
  if (typeof input.value === 'string') return input.value;
  if (input.value instanceof Error)
    return `${input.value.constructor.name}: ${input.value.message}`;
  return JSON.stringify(input.value);
};
