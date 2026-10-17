# F11 — a scalar `org: '@all'` stays the grove scope

## .the fork

vision case=6 refuses `@all` as an `org:` member. a scalar is a one-member list, so a literal read
refuses a scalar `org: '@all'` too. main accepts that scalar: a manifest of orgless keys declares
`org: '@all'`, and the aws.params journey suites run on it. refuse it, or keep it?

## .taken — keep the scalar; refuse it only as a list member

- the wish is additive: "every extant call keeps its behavior, so no consumer is touched". a refused
  scalar `@all` breaks every grove manifest at parse
- a scalar `@all` is a scope (the whole manifest holds keys of no org), never a member of a list of
  orgs; a list member `@all` still waives the boundary for a list, which is what case=6 forbids
- so `asKeyrackManifestOrgs` returns `['@all']` for the scalar, and still refuses `['@all']` and
  `['ahbode', '@all']`
- the fix line spells no `--org` for the manifest default org, so an `@all` manifest renders main's
  fix line byte for byte

## .rework — clean

one guard clause in `asKeyrackManifestOrgs.ts`, and the order of two checks in `getKeyrackKeyGrant.ts`.

## .confidence — 85%, and why it is not higher

a wisher may prefer that a grove manifest move to an explicit form. the scalar is kept since a refusal
would break extant repos that the wish says to leave untouched.

## .where

- `src/access/daos/daoKeyrackRepoManifest/hydrate/asKeyrackManifestOrgs.ts` (+ `.test.ts` [case1][t2], [t3])
- `src/domain.operations/keyrack/getKeyrackKeyGrant.ts` — `orgFlag`
- proof: `blackbox/{cli,sdk}/keyrack.aws-params*.acceptance.test.ts`, 79/79, snapshots unchanged

## .verdict

open — for the fulcrum council.
