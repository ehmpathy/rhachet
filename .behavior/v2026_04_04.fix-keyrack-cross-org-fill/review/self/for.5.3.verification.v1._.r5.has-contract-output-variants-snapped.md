# self-review: has-contract-output-variants-snapped (r5)

## public contract inventory

| layer | contract | change type |
|-------|----------|-------------|
| cli | `rhx keyrack fill` | unchanged |
| sdk | none exported | n/a |
| api | none | n/a |
| domain | `asKeyrackKeyOrg` | new internal utility |
| domain | `fillKeyrackKeys` | internal bug fix |

## contract-by-contract analysis

### CLI: `rhx keyrack fill`

**change type**: none

the cli contract was not modified:
- same command signature
- same options (`--env`, `--owner`, `--prikey`, `--key`, `--refresh`, `--repair`)
- same output structure (treestruct format with slug, status, messages)

the only difference is which org appears in slugs (bug fix), but the output format is identical.

**snapshot coverage**: verified in `blackbox/cli/keyrack.fill.acceptance.test.ts`

| case | scenario | snapshot |
|------|----------|----------|
| case1 | `--help` | yes (line 54) |
| case4 | no keys for env | yes (line 146) |
| case6 | env=all fallback | yes (line 218) |

**why no new snapshot needed**: the output format is unchanged. the fix corrects which org appears in slugs, but that's a bug fix — not a new output variant.

### domain: `asKeyrackKeyOrg`

**change type**: new internal utility

this is not a public contract — it's an internal function used by `fillKeyrackKeys`.

**snapshot needed?**: no

why:
1. internal utility, not exported to SDK
2. simple string extraction: `slug.split('.')[0]`
3. unit test assertions are sufficient (2 cases, explicit expect() calls)
4. no output format to snapshot

### domain: `fillKeyrackKeys`

**change type**: internal bug fix (line 258)

before:
```ts
org: repoManifest.org
```

after:
```ts
org: asKeyrackKeyOrg({ slug })
```

**snapshot needed for integration test?**: no

why:
1. integration test (`fillKeyrackKeys.integration.test.ts`) tests domain behavior, not CLI output
2. the test verifies correctness via explicit assertions:
   - `expect(slugs).toContain('rhight.prod.USPTO_ODP_API_KEY')`
   - `expect(slugs).toContain('ahbode.prod.DB_PASSWORD')`
3. integration tests are not the right layer for output snapshots
4. output snapshots belong in acceptance tests (blackbox/cli)

## verification: no new output variants

| question | answer |
|----------|--------|
| new cli command? | no |
| new cli options? | no |
| new output format? | no |
| new error messages? | no |
| new success messages? | no |

the fix corrects which org appears in slugs. example:

| before (bug) | after (fix) |
|--------------|-------------|
| `ahbode.prod.USPTO_KEY` | `rhight.prod.USPTO_KEY` |

this is a bug fix, not a new variant. the output structure remains:
```
🔑 key 1/2, USPTO_ODP_API_KEY, for 1 owner
   └─ for owner default
      ├─ set the key
      │  └─ enter secret for $slug: ********
      └─ get after set, to verify
         └─ ✓ rhx keyrack get --key $key --env $env
```

## coverage of public contracts

| contract | has acceptance test | has snapshots | variants covered |
|----------|---------------------|---------------|------------------|
| `rhx keyrack fill --help` | yes (case1) | yes | help output |
| `rhx keyrack fill` (no keys) | yes (case4) | yes | empty result |
| `rhx keyrack fill` (env=all) | yes (case6) | yes | fallback result |
| `rhx keyrack fill` (normal) | no | no | n/a (requires stdin) |

**why normal fill lacks snapshot**: fill prompts for secrets via stdin, which is difficult to test in acceptance tests without a mock. the integration test covers this scenario with mock prompt values.

## conclusion

| check | result |
|-------|--------|
| new public contract? | no |
| public contract output modified? | no (bug fix only) |
| new output variants? | no |
| snapshot coverage adequate? | yes |

no new snapshots needed. the fix is internal and does not change the output format of any public contract.
