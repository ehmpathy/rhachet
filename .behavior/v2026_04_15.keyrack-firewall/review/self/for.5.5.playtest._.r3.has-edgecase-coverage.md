# self-review: has-edgecase-coverage

**stone**: 5.5.playtest
**artifacts**: 3.3.1.blueprint.product.yield.md (edge cases section, line 722-738), 5.5.playtest.yield.md

---

## review process

i compared the edge cases from the blueprint against the playtest document.

---

## edge case coverage check

| blueprint edge case | playtest | status |
|---------------------|----------|--------|
| secret not in manifest | playtest 4 | covered |
| all secrets granted | playtest 3, 5 | covered |
| one secret blocked (atomicity) | playtest 8 | covered |
| key absent (in manifest, not in secrets) | playtest 7 | covered |
| empty keyrack.yml | - | low risk |
| empty secrets input | - | low risk |
| multiline secret value (PEM key) | playtest 6 | covered |
| ephemeral token with expiry | playtest 1 | covered |
| mech mismatch (manifest vs blob) | - | n/a for CI |
| blob has mech, manifest has none | playtest 1 | covered |
| manifest has mech, blob is plain string | playtest 3 | covered |
| --from env var not set | playtest 13 | covered (added) |
| --from stdin empty | - | low risk |

---

## issue found and fixed

**--from env var not set**: this edge case was absent from playtests.

**fix**: added playtest 13 to 5.5.playtest.yield.md with:
- setup: `unset SECRETS`
- invoke: `npx rhachet keyrack firewall --from 'json(env://SECRETS)' ...`
- pass criteria: exit code 2, error mentions env var not set

---

## why other gaps are acceptable

### empty keyrack.yml / empty secrets input
- behavior: success with 0 keys processed
- no action taken, no harm possible
- the foreman can observe this by accident if they misconfigure
- **verdict**: low risk, acceptable gap

### mech mismatch (manifest vs blob)
- requires host manifest on machine
- CI firewall reads mech from blob only, no host manifest
- not applicable to the CI usecase
- **verdict**: not applicable, acceptable gap

### --from stdin empty
- behavior: success with 0 keys (empty JSON object)
- similar to empty secrets input
- **verdict**: low risk, acceptable gap

---

## confirmation

core edge cases are covered. one gap (env var not set) was found and fixed as playtest 13. low-risk gaps (empty inputs) and non-applicable gaps (mech mismatch) are documented above.
