/**
 * .what = shorten a long value to a keep-length prefix plus an ellipsis
 * .why =
 *   - the list views render an abbreviated serial (8-hex) and an abbreviated actor
 *     hash (7-hex) so a human scans a short handle, not a 64-char sha256 or a
 *     36-char uuid. the FULL value stays in the `--output json` data a machine reads
 *   - a pure string transformer with zero clone-domain knowledge ({value, keep} →
 *     string), so it lives in utils/ (cross-layer) — the clone CLI views AND the
 *     init/hooks actor-config sync both compose it without a domain reach-in
 *     (rule.require.bounded-contexts: a shared leaf belongs at the common ancestor)
 */
export const abbreviate = (input: { value: string; keep: number }): string =>
  input.value.length > input.keep
    ? `${input.value.slice(0, input.keep)}…`
    : input.value;
