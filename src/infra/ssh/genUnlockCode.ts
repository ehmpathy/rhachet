import { randomInt } from 'node:crypto';

/**
 * .what = the alphabet for a visual-match unlock code — uppercase letters + digits with
 *         the ambiguous glyphs removed (no 0/O, 1/I/L), so a human who compares the CLI code
 *         to the dialog code can never mis-read one for the other
 * .why  = the whole value of the code is a confident eyeball match; an alphabet that lets
 *         `0` and `O` (or `1`, `I`, `L`) blur would produce false mismatches AND false
 *         matches, so the anti-spoof signal degrades. this is the crockford-base32 spirit
 */
const UNLOCK_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * .what = mint a fresh, short, human-comparable visual-match code for one unlock
 * .why  = the confused-deputy defense (rule.forbid.contextless-unlock-prompt): the CLI
 *         prints this code and the SAME code renders in the passphrase dialog, so the human
 *         confirms the dialog belongs to THIS command before they type. a spoofed dialog
 *         cannot know a freshly-minted code, so it shows a wrong one or none — the tell
 *
 * .note = 4 chars from a 31-glyph unambiguous alphabet ≈ 923k combinations — ample for a
 *         per-invocation nonce a human eyeballs (it is not a secret, only an origin proof)
 * .note = randomInt (crypto) not Math.random — the code gates an authorization decision, so
 *         a predictable code would let a spoof pre-compute the match. cheap to do right
 */
export const genUnlockCode = (input?: { length?: number }): string => {
  const length = input?.length ?? 4;
  const chars: string[] = [];
  for (let i = 0; i < length; i++)
    chars.push(UNLOCK_CODE_ALPHABET[randomInt(UNLOCK_CODE_ALPHABET.length)]!);
  return chars.join('');
};
