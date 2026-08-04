import { HelpfulError } from 'helpful-errors';

/**
 * .what = build the human-readable blocked tree report for a keyrack command failure
 * .why = keyrack roots its output on its own domain glyph, the lock 🔐 — a credential-domain
 *        signature, never a role mascot. the blocked path roots on 🔐 too (no seaturtle vibe
 *        header), so a failure reads as keyrack's own voice, uniform with the 🔐 success root,
 *        instead of a raw exception dump (e.g. a `ConstraintError: …` that leaks the class name)
 *
 * .note = command is the `🔐` root label (e.g. 'keyrack infra init', 'keyrack set')
 * .note = reads the caller-relevant metadata a HelpfulError carries (slug, stderr, hint)
 *         and renders each present field as a tree leaf under the blocked node
 */
export const getKeyrackBlockedReport = (input: {
  error: Error;
  command: string;
}): string => {
  // a HelpfulError bakes a severity emoji + its class name + metadata json into .message
  // (e.g. "✋ ConstraintError: …"); redact the metadata + cause, then strip the emoji and
  // the "SomeError: " class-name prefix so the blocked node reads as a clean human message
  // (not a raw class dump). the `[^A-Za-z]*` eats any emoji + whitespace before the class
  // name; a message without a "SomeError:" prefix is kept as-is
  const redactedMessage =
    input.error instanceof HelpfulError
      ? input.error.redact(['metadata', 'cause']).message
      : input.error.message;
  const bareMessage = redactedMessage.replace(
    /^[^A-Za-z]*[A-Z][A-Za-z]*Error:\s*/,
    '',
  );

  // helpful-errors carry structured metadata; read the caller-relevant fields
  const metadata =
    (input.error as { metadata?: Record<string, unknown> }).metadata ?? {};

  // collect the flat leaves (repo, stderr) that precede the hint, in a stable order.
  // .note = trim the stderr value: a gh boundary error carries a newline at its end, which
  //         would render as a blank line between this leaf and the hint and sever the tree's
  //         `│` margin (rule.require.treestruct-output)
  const flatLeaves: string[] = [];
  if (typeof metadata.slug === 'string')
    flatLeaves.push(`repo: ${metadata.slug}`);
  if (typeof metadata.stderr === 'string' && metadata.stderr.trim())
    flatLeaves.push(`stderr: ${metadata.stderr.trim()}`);

  // a hint may carry multiple `;`-joined conditional branches; split so each renders as
  // its own sub-branch — a single semicolon-joined line wraps mid-phrase in a terminal
  const hint = typeof metadata.hint === 'string' ? metadata.hint : null;
  const hintParts = hint
    ? hint
        .split(';')
        .map((part) => part.trim())
        .filter(Boolean)
    : [];

  // the hint (when present) always closes the branch, so every flat leaf is a mid-branch;
  // absent a hint, the last flat leaf closes the branch
  const flatLines = flatLeaves.map((leaf, i) => {
    const isLast = i === flatLeaves.length - 1 && hintParts.length === 0;
    return isLast ? `      └─ ${leaf}` : `      ├─ ${leaf}`;
  });

  // one hint part renders as a single leaf that closes the branch; multiple parts nest
  const hintLines =
    hintParts.length === 0
      ? []
      : hintParts.length === 1
        ? [`      └─ hint: ${hintParts[0]}`]
        : [
            '      └─ hint:',
            ...hintParts.map((part, i) =>
              i === hintParts.length - 1
                ? `         └─ ${part}`
                : `         ├─ ${part}`,
            ),
          ];

  // assemble the blocked treestruct: 🔐 keyrack domain root, blocked node beneath it.
  // .note = keyrack roots on its own lock glyph 🔐 (never a role mascot) — the blocked path
  //         drops the seaturtle vibe header so a credential-domain failure reads as keyrack's
  //         own voice, uniform with the 🔐 success root (rule.require.keyrack-emoji-palette)
  return [
    '',
    `🔐 ${input.command}`,
    `   └─ ✋ blocked: ${bareMessage}`,
    ...flatLines,
    ...hintLines,
    '',
  ].join('\n');
};
