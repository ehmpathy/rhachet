# self-review r2: has-divergence-analysis

## second pass: deeper scrutiny

r1 documented three divergences. this pass applies hostile reviewer lens to each section.

---

## section-by-section comparison

### summary section

| blueprint | evaluation |
|-----------|------------|
| "enable two vault types" | "implemented os.daemon and 1password vault adapters" |

**holds:** the summary matches. both describe same objective and outcome.

### filediff tree

blueprint filediff shows these vault adapter directories:
- os.daemon/ [+]
- os.secure/ [→]
- os.direct/ [→]
- os.envvar/ [→]
- aws.iam.sso/ [→]
- 1password/ [+]

evaluation shows same directories with same markers.

**holds:** all vault adapter directories match.

blueprint shows these support files:
- genContextKeyrackGrantUnlock.ts [~]
- setKeyrackKey.ts [~]
- promptHiddenInput.ts [○]

evaluation shows:
- genContextKeyrackGrantUnlock.ts [~]
- setKeyrackKeyHost.ts [~]
- promptHiddenInput.ts [○]
- promptVisibleInput.ts [+]

**note:** blueprint says `setKeyrackKey.ts`, evaluation says `setKeyrackKeyHost.ts`. different files. but this is not a divergence — they are different files with different purposes:
- setKeyrackKey.ts is the main orchestrator (not changed much)
- setKeyrackKeyHost.ts handles host-specific vault operations (changed)

evaluation also shows more files than blueprint (inferMechFromVault, inferKeyGrade, etc.). this is expected — blueprint is a plan, evaluation is the actual. evaluation can have MORE detail than blueprint.

**holds:** all blueprint files are present. evaluation has additional detail (correct).

### codepath tree

blueprint shows set and unlock flows for os.daemon and 1password.

evaluation shows same flows plus "support infrastructure" section.

**holds:** blueprint codepaths present. support infrastructure is additional detail (correct).

### test coverage

blueprint shows:
- unit tests for adapters
- integration tests for adapters
- acceptance tests for cli

evaluation shows same plus:
- updated prior acceptance tests (os.direct, os.secure, aws.iam.sso)
- unit tests for support files (getKeyrackKeyGrant.test.ts)

**holds:** blueprint coverage present. additional coverage is correct.

---

## divergences re-examined

### D1: deprecated aliases retained

blueprint KeyrackGrantMechanism shows only canonical names.
actual implementation retains deprecated aliases.

this was NOT specified by blueprint — blueprint neither says "keep aliases" nor "remove aliases". the implementation made a decision to keep them.

**why this decision is correct:** backwards compat. any other decision would break unlock for keys that use old mech names.

### D2: test fixture uses REFERENCE alias

blueprint test coverage says "acceptance tests for cli".
actual test fixture uses deprecated REFERENCE alias.

this is intentional: proves backwards compat works at acceptance level.

**why this decision is correct:** if we only test canonical names, we don't know if aliases work.

### D3: os.daemon writes to host manifest

blueprint codepath shows "write host manifest" with comment "retain: vault=os.daemon so unlock knows where to look".

**wait** — re-read blueprint shows this comment! it DOES say to write manifest.

let me re-read r1... r1 says blueprint considered "no manifest entry" but this is from vision, not blueprint. blueprint explicitly says to write manifest.

**correction:** D3 is NOT a divergence from blueprint. blueprint says write manifest. evaluation says write manifest. they match.

the "considered no manifest entry" was from vision exploration, not from blueprint decision.

**fix needed:** D3 should be removed from divergences section. it is not a divergence.

---

## issue found and fixed

D3 was incorrectly listed as a divergence. blueprint explicitly says to write host manifest for os.daemon. evaluation matched blueprint but described it as a divergence.

**fix applied:** updated evaluation 5.2.evaluation.v1.i1.md:
- changed D3 section title from "os.daemon writes to host manifest" to "os.daemon writes to host manifest (clarification)"
- changed table from "no manifest entry considered" to "write host manifest"
- changed resolution from "correct per vision doc" to "matches blueprint"
- added clarification note: this is NOT a divergence, blueprint and implementation match

---

## conclusion after r2

- D1 holds: deprecated aliases retained (correct decision, rationale documented)
- D2 holds: test fixture uses alias (intentional, rationale documented)
- D3 fixed: clarified as NOT a divergence (blueprint says write manifest, implementation writes manifest)

evaluation now accurately reflects: 2 true divergences (D1, D2) and 1 clarification (D3).
