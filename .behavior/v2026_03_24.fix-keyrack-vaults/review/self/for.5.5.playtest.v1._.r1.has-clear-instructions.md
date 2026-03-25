# self-review r1: has-clear-instructions

## question: are the instructions followable?

---

## criteria checklist

| criteria | status | evidence |
|----------|--------|----------|
| foreman can follow without prior context | yes | prerequisites list all deps; setup steps explain 1password item creation |
| commands are copy-pasteable | yes | all commands in fenced code blocks with `sh` |
| expected outcomes are explicit | yes | each step has "pass if:" with specific observable criteria |

---

## detailed review

### can the foreman follow without prior context?

yes. the playtest opens with prerequisites:
- rhachet cli installed
- 1password cli installed
- 1password cli authenticated
- test 1password item

each section explains what to do and what to expect.

### are commands copy-pasteable?

yes. verified each command:

| command | format | copy-pasteable |
|---------|--------|----------------|
| `rhx keyrack set --key PLAYTEST_DAEMON_KEY --vault os.daemon --env test` | fenced sh | yes |
| `rhx keyrack get --key PLAYTEST_DAEMON_KEY --env test` | fenced sh | yes |
| `rhx keyrack list --env test` | fenced sh | yes |
| `rhx keyrack set --key PLAYTEST_1PASSWORD_KEY --vault 1password --env test` | fenced sh | yes |
| `rhx keyrack unlock --key PLAYTEST_1PASSWORD_KEY --env test` | fenced sh | yes |
| `rhx keyrack get --key PLAYTEST_1PASSWORD_KEY --env test` | fenced sh | yes |
| cleanup commands | fenced sh | yes |

all commands are exact, not placeholders.

### are expected outcomes explicit?

yes. each test step has a "pass if:" line with specific criteria:

| test | pass criteria |
|------|---------------|
| 1.1 | "output contains `mech: EPHEMERAL_VIA_SESSION` and `vault: os.daemon`" |
| 1.2 | "output shows `status: granted` and your secret value" |
| 1.3 | "output includes `PLAYTEST_DAEMON_KEY` with `vault: os.daemon`" |
| 2.1 | "output contains `mech: REFERENCE` and `vault: 1password`" |
| 2.2 | "output shows key unlocked with `expires in: ...`" |
| 2.3 | "output shows `status: granted` and the secret from 1password" |

---

## conclusion

instructions are clear, commands are copy-pasteable, outcomes are explicit.

holds.
