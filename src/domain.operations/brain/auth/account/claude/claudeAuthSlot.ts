const CLAUDE_AUTH_SLOT_ORG = '@all';
const CLAUDE_AUTH_SLOT_ENV = 'prep';
const CLAUDE_AUTH_SLOT_KEY = 'BRAINS_AUTH__OF__CLAUDE_CODE_OAUTH_TOKEN';

/**
 * .what = where a claude account's refresh token is held in the keyrack
 * .why = one key name, one copy per account at reach = the account's email (fulcrum F2); the
 *   same slot dev-env-setup `brains.auth.use` reads, so both tools share one pool
 * .note = machine-wide (`@all`): an account belongs to the box, never to one repo
 * .note = the default owner is `ehmpath`, as dev-env-setup files them (vision a8, q5); `--owner`
 *   overrides it
 * .note = the slug is derived from org, env and key, so the three never drift apart
 */
export const CLAUDE_AUTH_SLOT = {
  owner: 'ehmpath',
  slug: `${CLAUDE_AUTH_SLOT_ORG}.${CLAUDE_AUTH_SLOT_ENV}.${CLAUDE_AUTH_SLOT_KEY}`,
  key: CLAUDE_AUTH_SLOT_KEY,
  org: CLAUDE_AUTH_SLOT_ORG,
  env: CLAUDE_AUTH_SLOT_ENV,
  vault: 'os.secure',
  mech: 'PERMANENT_VIA_REPLICA',
} as const;
