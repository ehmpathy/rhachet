# rule.require.aws-params-sentinel-legalization

## severity: blocker

this rule is the **aws.params-specific slice** of the `--org` grain: how the grove-grain sentinel
(`@all`) is legalized inside a computed SSM parameter name. the grain itself — grove vs tree,
machine-wide-no-manifest vs repo-scoped-from-manifest — is NOT aws.params-specific and is NOT
re-stated here; it is the general `rule.require.org-scope-grain-hardcut.md`. read that first; this
rule adds only the one detail the SSM name layer must handle differently.

## .the one aws.params concern — legalize the `@all` sentinel for SSM's charset

an SSM parameter name is constrained to `[a-zA-Z0-9_.-/]`. the grove-grain sentinel the human
types — `@all` — carries a `@`, which is OUTSIDE that charset. so when `asKeyrackAwsParamName`
computes the param name for a grove-grain (`@all`) key, the org segment MUST be the legalized
reserved segment **`_all_`**, never a raw `@all`.

```
grove grain  (--org @all)      → /keyrack/infra/vault/aws.params/v1/{owner}/_all_/{env}/{key}
tree  grain  (--org ehmpathy)  → /keyrack/infra/vault/aws.params/v1/{owner}/ehmpathy/{env}/{key}
```

- the `_all_` segment MUST be **stable across set and get** — the writer and reader compute the
  same name, so the value written at set is the value read at unlock.
- `@all` keys are keyrack-owned (keyrack both writes and reads the name), so no out-of-band writer
  must match the sentinel form — the legalization is internal + deterministic.

## .forbidden

- an `@all` aws.params param name that carries a raw `@` — it is outside SSM's `[a-zA-Z0-9_.-/]`
  charset and MUST be the legalized `_all_` segment.
- an `_all_`-vs-`@all` form that differs between the set path and the get path — the sentinel
  legalization MUST be one deterministic transform, applied identically at both.

## .what this rule does NOT cover (defer to the general grain rule)

all of WHICH grain a key belongs to, whether a repo manifest is consulted, and the
failfast-on-cross-grain invariant is the general rule's, not this one's:

- "does an `@all` key need a repo manifest?" (no) → `rule.require.org-scope-grain-hardcut.md`
- "which AWS identity reads it?" (IMDS vs `AWS_PROFILE`) → `rule.require.org-scope-identity-hardcut.md`
- the grove-vs-tree invariant table + the n1–n4 proofs → `rule.require.org-scope-grain-hardcut.md`

## .see also

- `rule.require.org-scope-grain-hardcut.md` — the general grain (grove vs tree, manifest-or-not);
  this rule is its aws.params param-name **sentinel-legalization** application, itemized in that
  rule's applications table
- `rule.require.org-scope-identity-hardcut.md` — the peer aws-identity application (IMDS vs `AWS_PROFILE`)
- `define.keyrack-org-scope.grove-vs-tree.md` — grove vs tree, the coins and the why
