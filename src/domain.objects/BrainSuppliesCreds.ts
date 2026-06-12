/**
 * .what = creds value type for brain suppliers
 * .why = standardizes how brain suppliers receive credentials
 *
 * .note
 *   - keyrack shorthand: first-class support for rhachet ecosystem
 *   - getter: explicit function for vault/kms/db integration
 *   - local suppliers use `creds: null` instead (not this type)
 */
export type BrainSuppliesCreds<TKeys extends Record<string, string>> =
  | { keyrack: { owner: string; env: string } }
  | (() => Promise<TKeys>);
