# self-review: has-edgecase-coverage (round 3)

## what i must verify

are edge cases covered in the playtest?

r2 analyzed the criteria against the playtest and found 9 gaps. r2 argued all gaps are acceptable because they require complex setup or are covered by integration tests.

this round, i must question that conclusion. are there edge cases a foreman SHOULD verify byhand that we missed?

## re-examine each gap

### gap 1: prikey fail-fast

**r2 said:** "destructive setup required — would need to remove all prikeys"

**r3 challenge:** is there a non-destructive way to test this?

**answer:** yes — run fill with a nonexistent owner like `--owner nonexistent`. the host manifest for nonexistent won't exist and no prikey will work.

**verdict:** this edge case SHOULD be in the playtest.

### gap 2: blocked keys (usecases 7-9)

**r2 said:** "complex pre-state required"

**r3 challenge:** is the setup really that complex?

**answer:** yes. to create a blocked key requires:
1. set a key with a dangerous pattern (e.g., `ghp_...`)
2. the daemon must detect and block it
3. then run fill

this requires knowledge of what patterns trigger block detection. the foreman would need documentation that doesn't exist yet.

**verdict:** acceptable gap. integration tests cover this.

### gap 3: env=all fallback (usecase 6)

**r2 said:** "complex setup for byhand"

**r3 challenge:** is the setup actually complex?

**answer:** moderate. the steps are:
1. `rhx keyrack set --key MY_API_KEY --env all --vault os.secure`
2. `rhx keyrack fill --env test --key MY_API_KEY`
3. verify skip message shows `.all.` in slug

this is not complex. it verifies a key behavior: fill recognizes env=all keys for env=test requests.

**verdict:** this edge case SHOULD be in the playtest.

### gap 4: empty value entered

**r2 said:** "handled by setKeyrackKey; not fill-specific"

**r3 challenge:** should foreman verify this anyway?

**answer:** no. if setKeyrackKey rejects empty values, fill inherits that behavior. the foreman doesn't need to verify fill's passthrough behavior.

**verdict:** acceptable gap.

## issues found

| gap | action |
|-----|--------|
| prikey fail-fast via nonexistent owner | ADD TO PLAYTEST |
| env=all fallback | ADD TO PLAYTEST |

## fix applied

added two new edge paths to `5.5.playtest.v1.i1.md`:

**file modified:** `.behavior/v2026_03_19.keyrack-fill/5.5.playtest.v1.i1.md`

**diff summary:** inserted [e4] and [e5] between [e3] and "## pass criteria"

### [e4] nonexistent owner fails fast

```bash
rhx keyrack fill --env all --owner nonexistent
```

**verify:**
- [ ] error: no available prikey for owner=nonexistent
- [ ] exits non-zero

### [e5] env=all key satisfies env=test

```bash
# first, set a key with env=all
rhx keyrack set --key RELOCK_REGULAR_KEY --env all --vault os.secure

# then fill for env=test
rhx keyrack fill --env test --key RELOCK_REGULAR_KEY
```

**verify:**
- [ ] shows "found vaulted under" with .all. in slug
- [ ] does not prompt for value
- [ ] exits 0

## what holds from r2

the rest of the gaps are still acceptable:
- blocked keys: requires pattern knowledge, tested via integration
- empty value: inherited from setKeyrackKey
- extends cycle: inherited from manifest load

## lesson learned

round 2 too quickly accepted "complex setup" as a reason to skip. round 3 challenged that assumption and found two cases where setup is actually simple.

the test: "could a foreman with copy-paste commands verify this in under 60 seconds?"

if yes → belongs in playtest.
if no → belongs in integration test.

## how to remember for next time

when reviewing edge case coverage:

1. **list all edge cases from criteria** — don't skip any
2. **for each gap, ask "is there a simpler way?"** — r2 missed nonexistent owner shortcut
3. **challenge "complex setup" claims** — often simpler than assumed
4. **the 60-second rule** — if foreman can verify with copy-paste in 60s, it belongs in playtest

specific patterns discovered:
- nonexistent owner tests prikey fail-fast without destructive setup
- env=all fallback tests can use pre-set keys from prior steps

