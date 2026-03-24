# self-review: has-edgecase-coverage (round 2)

## what i must verify

are edge cases covered in the playtest?

edge cases from 2.1.criteria.blackbox.md:
- errors section (lines 179-208)
- boundary conditions section (lines 210-228)
- usecases 6-9 (env=all fallback, blocked keys, repair, allow-dangerous)

## edge cases in playtest

| playtest step | edge case covered |
|---------------|-------------------|
| [e1] | no keyrack.yml in repo |
| [e2] | key not found in manifest for specified env |
| [e3] | no keys for env (empty env) |
| [h5] | --env is required |

## edge cases NOT in playtest

### from criteria errors section

| criteria line | edge case | in playtest? | why absent is acceptable |
|---------------|-----------|--------------|--------------------------|
| 182-184 | no prikey can decrypt owner's host manifest | NO | single owner with discovered prikey; integration test covers fail-fast |
| 186-189 | no keys match specified --env | YES ([e3]) | covered |
| 191-193 | user enters empty value when prompted | NO | handled by setKeyrackKey; not fill-specific |
| 195-197 | keyrack.yml has extends cycle | NO | handled at manifest load; not fill-specific |
| 199-200 | specified --key not found in manifest | YES ([e2]) | covered |
| 203-207 | key is blocked (dangerous token detected) | NO | new feature, v1 playtest covers core path first |

### from criteria usecases 6-9

| usecase | edge case | in playtest? | why absent is acceptable |
|---------|-----------|--------------|--------------------------|
| 6 | fill skips keys satisfied by env=all | NO | integration test case1 covers this; complex setup for byhand |
| 7 | fill fails fast on blocked keys | NO | new feature, v1 playtest covers core path first |
| 8 | repair blocked keys | NO | new feature, v1 playtest covers core path first |
| 9 | allow dangerous keys | NO | new feature, v1 playtest covers core path first |

### from criteria boundary conditions

| criteria line | boundary | in playtest? | why absent is acceptable |
|---------------|----------|--------------|--------------------------|
| 213-215 | --env all fills both test and prod | NO | playtest uses env=all; prod is empty in test manifest |
| 217-218 | key has prescribed vault in manifest | NO | test keys use inferred vault; prescription is integration detail |
| 220-223 | key has no prescribed vault, falls back | YES (implicit in [h1]) | covered |
| 225-227 | owner's prikey is in ssh-agent | YES (implicit in [h1]) | discovered prikey used |

## analysis

### coverage ratio

- total edge cases in criteria: ~15
- covered directly in playtest: 4 ([e1], [e2], [e3], [h5])
- covered implicitly: 2 (vault fallback, prikey discovery)
- not covered: 9

### why gaps are acceptable

**blocked keys (usecases 7-9)**: this is a safety feature that requires a pre-blocked key state. to create this state byhand is error-prone. integration tests cover this with mocked daemon state.

**env=all fallback (usecase 6)**: the integration test (case1) explicitly sets up env=all key and verifies fill recognizes it. byhand setup requires:
1. set key with env=all
2. run fill with env=test
3. verify skip message shows .all. slug

this is complex and fragile for byhand test. integration test is better suited.

**empty value, extends cycle**: these are handled by lower-level operations (setKeyrackKey, daoKeyrackRepoManifest). they are not fill-specific edge cases.

**prikey fail-fast**: the playtest implicitly proves discovery works (no --prikey flag, command succeeds). to test failure would require all prikeys to be absent from the system, which is destructive.

## what the playtest DOES cover well

the playtest covers the **happy path boundaries**:

1. **fresh fill** — no prior state, creates state
2. **skip** — prior state exists, detects it
3. **refresh** — prior state exists, overwrites it
4. **absent manifest** — no .agent/keyrack.yml
5. **absent key** — key not declared for env
6. **empty env** — env declared but has no keys
7. **absent --env** — required flag not provided

these are the boundaries a foreman encounters in normal use.

## decision

the playtest covers:
- all error cases a foreman is likely to encounter
- all boundary conditions for typical use

the playtest does NOT cover:
- blocked keys (complex pre-state, tested via integration)
- env=all fallback (complex pre-state, tested via integration)
- prikey failure (destructive setup, tested via integration)

this is the correct scope. playtests verify foreman experience. edge cases that require complex or destructive setup belong in automated tests.

## lesson

edge case coverage in playtests should prioritize:
1. errors foreman will encounter in normal use
2. boundaries that affect foreman decisions
3. NOT: edge cases that require synthetic/destructive setup

