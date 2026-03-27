# review: has-acceptance-test-citations

## question

coverage check: cite the acceptance test for each playtest step.
- which acceptance test file verifies this behavior?
- which specific test case (given/when/then) covers it?
- cite the exact file path and test name
- if a step lacks acceptance test coverage, is this a gap or is this behavior untestable via automation?

## review

### acceptance test file

all keyrack.source SDK acceptance tests are in:
```
blackbox/sdk/keyrack.source.acceptance.test.ts
```

### step-by-step citations

| playtest step | acceptance test | status | rationale |
|---------------|-----------------|--------|-----------|
| 1. verify legacy files deleted | none | ✓ acceptable | file presence is git state, not behavior |
| 2. verify keyrack.source SDK in place | none | ✓ acceptable | code presence is static analysis, not runtime behavior |
| 3. verify keyrack unlocked behavior | case7 [t2] | ✓ cited | keyrack.source() with keys granted |
| 4. verify acceptance tests same | case7 [t2] | ✓ cited | same behavior as step 3 |
| 5. verify CI passthrough | case1 | ✓ cited | all keys granted via env passthrough |
| edgey: absent keys | case2, case4 | ✓ cited | absent key status with hints |

### detailed citations

#### step 1: verify legacy files deleted

**acceptance test:** none

**why acceptable:** this step verifies git state (files deleted), not runtime behavior. acceptance tests verify behavior via CLI invocation; file presence/absence is verified via git status and `ls` command in playtest.

#### step 2: verify keyrack.source SDK in place

**acceptance test:** none

**why acceptable:** this step verifies code presence via grep, not runtime behavior. the presence of `keyrack.source({ env: 'test', owner: 'ehmpath' })` in jest env files is static analysis. runtime behavior is tested separately.

#### step 3: verify keyrack unlocked behavior

**acceptance test:**
```
blackbox/sdk/keyrack.source.acceptance.test.ts
├─ given: [case7] keyrack.source() SDK with absent keys (strict mode)
│  └─ when: [t2] strict mode with all keys granted via env passthrough
│     ├─ then: exits with code 0
│     ├─ then: key is injected into process.env
│     ├─ then: stdout matches snapshot
│     └─ then: stderr matches snapshot
```

**why this maps:** step 3 verifies that tests run with keys injected. case7 [t2] verifies keyrack.source() injects keys into process.env when keys are granted via env passthrough (which is how keyrack delivers keys after unlock — daemon makes them available, keyrack.source() reads them).

#### step 4: verify acceptance tests same behavior

**acceptance test:** same as step 3 — case7 [t2]

**why this maps:** step 4 verifies acceptance tests run with keys injected. the keyrack.source() SDK behavior is the same for integration and acceptance tests — both call keyrack.source() which injects keys into process.env.

#### step 5: verify CI passthrough (env var override)

**acceptance test:**
```
blackbox/sdk/keyrack.source.acceptance.test.ts
├─ given: [case1] all keys granted via env passthrough
│  └─ when: [t0] rhx keyrack get --json with env vars set
│     ├─ then: exits with status 0
│     ├─ then: all keys have status=granted
│     └─ then: grant values match env values
│  └─ when: [t1] rhx keyrack get (formatted) with env vars set
│     ├─ then: stdout matches snapshot
│     └─ then: stderr matches snapshot
```

**why this maps:** step 5 verifies CI passthrough by set env vars and check tests start without keyrack error. case1 verifies keyrack returns `status=granted` and correct values when keys are provided via env vars, which proves os.envvar passthrough works.

#### edgey paths: absent keys

**acceptance tests:**
```
blackbox/sdk/keyrack.source.acceptance.test.ts
├─ given: [case2] some keys absent (not in env, not hosted)
│  └─ when: [t1] rhx keyrack get (formatted) with one env var set
│     ├─ then: stdout matches snapshot (shows absent status with tip)
│     └─ then: stderr matches snapshot
├─ given: [case4] key truly absent (never set, no env var)
│  └─ when: [t1] rhx keyrack get (formatted) without env var
│     ├─ then: stdout matches snapshot (shows absent 🫧 with tip)
│     └─ then: stderr matches snapshot
```

