/**
 * .what = outcome of a grant attempt
 * .why = enables typed handler for all possible results
 *
 * variants:
 * - 'granted': credential was successfully granted
 * - 'absent': key not configured on host
 * - 'locked': vault requires unlock
 * - 'blocked': value violates mechanism constraint
 */
export type KeyrackGrantStatus = 'granted' | 'absent' | 'locked' | 'blocked';
