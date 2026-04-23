# role-standards-adherence review (r7) — keyrack firewall

## rule directories enumerated

mechanic role briefs directories:
1. `practices/` — domain operation grains (transformer/communicator/orchestrator)
2. `lang.terms/` — forbidden gerunds, noun_adj order
3. root briefs — error conventions, doc comment conventions

---

## practices/domain-operation-grains

### rule summary

| grain | role | purity | prefix |
|-------|------|--------|--------|
| transformer | compute | pure | `as*`, `infer*`, `is*` |
| communicator | commute | impure | `dao*`, `sdk*` |
| orchestrator | compose | depends | `get*`, `set*`, `del*` |

### verification: new files

| file | prefix | purity | grain | status |
|------|--------|--------|-------|--------|
| `asKeyrackFirewallSource.ts` | `as*` | pure (no I/O) | transformer | **correct** |
| `asKeyrackSlugParts.ts` | `as*` | pure (no I/O) | transformer | **correct** |
| `inferKeyrackMechForGet.ts` | `infer*` | pure (no I/O) | transformer | **correct** |
| `getKeyrackFirewallOutput.ts` | `get*` | impure (console.log, appendFileSync) | orchestrator | **correct** |

**why each holds**:

1. **asKeyrackFirewallSource**: takes string input, returns parsed object. no process.env read, no network, no filesystem. pure transformer.

2. **asKeyrackSlugParts**: takes slug string, returns `{ org, env, keyName }`. calls other `as*` transformers. no side effects. pure transformer.

3. **inferKeyrackMechForGet**: takes string value, returns mech type. JSON.parse is synchronous and pure (no external state). pure transformer.

4. **getKeyrackFirewallOutput**: calls `console.log`, `appendFileSync`. these are side effects. the function composes output operations. orchestrator grain is correct.

---

## lang.terms/rule.forbid.gerunds

### rule summary

gerunds (-ing as nouns) are forbidden in:
- variable names
- function names
- class names
- comments

### verification: all new files

**searched for `-ing` in identifiers**:

| file | gerunds found | status |
|------|---------------|--------|
| `asKeyrackFirewallSource.ts` | none | **correct** |
| `asKeyrackSlugParts.ts` | none | **correct** |
| `inferKeyrackMechForGet.ts` | none | **correct** |
| `getKeyrackFirewallOutput.ts` | none | **correct** |
| `vaultAdapterOsEnvvar.ts` | none | **correct** |

**why it holds**: the pre-commit hooks enforce this rule. any gerund would have blocked the write.

---

## error conventions

### rule summary

- use `ConstraintError` for user-fixable input errors
- include `hint` field with fix suggestion
- include relevant context fields

### verification: error throws

| location | error type | hint | context | status |
|----------|------------|------|---------|--------|
| `asKeyrackFirewallSource.ts:25` | ConstraintError | "expected format: json(env://VAR) or json(stdin://*)" | slug, examples | **correct** |
| `asKeyrackFirewallSource.ts:36` | ConstraintError | "only json format is supported" | format, supported | **correct** |
| `asKeyrackFirewallSource.ts:46` | ConstraintError | "use json(env://VAR_NAME)" | slug | **correct** |
| `asKeyrackFirewallSource.ts:58` | ConstraintError | "use json(env://VAR) or json(stdin://*)" | protocol, supported | **correct** |
| `vaultAdapterOsEnvvar.ts:85` | ConstraintError | "update host manifest or blob to match" | hostManifestMech, blobMech, slug | **correct** |
| `getKeyrackFirewallOutput.ts:89` | ConstraintError | "--into github.actions requires a GitHub Actions workflow context" | none (self-explanatory) | **correct** |

**why it holds**: each error tells the user what went wrong and how to fix it. context fields provide debug info.

---

## doc comment conventions

### rule summary

functions should have `.what` and `.why` doc comments:
```typescript
/**
 * .what = one line that describes the function
 * .why = one line that explains the purpose
 */
```

### verification: new functions

| file | .what | .why | status |
|------|-------|------|--------|
| `asKeyrackFirewallSource.ts` | "parse --from slug into structured source descriptor" | "enables extensible input sources for keyrack firewall CLI" | **correct** |
| `asKeyrackSlugParts.ts` | "extract org, env, and keyName from slug" | "vaults need these parts to construct KeyrackKeyGrant" | **correct** |
| `inferKeyrackMechForGet.ts` | "detect mech field from value (JSON blob or plain string)" | "enables vaults to translate github app blobs via inferred mech" | **correct** |
| `getKeyrackFirewallOutput.ts` | "format keyrack firewall output for target" | "enables different output formats for CI and tests" | **correct** |
| `writeToGithubEnv` (helper) | "write key=value to GITHUB_ENV with heredoc for multiline" | "github actions requires heredoc syntax for multiline values" | **correct** |

**why it holds**: every new function has both `.what` and `.why`. the comments are concise and specific.

---

## file location conventions

### rule summary

| component | location |
|-----------|----------|
| transformers | `src/domain.operations/{domain}/` |
| vault adapters | `src/domain.operations/{domain}/adapters/vaults/{vault}/` |
| CLI commands | `src/contract/cli/` |
| acceptance tests | `blackbox/cli/` |

### verification: new files

| file | expected location | actual | status |
|------|-------------------|--------|--------|
| asKeyrackFirewallSource.ts | `src/domain.operations/keyrack/` | `src/domain.operations/keyrack/` | **correct** |
| asKeyrackSlugParts.ts | `src/domain.operations/keyrack/` | `src/domain.operations/keyrack/` | **correct** |
| inferKeyrackMechForGet.ts | `src/domain.operations/keyrack/` | `src/domain.operations/keyrack/` | **correct** |
| getKeyrackFirewallOutput.ts | `src/domain.operations/keyrack/` | `src/domain.operations/keyrack/` | **correct** |
| keyrack.firewall.acceptance.test.ts | `blackbox/cli/` | `blackbox/cli/` | **correct** |

**why it holds**: files are in the expected directories per repo structure convention.

---

## conclusion

| rule category | violations | status |
|---------------|------------|--------|
| domain operation grains | 0 | **adhered** |
| forbidden gerunds | 0 | **adhered** |
| error conventions | 0 | **adhered** |
| doc comment conventions | 0 | **adhered** |
| file location conventions | 0 | **adhered** |

no role standards violations found.
