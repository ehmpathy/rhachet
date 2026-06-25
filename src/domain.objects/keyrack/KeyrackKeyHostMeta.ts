import type { KeyrackHostVault } from './KeyrackHostVault';

/**
 * .what = base type for vault metadata
 * .why = enables compatibility with Record<string, unknown> + type safety for known fields
 */
interface KeyrackKeyHostMetaBase {
  [key: string]: unknown;
}

/**
 * .what = metadata for os.secure vault
 * .why = stores pubkey recipient for age encryption
 */
export interface KeyrackKeyHostMetaOsSecure extends KeyrackKeyHostMetaBase {
  ageKeyRecipient: string;
}

/**
 * .what = metadata for aws.config vault
 * .why = stores session name from ARN for user mismatch detection
 */
export interface KeyrackKeyHostMetaAwsConfig extends KeyrackKeyHostMetaBase {
  awsSsoUsername: string;
}

/**
 * .what = union of all possible meta types
 * .why = for runtime storage where vault type is not statically known
 *
 * .note = includes Record<string, unknown> for backwards compat with stored data
 * .note = typed interfaces extend KeyrackKeyHostMetaBase for index signature compat
 */
export type KeyrackKeyHostMeta =
  | KeyrackKeyHostMetaOsSecure
  | KeyrackKeyHostMetaAwsConfig
  | Record<string, unknown>
  | null;

/**
 * .what = lookup type for vault-specific metadata
 * .why = enables compile-time type safety for meta fields per vault
 *
 * .note = vault determines which meta shape applies:
 *         - 'os.secure' → KeyrackKeyHostMetaOsSecure
 *         - 'aws.config' → KeyrackKeyHostMetaAwsConfig
 *         - others → KeyrackKeyHostMeta (full union for runtime compatibility)
 */
export type KeyrackKeyHostMetaOf<V extends KeyrackHostVault> =
  V extends 'os.secure'
    ? KeyrackKeyHostMetaOsSecure
    : V extends 'aws.config'
      ? KeyrackKeyHostMetaAwsConfig
      : KeyrackKeyHostMeta;
