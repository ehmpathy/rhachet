import { getDecodedRoleDeltaToken } from './getDecodedRoleDeltaToken';

/**
 * .what = the one shared `--roles` tokenizer: turns raw argv values into a flat
 *         list of natural sigil tokens (`+role` / `-role` / bare `role`)
 * .why = every command that offers `--roles` (init, enroll, ...) must accept the
 *        same two interchangeable forms, parsed the same way:
 *          - space-separated: `--roles +architect -reviewer`
 *          - comma-separated: `--roles +architect,-reviewer`
 *        this is the single seam that makes the grammar uniform. it also decodes
 *        the sentinel that `getPreprocessedRoleArgv` glued on, so NO consumer is
 *        left un-decoded — the null byte can never survive to a role name (the
 *        bug that broke `enroll --roles -driver`).
 *
 * .note = decode runs before split: `getPreprocessedRoleArgv` only rewrites a
 *   token's OWN lead `-` to the sentinel, so at most one sentinel sits at the
 *   very front of a raw token; interior dashes (from a comma/space list) keep
 *   their natural `-`. decode the lead sentinel, then split on any comma or
 *   whitespace run, trim, and drop empties.
 * .note = pure transformer — no i/o, deterministic.
 */
export const getRoleDeltaTokens = (input: { raw: string[] }): string[] =>
  input.raw.flatMap((token) =>
    getDecodedRoleDeltaToken({ token })
      .split(/[\s,]+/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0),
  );