**why this maps:** edgey paths verify absent keys show `set` command hints. case2 and case4 snapshots in `keyrack.source.acceptance.test.ts.snap` show:
- `status: absent 🫧`
- `tip: rhx keyrack set --key __KEY__ --env test`

### snapshot evidence

from `blackbox/sdk/__snapshots__/keyrack.source.acceptance.test.ts.snap`:

**case2 absent key output:**
```
"🔐 keyrack
   ├─ testorg.test.__TEST_SOURCE_PRESENT__
   │  ├─ vault: os.envvar
   │  ├─ mech: PERMANENT_VIA_REPLICA
   │  └─ status: granted 🔑
   └─ testorg.test.__TEST_SOURCE_ABSENT__
      ├─ status: absent 🫧
      └─ tip: rhx keyrack set --key __TEST_SOURCE_ABSENT__ --env test"
```

**case4 absent key output:**
```
"🔐 keyrack
   └─ testorg.test.__TEST_SOURCE_NOTAVAIL__
      ├─ status: absent 🫧
      └─ tip: rhx keyrack set --key __TEST_SOURCE_NOTAVAIL__ --env test"
```

## reflection: why each non-issue holds

### steps 1-2: static verification does not need acceptance tests

**question:** should we add acceptance tests for file deletion and code presence?

**analysis:** acceptance tests verify runtime behavior — they spawn CLI or SDK and check outputs. file deletion (step 1) and code presence (step 2) are not runtime behaviors; they are repository state. the playtest commands (`ls` and `grep`) are the appropriate verification mechanism.

**why it holds:** an acceptance test for "file does not exist" would duplicate what `ls` already does. an acceptance test for "keyrack.source() is called in jest.integration.env.ts" would require source code parse, which is static analysis, not behavior test.

### step 3 citation: case7 [t2] tests the exact behavior

**question:** does case7 [t2] actually test what step 3 verifies?

**analysis:**
- step 3 verifies: "tests run with keys injected into process.env"
- case7 [t2] verifies: keyrack.source() "exits with code 0" and "key is injected into process.env"

the test `then('key is injected into process.env', () => { expect(result.stdout).toContain('granted value: ${result.envValue}'); });` proves the key was injected because the test module logs `process.env.${envKeyGranted}` and the test asserts this value matches.

**why it holds:** the acceptance test explicitly verifies process.env injection, which is exactly what step 3 needs.

### step 5 citation: case1 tests CI passthrough specifically

**question:** does case1 test the same scenario as step 5?

**analysis:**
- step 5: set env vars `OPENAI_API_KEY=test ANTHROPIC_API_KEY=test XAI_API_KEY=test`, run tests with locked keyrack
- case1: set env vars `[envKey1]=envValue1, [envKey2]=envValue2`, call keyrack get

both test the same behavior: keyrack prefers os.envvar passthrough. when keys exist in env, keyrack returns `status=granted` without vault lookup.

**why it holds:** case1 `then('all keys have status=granted')` and `then('grant values match env values')` prove passthrough works. step 5 is the integration test of this same behavior in the jest env context.

### edgey paths citation: case2 and case4 test absent key hints

**question:** do case2 and case4 cover the edgey paths scenario?

**analysis:**
- edgey paths: "output shows each key with status: absent for keys not in vault... tip for each absent key: rhx keyrack set"
- case2 snapshot: shows `status: absent 🫧` and `tip: rhx keyrack set --key __TEST_SOURCE_ABSENT__ --env test`
- case4 snapshot: shows `status: absent 🫧` and `tip: rhx keyrack set --key __TEST_SOURCE_NOTAVAIL__ --env test`

**why it holds:** the snapshots prove the hint format matches what edgey paths expects. the acceptance tests lock in this output format; any regression would fail the snapshot comparison.

## issues found

none. each citation is verified:
- steps 1-2: static verification, appropriately tested via playtest commands
- step 3: case7 [t2] explicitly tests process.env injection
- step 5: case1 explicitly tests env passthrough with `status=granted`
- edgey paths: case2, case4 snapshots prove hint format

## verdict

playtest steps align with acceptance tests:
- 4/6 steps have direct acceptance test citations with verified mappings
- 2/6 steps are static verification which do not require acceptance tests

the acceptance tests verify keyrack.source() SDK behavior; the playtest verifies integration into jest env files. together they prove the behavior works end-to-end.
