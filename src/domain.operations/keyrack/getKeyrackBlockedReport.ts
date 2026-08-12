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

  // collect the flat leaves (repo, stderr, note) that precede the hint, in a stable order.
  // .note = trim the stderr value: a gh boundary error carries a newline at its end, which
  //         would render as a blank line between this leaf and the hint and sever the tree's
  //         `│` margin (rule.require.treestruct-output)
  const flatLeaves: string[] = [];
  if (typeof metadata.slug === 'string')
    flatLeaves.push(`repo: ${metadata.slug}`);
  if (typeof metadata.stderr === 'string' && metadata.stderr.trim())
    flatLeaves.push(`stderr: ${metadata.stderr.trim()}`);
  if (typeof metadata.note === 'string' && metadata.note.trim())
    flatLeaves.push(`why: ${metadata.note.trim()}`);

  // the last leaf is the FIX — the one line a human copy-pastes. two metadata keys carry it
  // in this repo (`hint` and `fix`), and both must render.
  // ⚠️ .why both = the message body is `redact(['metadata'])`ed above, so a field this
  //    renderer does not explicitly re-emit is DROPPED. before `fix` was read here, every
  //    throw site that named its remedy under `fix:` rendered as a bare symptom with no way
  //    forward — `rule.require.errors-name-the-fix` violated by omission, and invisibly,
  //    because the throw site looked correct and only the render lost it.
  //    `unlockKeyrackKeys`'s "key not found in manifest" is the case that caught it: it
  //    carries `fix: rhx keyrack set …` and a human saw none of it
  const hint =
    typeof metadata.hint === 'string'
      ? metadata.hint
      : typeof metadata.fix === 'string'
        ? metadata.fix
        : null;

  // a hint may carry multiple `;`-joined conditional branches; split so each renders as
  // its own sub-branch — a single semicolon-joined line wraps mid-phrase in a terminal
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

  // group the hint parts into a two-level tree: a part that ends with `:` is a HEADER, and the
  // parts that come after it (until the next header) are its CHILDREN. this keeps a header — e.g.
  // the grant-list's "aws.params set needs these grants on this identity:" — as the visual parent
  // of its items, instead of a flat render of header + items as equal-weight siblings, so a human
  // who reads the tree sees the grant lines belong to the header (rule.require.treestruct-output).
  // a part with no `:` at its end, or a header with no children after it, renders as a plain leaf
  const hintNodes: { text: string; children: string[] }[] = [];
  for (const part of hintParts) {
    const openNode = hintNodes[hintNodes.length - 1];
    const isChild =
      !!openNode && openNode.text.endsWith(':') && !part.endsWith(':');
    if (isChild) openNode.children.push(part);
    else hintNodes.push({ text: part, children: [] });
  }

  // one hint part renders as a single leaf that closes the branch; multiple parts nest under the
  // `hint:` node, and a header node further nests its children one level deeper
  const hintLines =
    hintParts.length === 0
      ? []
      : hintParts.length === 1
        ? [`      └─ hint: ${hintParts[0]}`]
        : [
            '      └─ hint:',
            ...hintNodes.flatMap((node, i) => {
              const isLastNode = i === hintNodes.length - 1;
              const nodeLine = `         ${isLastNode ? '└─' : '├─'} ${node.text}`;
              if (node.children.length === 0) return [nodeLine];
              // a header's children indent one level deeper; carry a `│` margin only when the
              // header is not the last node, so the tree's vertical rail stays unbroken
              const childMargin = isLastNode ? '            ' : '         │  ';
              const childLines = node.children.map((child, j) =>
                j === node.children.length - 1
                  ? `${childMargin}└─ ${child}`
                  : `${childMargin}├─ ${child}`,
              );
              return [nodeLine, ...childLines];
            }),
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
