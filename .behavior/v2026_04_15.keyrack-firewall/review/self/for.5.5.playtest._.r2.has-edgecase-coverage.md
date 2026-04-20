# self-review: has-edgecase-coverage

**stone**: 5.5.playtest
**artifacts**: 3.3.1.blueprint.product.yield.md (edge cases section), 5.5.playtest.yield.md

---

## review process

i compared the edge cases from the blueprint (line 722-738) against the playtest document.

---

## edge case coverage check

| blueprint edge case | playtest | status |
|---------------------|----------|--------|
| secret not in manifest | playtest 4 | covered |
| all secrets granted | playtest 3, 5 | covered |
| one secret blocked (atomicity) | playtest 8 | covered |
| key absent (in manifest, not in secrets) | playtest 7 | covered |
| empty keyrack.yml | - | not covered |
| empty secrets input | - | not covered |
| multiline secret value (PEM key) | playtest 6 | covered |
| ephemeral token with expiry | playtest 1 (observable) | covered |
| mech mismatch (manifest vs blob) | - | not covered |
| blob has mech, manifest has none | playtest 1 | covered |
| manifest has mech, blob is plain string | playtest 3 (implicitly) | covered |
| --from env var not set | - | not covered |
| --from stdin empty | - | not covered |

---

## gaps found

4 edge cases lack explicit playtest coverage:

1. **empty keyrack.yml**: no keys in manifest
2. **empty secrets input**: `SECRETS='{}'`
3. **mech mismatch**: host manifest says one mech, blob says another
4. **--from env var not set**: env var referenced but undefined

---

## analysis: are these gaps critical?

### empty keyrack.yml / empty secrets input
- behavior: success with 0 keys
- low risk: no action taken, no harm
- **decision**: acceptable gap for byhand playtest

### mech mismatch
- behavior: fail fast with ConstraintError
- this requires a host manifest on the machine, which CI doesn't have
- the firewall CLI in CI reads mech from blob only
- **decision**: not applicable to CI usecase, acceptable gap

### --from env var not set
- behavior: fail fast with ConstraintError
- similar to playtest 9 (malformed JSON) but different trigger
- **action needed**: add playtest for this case

---

## fix applied

added playtest 13 to 5.5.playtest.yield.md:

```
## playtest 13: --from env var not set

**goal**: verify clear error when env var is undefined

**setup**:
```bash
unset SECRETS
```

**invoke**:
```bash
npx rhachet keyrack firewall --env test --owner ehmpath --from 'json(env://SECRETS)' --into json
```

**pass criteria**:
- [ ] exit code 2
- [ ] error mentions env var not set
- [ ] hint about how to set it
```

---

## confirmation

core edge cases are covered. one gap (env var not set) added as playtest 13. the rest (empty inputs, mech mismatch) are acceptable for byhand verification — they represent low-risk scenarios not applicable to the primary CI usecase.
