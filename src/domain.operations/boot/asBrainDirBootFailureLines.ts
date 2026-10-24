import { HelpfulError } from 'helpful-errors';

import { asErrorClassText } from '@src/utils/asErrorClassText';

import { asBrainDirBootScopeLabel } from './asBrainDirBootScopeLabel';
import type { BrainDirBootFailure } from './BrainDirBootRender';

/**
 * .what = the stderr lines for one brain dir that failed to render: the scope as the headline,
 *         the error class and message as the first branch, then every metadata field the throw
 *         site supplied, the hint last
 * .why = a sweep continues past a failure, so each failure must be named where a human reads it,
 *        with all its context and its fix, and never as a raw stack
 *
 * .note = one glyph per line: the headline carries the `✗` alone, and the class line carries its
 *         own `✋`/`💥`. a list value renders one item per leaf, never as compact json
 * .note = a HelpfulError's message appends its serialized metadata; the message is redacted of that
 *         blob so each field rides on a line of its own instead — no field is dropped
 */
export const asBrainDirBootFailureLines = (input: {
  failure: BrainDirBootFailure;
}): string[] => {
  const { cause } = input.failure;
  const label = asBrainDirBootScopeLabel({ scope: input.failure.scope });
  const headline = `✗ ${label}/boot.md not written`;

  // the class name is the one token a reader greps: a HelpfulError's message already opens with
  // its `<glyph> <ClassName>:`, and an unclassified cause gets its bare class so it stays findable
  const classLine = asErrorClassText({ error: cause });

  // every metadata field the throw site supplied, the hint last so the fix reads final
  const metadata: Record<string, unknown> =
    cause instanceof HelpfulError ? (cause.metadata ?? {}) : {};
  const keysOrdered = [
    ...Object.keys(metadata).filter((key) => key !== 'hint'),
    ...('hint' in metadata ? ['hint'] : []),
  ];

  // the class line, then one branch per field; the last branch closes the trunk
  const branches = [
    { lines: [classLine] },
    ...keysOrdered.map((key) => ({
      lines: asFieldLines({ key, value: metadata[key] }),
    })),
  ];
  const branchLines = branches.flatMap((branch, index) => {
    const isLast = index === branches.length - 1;
    const [head, ...rest] = branch.lines;
    return [
      `   ${isLast ? '└─' : '├─'} ${head}`,
      ...rest.map((line) => `   ${isLast ? '  ' : '│ '} ${line}`),
    ];
  });
  return [headline, ...branchLines];
};

/**
 * .what = the lines for one metadata field: `key = value`, or the key over one leaf per item
 * .why = a compact json list (`["a","b"]`) reads as a blob; one leaf per item scans
 */
const asFieldLines = (input: { key: string; value: unknown }): string[] => {
  const { key, value } = input;
  if (!Array.isArray(value) || value.length === 0)
    return [`${key} = ${asFieldWords({ value })}`];
  return [
    key,
    ...value.map(
      (item, index) =>
        `${index === value.length - 1 ? '└─' : '├─'} ${asFieldWords({ value: item })}`,
    ),
  ];
};

/**
 * .what = the words for one metadata value
 * .why = an Error serializes to `{}` under JSON.stringify, so a `cause` field would print blank;
 *        its class and message are the reason a human needs
 */
const asFieldWords = (input: { value: unknown }): string => {
  if (typeof input.value === 'string') return input.value;
  if (input.value instanceof Error)
    return `${input.value.constructor.name}: ${input.value.message}`;
  return JSON.stringify(input.value);
};
