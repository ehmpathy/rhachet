# self-review: has-vision-coverage (round 2)

## what i must verify

does the playtest cover all behaviors from 0.wish.md and 1.vision.md?

i have already reviewed this once (r1). r1 found a gap: multi-owner behavior is not tested. r1 decided this is acceptable because integration tests cover it and multi-owner is compound behavior (same logic, repeated).

this round, i must verify that decision holds and no other gaps exist.

## trace each behavior

### from 0.wish.md

| line | behavior | playtest step | verdict |
|------|----------|---------------|---------|
| 3 | fill keyracks of one or more owners | [h1] single owner | partial — multi-owner not tested |
| 28 | infer vault/mech when not prescribed | [h1] uses os.secure inference | covered |
| 33-37 | for each key, for each owner: set → unlock → get | [h1] verify includes all three | covered for single owner |
| 41 | owner on inner loop | not explicit | not covered — UX detail |
| 47-51 | --prikey extends discovered pool | not tested | not covered |

### from 1.vision.md usecases table (lines 50-56)

| usecase | playtest step | verdict |
|---------|---------------|---------|
| fill test keys for default owner | [h1] | covered |
| fill test keys for multiple owners | none | NOT COVERED |
| fill prod keys | [e3] empty env | covered (prod is empty in test manifest) |
| refresh a specific key | [h3] --refresh | covered |
| refresh all keys | [h3] covers single | partial — single key, not all |

### from 1.vision.md contract inputs (lines 60-65)

| input | playtest step | verdict |
|-------|---------------|---------|
| --env required | [h5] fails without --env | covered |
| --owner repeatable | not tested | not covered |
| --prikey repeatable | not tested | not covered |
| --key filters | implicit in [h2],[h3] | implicit — could be explicit |
| --refresh forces re-prompt | [h3] | covered |

### from 1.vision.md error cases (timeline examples)

| error case | playtest step | verdict |
|------------|---------------|---------|
| partial fill (some skipped) | [h2] skip behavior | covered |
| no keyrack.yml | [e1] | covered |
| key not found in manifest | [e2] | covered |
| no keys for env | [e3] | covered |

## gaps found

| gap | severity | why acceptable |
|-----|----------|----------------|
| multi-owner not tested | minor | compound behavior, integration tests cover |
| --prikey pool extension not tested | minor | implementation detail, unit tests cover |
| owner on inner loop UX not tested | minor | observation detail, not functional |
| --key filter not explicit | nitpick | implicit in [h2],[h3] commands |

## why coverage holds

### the playtest tests distinct behaviors

distinct behaviors in the playtest:
1. **fresh fill** — key does not exist, prompt, set, verify
2. **skip** — key exists, detect, do not prompt
3. **refresh** — key exists, prompt anyway, overwrite
4. **help output** — all flags visible
5. **error: no manifest** — fail-fast
6. **error: key not found** — fail-fast
7. **error: empty env** — graceful exit

each is a distinct codepath with distinct outcomes.

### multi-owner is NOT a distinct behavior

multi-owner is the same codepath repeated. the code does:
```
for each key:
  for each owner:
    fillOneKeyForOwner()  // ← this is the unit
```

if `fillOneKeyForOwner()` works for owner=default, it works for owner=ehmpath. the loop structure does not change the behavior — it repeats it.

### integration tests prove the loop

`fillKeyrackKeys.integration.test.ts` case3 explicitly tests:
```ts
given('[case3] multiple owners (journey 2)', () => {
  when('[t0] fill is called with 2 owners', () => {
    then('sets the key for both owners', async () => {
      expect(result.summary.set).toEqual(2);
    });
  });
});
```

this test proves the loop executes correctly. the playtest proves the inner behavior works correctly. together, they cover multi-owner.

### prikey discovery is covered by unit tests

`genKeyrackHostContext` handles prikey discovery. the playtest uses default owner (no --prikey needed because prikey is discovered). the absence of --prikey in playtest commands IS the test — discovery works.

explicit --prikey pool extension is an implementation detail covered by unit tests.

## what the playtest uniquely verifies

the playtest verifies what integration tests cannot:
- **real TTY interaction** — prompts appear, user can type
- **real daemon state** — relock clears state, fill detects extant
- **real CLI output** — tree format renders correctly
- **real error messages** — human-readable, actionable

these are UX concerns that require human observation.

## decision reaffirmed

| gap | action |
|-----|--------|
| multi-owner | no change — integration tests cover |
| --prikey | no change — unit tests cover |
| inner loop UX | no change — observation, not function |
| --key explicit | could add, but implicit is sufficient |

the playtest covers all critical behaviors a foreman must verify. it does not exhaustively test all combinations. that is the correct scope for a playtest.

## lesson reinforced

playtests verify UX and integration points. exhaustive combination tests belong in automated tests. the foreman's time is valuable — do not ask them to run N × M combinations when single-factor tests suffice.

