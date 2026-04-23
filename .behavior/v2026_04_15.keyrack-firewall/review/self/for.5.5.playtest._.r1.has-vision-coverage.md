# self-review: has-vision-coverage

**stone**: 5.5.playtest
**artifacts**: 0.wish.md, 1.vision.yield.md, 5.5.playtest.yield.md

---

## wish → playtest map

| wish requirement | playtest |
|------------------|----------|
| pass secrets from github.secrets into keyrack/firewall | playtest 5 (env input) |
| only consider keys in .agent/keyrack.yml | playtest 4 (manifest filter) |
| translate (EPHEMERAL_VIA_GITHUB_APP) | playtest 1 |
| passthrough if no translate needed | playtest 3 |
| downstream steps get env vars from output | playtest 5 (GITHUB_ENV) |

all wish requirements have playtest coverage.

---

## vision → playtest map

| vision behavior | playtest |
|-----------------|----------|
| JSON blob → ghs_* token | playtest 1 |
| block ghp_* long-lived tokens | playtest 2 |
| passthrough safe strings | playtest 3 |
| filter via keyrack.yml manifest | playtest 4 |
| ::add-mask:: output | playtest 5 |
| GITHUB_ENV write | playtest 5 |
| multiline heredoc syntax | playtest 6 |
| absent keys (in manifest, not in secrets) | playtest 7 |
| atomicity (one blocked = none exported) | playtest 8 |
| malformed JSON error | playtest 9 |
| GITHUB_ENV not set error | playtest 10 |
| treestruct debug output | playtest 11 |
| stdin input | playtest 12 |

all vision behaviors have playtest coverage.

---

## why it holds

the playtest document maps 1:1 to the primary behaviors:
- credential translation (playtest 1)
- credential block (playtest 2)
- credential passthrough (playtest 3)
- manifest filter (playtest 4)
- github.actions output format (playtest 5, 6)
- edge cases (playtest 7, 8, 9, 10)
- debug experience (playtest 11)
- input flexibility (playtest 12)

---

## confirmation

all behaviors from wish and vision have explicit playtest coverage.
