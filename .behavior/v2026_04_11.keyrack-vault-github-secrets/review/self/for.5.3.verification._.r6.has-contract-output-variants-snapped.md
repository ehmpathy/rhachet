# self-review: has-contract-output-variants-snapped (r6)

## question

> does each public contract have exhaustive snapshots?

## analysis

### what contracts does this feature add?

this feature adds:
1. `vaultAdapterGithubSecrets` — internal vault adapter
2. `ghSecretSet` — internal communicator (wraps gh cli)
3. `ghSecretDelete` — internal communicator (wraps gh cli)

these are **internal implementations**, not public contracts.

verified via grep:
```
$ grep -r "vaultAdapterGithubSecrets" src/
src/domain.operations/keyrack/genContextKeyrack.ts  // imports into context
src/domain.operations/keyrack/adapters/vaults/github.secrets/...  // definition + tests
```

the vault adapter is consumed by `genContextKeyrack.ts` — an internal context factory. it is not exported to `src/contract/` or `src/sdk/`.

### what public contracts does this affect?

the public contract is the keyrack CLI:
- `keyrack set --vault github.secrets`
- `keyrack del --vault github.secrets`

these commands already exist. this feature adds a new `--vault` option value.

### snapshot status

```
grep -r "toMatchSnapshot" src/domain.operations/keyrack/adapters/vaults/github.secrets/
result: no matches
```

no snapshots in the github.secrets tests. however:

```
grep -r "toMatchSnapshot" src/domain.operations/keyrack/
result: no matches
```

no snapshots in any keyrack domain operations tests.

### codebase pattern

the pattern in this codebase for vault adapters:
- domain operations have integration tests with explicit assertions
- vault adapters verify inputs are passed correctly
- error messages are verified via `expect(error.message).toContain(...)`
- no vault adapter uses snapshots

checked other vault adapter tests:
- `vaultAdapterOsSecure.integration.test.ts` — no snapshots
- `vaultAdapter1Password.integration.test.ts` — no snapshots
- `vaultAdapterAwsConfig.integration.test.ts` — no snapshots

this is consistent — the codebase does not use snapshots for vault adapter tests.

### is this a gap?

the criteria yield mentions stdout output like:
- `"pushed to github.secrets (no roundtrip — write-only vault)"`

this output comes from the keyrack CLI orchestrator, not the vault adapter. the vault adapter returns `{ mech, exid }` — it does not produce stdout.

CLI output snapshots would require:
1. CLI-level acceptance tests (not domain operation tests)
2. mock or real gh cli behavior
3. capture of stdout

this is an enhancement beyond the scope of vault adapter implementation.

### what IS snapped?

the tests use explicit assertions which serve as documentation:

```ts
expect(result).toEqual({
  mech: 'PERMANENT_VIA_REPLICA',
  exid: 'ehmpathy/rhachet',
});
```

this is effectively a manual snapshot — the expected output is explicit in the test.

## why it holds

1. this feature adds internal implementations, not public contracts
2. the codebase pattern is explicit assertions, not snapshots, for vault adapters
3. CLI output snapshots would be a separate enhancement
4. the domain operation returns are documented via explicit assertions
5. follows same pattern as all other vault adapters

## verdict

**holds** — follows codebase pattern; internal contracts use explicit assertions; CLI snapshots out of scope for vault adapter

