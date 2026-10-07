/**
 * .what = the commander collector for a repeatable `--subject` flag
 * .why = commander keeps only the LAST value of a repeated flag, so `--subject a --subject b`
 *        would boot `b` alone and drop `a` in silence. the collector keeps each value, and
 *        `getAllSubjectSlugs` splits each on commas — so the repeated form and the
 *        comma-joined form name the same subjects (`rule.require.roles-flag-dual-format`)
 *
 * .note = `prior` is `undefined` on the first value, since the option declares no default.
 *   an absent flag therefore stays `undefined`, which the boot plan reads as "every subject"
 */
export const asSubjectFlagValues = (
  value: string,
  prior: string[] | undefined,
): string[] => [...(prior ?? []), value];
