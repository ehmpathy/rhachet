# role-standards-adherence review (r6) — keyrack firewall

## rule directories checked

based on mechanic role briefs:
- `practices/` — domain operation grains, error conventions
- `lang.terms/` — forbidden terms (gerunds), noun_adj order
- conventions — doc comments, file locations

---

## domain operation grains

### define.domain-operation-grains

| grain | role | purity |
|-------|------|--------|
| **transformer** | compute | pure |
| **communicator** | commute | impure |
| **orchestrator** | compose | depends |

**new files checked**:

| file | claimed grain | actual |
|------|---------------|--------|
| `asKeyrackFirewallSource.ts` | transformer | **correct** — pure parse, no I/O |
| `asKeyrackSlugParts.ts` | transformer | **correct** — pure extract, no I/O |
| `inferKeyrackMechForGet.ts` | transformer | **correct** — pure JSON parse, no I/O |
| `getKeyrackFirewallOutput.ts` | orchestrator | **correct** — does I/O (console.log, appendFileSync) |

**why it holds**: transformers have `as*` or `infer*` prefix and do pure computation. orchestrator has `get*` prefix and does I/O. the grain matches the behavior.

---

## doc comment convention

### `.what` / `.why` pattern

**checked**: all new files

| file | has .what | has .why | status |
|------|-----------|----------|--------|
| `asKeyrackFirewallSource.ts` | line 12: `.what = parse --from slug` | line 13: `.why = enables extensible input` | **correct** |
| `asKeyrackSlugParts.ts` | line 6: `.what = extract org, env, keyName` | line 7: `.why = vaults need these parts` | **correct** |
| `inferKeyrackMechForGet.ts` | line 4: `.what = detect mech field` | line 5: `.why = enables vaults to translate` | **correct** |
| `getKeyrackFirewallOutput.ts` | line 31: `.what = format keyrack firewall output` | line 32: `.why = enables different output formats` | **correct** |
| `vaultAdapterOsEnvvar.ts` (get method) | line 64: `.what = read value from process.env` | line 65: `.why = core operation for passthrough` | **correct** |

**why it holds**: every new function has `.what` and `.why` doc comments per mechanic convention.

---

## error convention

### ConstraintError with hint

**checked**: error throws in new code

| file | error type | has hint | status |
|------|------------|----------|--------|
| `asKeyrackFirewallSource.ts:25` | ConstraintError | `hint: 'expected format: ...'` | **correct** |
| `asKeyrackFirewallSource.ts:36` | ConstraintError | `hint: 'only json format is supported'` | **correct** |
| `asKeyrackFirewallSource.ts:46` | ConstraintError | `hint: 'use json(env://VAR_NAME)'` | **correct** |
| `asKeyrackFirewallSource.ts:58` | ConstraintError | `hint: 'use json(env://VAR) or ...'` | **correct** |
| `vaultAdapterOsEnvvar.ts:85` | ConstraintError | `hint: 'update host manifest or blob to match'` | **correct** |
| `getKeyrackFirewallOutput.ts:89` | ConstraintError | `hint: '--into github.actions requires ...'` | **correct** |

**why it holds**: all ConstraintErrors include a `hint` field to guide the user toward a fix.

---

## forbidden terms

### gerunds

**searched**: all new files for `-ing` suffix

**found**: none in function names, variable names, or doc comments

**note**: hook would have blocked the write if gerunds were present.

**why it holds**: the write hooks enforce this rule. all files passed hook validation.

---

## file location convention

| component type | expected location | actual location | status |
|----------------|-------------------|-----------------|--------|
| transformer | `src/domain.operations/keyrack/` | `src/domain.operations/keyrack/` | **correct** |
| orchestrator | `src/domain.operations/keyrack/` | `src/domain.operations/keyrack/` | **correct** |
| vault adapter | `src/domain.operations/keyrack/adapters/vaults/` | `src/domain.operations/keyrack/adapters/vaults/os.envvar/` | **correct** |
| CLI command | `src/contract/cli/` | `src/contract/cli/invokeKeyrack.ts` | **correct** |
| acceptance test | `blackbox/cli/` | `blackbox/cli/keyrack.firewall.acceptance.test.ts` | **correct** |

**why it holds**: files are in standard locations per repo structure convention.

---

## conclusion

| rule category | status |
|---------------|--------|
| domain operation grains | **adhered** — transformers are pure, orchestrator does I/O |
| doc comment convention | **adhered** — all have .what/.why |
| error convention | **adhered** — all ConstraintErrors have hint |
| forbidden terms | **adhered** — no gerunds (hook enforced) |
| file location | **adhered** — standard locations |

no violations found.
