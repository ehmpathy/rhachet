import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';

/**
 * .what = extracts the peer prefix and extension from a chosen file
 * .why = used to identify all peer files sharing the same base name
 *
 * supports trailing qualifier tokens (zero or more) before the final extension:
 * - .v{number}
 * - .i{number}
 * - ._
 * - .{word}  (e.g., .choice)
 *
 * examples (prefix ► extension):
 * - foo.[stories]._.md                  ► foo.[stories] ► md
 * - foo.[stories].v1._.md               ► foo.[stories] ► md
 * - foo.[stories].v1.i3.md              ► foo.[stories] ► md
 * - foo.[stories].choice.v1.i3.md       ► foo.[stories] ► md
 * - foo.[stories].src                   ► foo.[stories] ► src
 * - foo.[stories].v1.src                ► foo.[stories] ► src
 * - foo.[notes].i2.txt                  ► foo.[notes]   ► txt
 */
export const getPeerQualifiersOfOutputChoice = (
  choice: string,
): { prefix: string; extension: string } => {
  // grab the last dotted segment as the extension
  const extMatch = choice.match(/^(.+)\.([A-Za-z0-9]+)$/);
  if (!extMatch)
    BadRequestError.throw(`unrecognized file naming pattern`, { choice });

  // instantiate a mutable base
  let base: string =
    extMatch[1] ??
    UnexpectedCodePathError.throw('how is there no base?', {
      extMatch,
      choice,
    });
  const extension = extMatch[2];

  // strip trailing qualifier tokens like .v1, .i3, ._, .choice (in that order, repeatedly)
  const QUALIFIER_RE = /\.(?:v\d+|i\d+|_|[a-z][a-z0-9_-]*)$/i;
  while (QUALIFIER_RE.test(base)) {
    base = base.replace(QUALIFIER_RE, '');
  }

  const prefix =
    base ??
    BadRequestError.throw('could not extract prefix from output choice', {
      choice,
    });

  const ext =
    extension ??
    BadRequestError.throw('could not extract extension from output choice', {
      choice,
    });

  return { prefix, extension: ext };
};
