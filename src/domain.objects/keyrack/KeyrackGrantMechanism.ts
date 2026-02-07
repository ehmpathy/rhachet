/**
 * .what = how to translate stored credentials into usable grants
 * .why = different credential types require different translation logic
 *
 * name convention: {DURATION}_VIA_{METHOD}
 * - PERMANENT_VIA_*: credential lives indefinitely
 * - EPHEMERAL_VIA_*: credential lives for bounded time
 *
 * variants:
 * - 'PERMANENT_VIA_REPLICA': passthrough, validates not a long-lived token pattern
 * - 'EPHEMERAL_VIA_GITHUB_APP': json blob → short-lived installation token
 * - 'EPHEMERAL_VIA_AWS_SSO': sso profile → temporary session credentials
 * - 'EPHEMERAL_VIA_GITHUB_OIDC': github actions oidc → temporary credentials
 *
 * @deprecated 'REPLICA' - use 'PERMANENT_VIA_REPLICA' instead
 * @deprecated 'GITHUB_APP' - use 'EPHEMERAL_VIA_GITHUB_APP' instead
 * @deprecated 'AWS_SSO' - use 'EPHEMERAL_VIA_AWS_SSO' instead
 */
export type KeyrackGrantMechanism =
  | 'PERMANENT_VIA_REPLICA'
  | 'EPHEMERAL_VIA_GITHUB_APP'
  | 'EPHEMERAL_VIA_AWS_SSO'
  | 'EPHEMERAL_VIA_GITHUB_OIDC'
  // deprecated aliases (backwards compat)
  | 'REPLICA'
  | 'GITHUB_APP'
  | 'AWS_SSO';
