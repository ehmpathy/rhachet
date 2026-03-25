# self-review r1: has-vision-coverage

## question: does the playtest cover all behaviors?

---

## behaviors from wish.md

| wish behavior | playtest coverage | test id |
|---------------|-------------------|---------|
| `keyrack set --key X --vault os.daemon` | yes | 1.1 |
| `keyrack set --key X --vault 1password` | yes | 2.1 |
| set verifies 1password cli is setup | yes | edge 3.1 |
| set stores exid (not secret) for 1password | yes | 2.1 pass criteria: "exid shown" |
| unlock pulls key value from 1password | yes | 2.2 |
| get pulls from daemon as usual | yes | 1.2, 2.3 |

all wish behaviors covered.

---

## behaviors from vision.md

### path 1: direct to daemon

| vision behavior | playtest coverage | test id |
|-----------------|-------------------|---------|
| set --vault os.daemon stores to daemon memory | yes | 1.1 |
| mech=EPHEMERAL_VIA_SESSION | yes | 1.1 pass criteria |
| vault=os.daemon | yes | 1.1 pass criteria |
| expires in 9h | yes | 1.1 checks expiration |
| no disk writes | implicit | daemon-only storage |

### path 2: through 1password

| vision behavior | playtest coverage | test id |
|-----------------|-------------------|---------|
| set prompts for op://uri | yes | 2.1 step 1 |
| set validates roundtrip via op read | yes | 2.1 step 2 |
| set stores pointer not secret | yes | 2.1 pass criteria: "exid shown" |
| mech=PERMANENT_VIA_REFERENCE (or REFERENCE) | yes | 2.1 pass criteria: "mech: REFERENCE" |
| vault=1password | yes | 2.1 pass criteria |
| unlock fetches from 1password to daemon | yes | 2.2 |
| get returns secret from daemon | yes | 2.3 |

### path 2b: op cli not installed

| vision behavior | playtest coverage | test id |
|-----------------|-------------------|---------|
| failfast with exit 2 | yes | edge 3.1 |
| install instructions shown | yes | edge 3.1 |

---

## edge cases from criteria.blackbox.md

| criteria edge case | playtest coverage | test id |
|--------------------|-------------------|---------|
| invalid exid format | yes | edge 3.2 |
| daemon key after relock | yes | edge 3.3 |

---

## no requirements left untested

all behaviors from wish.md, vision.md, and criteria.blackbox.md are covered.

---

## conclusion

playtest covers all behaviors from wish and vision.

holds.
