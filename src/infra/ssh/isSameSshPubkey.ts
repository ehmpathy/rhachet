/**
 * .what = decide whether two ssh pubkey strings name the SAME key, apart from the
 *         comment field and any stray whitespace
 * .why = an ssh pubkey line is `<type> <base64-body> [comment]`. the type + body fix
 *        the key identity; the comment is free text (a hostname, an email) that drifts
 *        between where a key was generated and where it was later stored. the migrate
 *        legacy-shape gate compares the manifest's stored recipient pubkey against the
 *        key on disk, and those two can carry different comments (or a stray newline)
 *        for the very same key — so a raw `===` would miss a genuine match. compare the
 *        identity-bearing first two fields only
 *
 * .note = pure + total: a malformed input (fewer than two fields) simply cannot match a
 *         well-formed key, so it returns false rather than throw — the caller is a gate
 *         that treats a non-match as "not this legacy shape", never a fault
 */
export const isSameSshPubkey = (input: { a: string; b: string }): boolean => {
  // keep the first two fields — `<type> <base64>` — which fix the key identity
  const asKeyBody = (pubkey: string): string =>
    pubkey.trim().split(/\s+/).slice(0, 2).join(' ');
  const bodyA = asKeyBody(input.a);
  const bodyB = asKeyBody(input.b);

  // a well-formed body has two fields; a single-field input cannot name a key
  if (!bodyA.includes(' ')) return false;
  return bodyA === bodyB;
};
