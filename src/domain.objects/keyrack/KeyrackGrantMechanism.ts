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
 * - 'PERMANENT_VIA_REFERENCE': pointer to external vault (e.g., 1password exid)
 * - 'EPHEMERAL_VIA_SESSION': lives in daemon memory, dies with session
 * - 'EPHEMERAL_VIA_GITHUB_APP': json blob → short-lived installation token
 * - 'EPHEMERAL_VIA_AWS_SSO': sso profile → temporary session credentials
 * - 'EPHEMERAL_VIA_GITHUB_OIDC': github actions oidc → temporary credentials
 */
export type KeyrackGrantMechanism =
  | 'PERMANENT_VIA_REPLICA'
  | 'PERMANENT_VIA_REFERENCE'
  | 'EPHEMERAL_VIA_SESSION'
  | 'EPHEMERAL_VIA_GITHUB_APP'
  | 'EPHEMERAL_VIA_AWS_SSO'
  | 'EPHEMERAL_VIA_GITHUB_OIDC';
