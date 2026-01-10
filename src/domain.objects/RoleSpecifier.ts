/**
 * .what = a string that identifies a role, optionally scoped to a repo
 * .why = enables disambiguation when multiple repos have same role name
 *
 * .format =
 *   - "mechanic"           => role "mechanic" from any repo (must be unique)
 *   - "ehmpathy/mechanic"  => role "mechanic" from repo "ehmpathy"
 *
 * .examples =
 *   - "mechanic"
 *   - "behaver"
 *   - "ehmpathy/mechanic"
 *   - "bhuild/behaver"
 */
export type RoleSpecifier = string;
