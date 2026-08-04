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
 * .what = metadata for aws.params vault
 * .why = region is NOT ambient (the SDK derives it from neither IMDS nor a param path), so it is
 *        captured at set and carried here; unlock/get read it to target the ssm parameter's region
 *
 * .note = the AWS identity is NOT persisted here — it is derived at unlock from the --org scope
 *         (the org-scope hardcut: @all → the grove's IMDS role; a specific org → that org's
 *         AWS_PROFILE from the tree's .agent/keyrack.yml). see
 *         .agent/repo=.this/role=keyrack/briefs/define.keyrack-org-scope.grove-vs-tree.md
 */
export interface KeyrackKeyHostMetaAwsParams extends KeyrackKeyHostMetaBase {
  region: string;
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
  | KeyrackKeyHostMetaAwsParams
  | Record<string, unknown>
  | null;

/**
 * .what = lookup type for vault-specific metadata
 * .why = enables compile-time type safety for meta fields per vault
 *
 * .note = vault determines which meta shape applies:
 *         - 'os.secure' → KeyrackKeyHostMetaOsSecure
 *         - 'aws.config' → KeyrackKeyHostMetaAwsConfig
 *         - 'aws.params' → KeyrackKeyHostMetaAwsParams
 *         - others → KeyrackKeyHostMeta (full union for runtime compatibility)
 */
export type KeyrackKeyHostMetaOf<V extends KeyrackHostVault> =
  V extends 'os.secure'
    ? KeyrackKeyHostMetaOsSecure
    : V extends 'aws.config'
      ? KeyrackKeyHostMetaAwsConfig
      : V extends 'aws.params'
        ? KeyrackKeyHostMetaAwsParams
        : KeyrackKeyHostMeta;
