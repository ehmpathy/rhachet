/**
 * .what = full slug format: org.env.key
 * .why = unambiguous identifier for a key
 *
 * .example = 'ehmpathy.prod.AWS_PROFILE'
 */
export type KeyrackKeySlug = string;

/**
 * .what = raw key name without org or env prefix
 * .why = shorthand for CLI callers when context is clear
 *
 * .example = 'AWS_PROFILE'
 */
export type KeyrackKeyName = string;

/**
 * .what = what CLI callers provide: full slug or raw key name
 * .why = CLI accepts both formats for ergonomics; downstream must disambiguate
 *
 * .note = asks come from CLI callers
 * .note = use asKeyrackKeySlug to convert ask → slug
 */
export type KeyrackKeyAsk = KeyrackKeySlug | KeyrackKeyName;
