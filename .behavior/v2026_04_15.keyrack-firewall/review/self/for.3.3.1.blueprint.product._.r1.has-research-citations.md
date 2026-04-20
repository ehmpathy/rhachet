# self-review: has-research-citations

review that the blueprint cites research results with full traceability.

---

## research artifacts reviewed

1. `3.1.1.research.external.product.flagged._.yield.md` — github action limits
2. `3.1.3.research.internal.product.code.prod._.yield.md` — internal prod patterns
3. `3.1.3.research.internal.product.code.test._.yield.md` — internal test patterns

---

## claims from research

### 3.1.1.research.external.product.flagged._.yield.md

| claim | type | cited in blueprint? | usage |
|-------|------|---------------------|-------|
| 48 KB secret size limit [1] | [FACT] | yes | edge case: defensive 40 KB check |
| 256 KB combined variables [2] | [FACT] | yes | not applicable: unlikely to hit |
| 100 repository secrets max [1] | [FACT] | yes | not applicable: keyrack.yml unlikely to exceed |
| GITHUB_ENV no separate limit | [SUMP] | yes | edge case: covered by 40 KB check |
| 6-hour job runtime [8] | [FACT] | yes | 1-hour token expiry is safe |
| what if > 48 KB? | [KHUE] | yes | edge case: fail fast at 40 KB |

### 3.1.3.research.internal.product.code.prod._.yield.md

| pattern | decision | cited in blueprint? | usage |
|---------|----------|---------------------|-------|
| mechAdapterGithubApp | [REUSE] | yes | processOneSecret routes to deliverForGet() |
| mechAdapterReplica | [EXTEND] | yes | fix ghs_* bug, reuse for passthrough/block |
| mechAdapterAwsSso | [REUSE] | yes | processOneSecret routes to deliverForGet() |
| LONG_LIVED_PATTERNS | [EXTEND] | yes | remove ghs_* (short-lived) |
| KeyrackGrantMechanism | [REUSE] | yes | type for mech field detect |
| KeyrackGrantAttempt | [REUSE] | yes | output structure |
| daoKeyrackRepoManifest | [REUSE] | yes | filter secrets to declared keys |
| sourceAllKeysIntoEnv | [EXTEND] | yes | similar pattern with core.* APIs |

### 3.1.3.research.internal.product.code.test._.yield.md

| pattern | decision | cited in blueprint? | usage |
|---------|----------|---------------------|-------|
| genTestTempRepo | [EXTEND] | yes | add with-firewall-action-test fixture |
| invokeRhachetCliBinary | [EXTEND] | yes | action invocation helper |
| killKeyrackDaemonForTests | [REUSE] | yes | daemon cleanup if needed |
| BDD test structure | [EXTEND] | yes | same given/when/then pattern |
| asSnapshotSafe | [REUSE] | yes | snapshot output for acceptance tests |

---

## issues found

### issue 1: research citations section was absent

**before**: the blueprint did not have a research citations section.

**fix**: added `## research citations` section at the end of the blueprint with tables that:
1. list each claim from each research yield
2. indicate the claim type ([FACT], [SUMP], [KHUE])
3. show how it was used in the blueprint
4. show explicit "not applicable" for claims that were reviewed but not directly used

### issue 2: edge case citation was implicit

**before**: `token > 40KB | fail fast with size error` did not cite the source.

**fix**: updated to `token > 40KB | fail fast with size error (per 3.1.1.research...flagged.yield.md [KHUE])`.

---

## verification

all claims from research artifacts are now:
- cited in the blueprint's research citations section
- traced back to the original research yield file
- traced back to the original source from that yield (where applicable)
- either leveraged or explicitly marked as "not applicable" with rationale

---

## conclusion

the blueprint now has full research citation traceability. all [FACT], [SUMP], and [KHUE] claims from the research phase are documented with their usage in the blueprint design.
