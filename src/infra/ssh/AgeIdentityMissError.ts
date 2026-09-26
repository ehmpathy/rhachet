import { BadRequestError } from 'helpful-errors';

/**
 * .what = the ONE expected "this identity does not decrypt this ciphertext" miss —
 *         the normal "try the next identity" case of the trial-decrypt loop
 * .why  = both decrypt paths (the npm age library and the age-cli fallback) surface a
 *         recipient miss, but each in its own shape: the library throws a bare Error,
 *         the cli a "Command failed" Error minted in node's child_process realm. the
 *         shared loop (getOneIdentityThatDecrypts) must tell this EXPECTED miss apart
 *         from a genuine fault (I/O, corrupt ciphertext, a bug) so it swallows only the
 *         miss and surfaces all else loud (rule.forbid.failhide). a proper class carries
 *         context AND lets the loop allowlist by `instanceof` — no fragile message match,
 *         and reliable across jest module realms since keyrack mints it in its own realm
 */
export class AgeIdentityMissError extends BadRequestError {
  constructor(metadata?: Record<string, unknown>) {
    super("no identity matched any of the file's recipients", metadata ?? {});
  }
}

/**
 * .what = does this error message name the ONE expected recipient-miss?
 * .why  = the npm age library and the age-cli each phrase the same "this identity
 *         is not a recipient" miss differently — the library says
 *         "...of the file's recipients", the cli "...of the recipients". one
 *         predicate recognizes BOTH phrases so a future phrase drift in either
 *         tool cannot silently break one path's miss-detection. both decrypt
 *         paths funnel through this single source of truth — no duplicated
 *         literal that could drift apart (rule.prefer.wet-over-dry: the pattern
 *         now has 2 call sites with divergent literals, so it earns extraction)
 */
export const isAgeIdentityMissMessage = (message: string): boolean =>
  /no identity matched any of the (?:file's )?recipients/.test(message);
