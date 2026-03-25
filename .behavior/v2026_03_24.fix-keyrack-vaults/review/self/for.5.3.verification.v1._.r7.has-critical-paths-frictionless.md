# self-review r7: has-critical-paths-frictionless

## question: are the critical paths frictionless in practice?

---

## repros artifact: not applicable

this behavior does not have a `3.2.distill.repros.experience.*.md` artifact.

critical paths derived from criteria.blackbox usecases:

| usecase | critical path |
|---------|---------------|
| usecase.1 | os.daemon: set → get → expire |
| usecase.2 | 1password: set → unlock → get |
| usecase.4 | op cli not installed: fail fast with guidance |

---

## critical path 1: os.daemon set → get → expire

### the path

```bash
# 1. set ephemeral key
rhx keyrack set --key API_KEY --vault os.daemon --env prod
# prompts for secret, stores in daemon memory

# 2. get key
rhx keyrack get --key API_KEY --env prod
# returns secret from daemon

# 3. session ends or 9h passes
# key is no longer accessible
```

### frictionless?

verified via acceptance tests:
- [case1][t0]: set stores to daemon, returns mech=EPHEMERAL_VIA_SESSION
- [case1][t1]: get returns secret from daemon
- [case3][t0]: after relock, get returns absent with fix hint
- [case4][t0]: after relock, unlock reports lost status

**yes — frictionless.** no unexpected prompts, no extra steps, clear status messages.

---

## critical path 2: 1password set → unlock → get

### the path

```bash
# 1. point keyrack at 1password item
rhx keyrack set --key API_KEY --vault 1password --env prod
# prompts for op://uri, validates roundtrip

# 2. unlock fetches to daemon
rhx keyrack unlock --env prod
# 1password auth, secret cached in daemon

# 3. get key
rhx keyrack get --key API_KEY --env prod
# returns secret from daemon
```

### frictionless?

verified via acceptance tests:
- [case1][t0]: set validates exid format
- [case1][t1]: set accepts valid op://uri
- [case2][t0-t1]: list shows entry with mech=REFERENCE
- [case3][t0]: get without unlock returns locked with fix hint
- [case5][t0]: mech is REFERENCE

**yes — frictionless.** clear prompts, validation at set time, helpful hints when locked.

---

## critical path 3: op cli not installed

### the path

```bash
# attempt set with 1password vault
rhx keyrack set --key API_KEY --vault 1password --env prod
# op cli check fails
# exit 2 with install instructions
```

### frictionless?

verified via acceptance tests:
- [case6][t0-t2]: op cli not installed scenario
  - exits with code 2 (constraint error)
  - error mentions op cli
  - includes install instructions

**yes — frictionless.** fail fast, clear guidance, no ambiguity.

---

## unexpected friction check

| friction type | found? | notes |
|---------------|--------|-------|
| extra prompts | no | only expected prompts (secret, exid) |
| unclear errors | no | all errors have fix hints |
| absent guidance | no | install instructions for op cli |
| silent failures | no | all failures are explicit |

---

## conclusion

all three critical paths are frictionless:
- os.daemon: set → get → expire works smoothly
- 1password: set → unlock → get works smoothly
- op cli absent: fails fast with clear guidance

holds.
