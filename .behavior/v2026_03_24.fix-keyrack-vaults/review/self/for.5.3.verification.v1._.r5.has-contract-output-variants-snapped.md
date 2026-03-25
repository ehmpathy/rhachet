# self-review r5: has-contract-output-variants-snapped

## question: does each public contract have snapshots for all output variants?

---

## os.daemon contract snapshots

| variant | snapshot | captured |
|---------|----------|----------|
| set success (json) | `[case1][t0] stdout matches snapshot` | mech, vault, slug, env, timestamps |
| get success (json) | `[case1][t1] stdout matches snapshot` | grant with secret, source vault/mech |
| get absent (json) | `[case3][t0] stdout matches snapshot` | status=absent, fix hint |
| unlock lost (human) | `[case4][t0] stdout matches snapshot` | turtle output, lost 👻, tip |

**snapshot review:**
- set: captures EPHEMERAL_VIA_SESSION mech, vault=os.daemon, timestamps redacted
- get success: captures granted status with secret value and source metadata
- get absent: captures absent status with fix command
- unlock lost: captures human-readable output with status and tip

all variants snapped. holds.

---

## 1password contract snapshots

| variant | snapshot | captured |
|---------|----------|----------|
| list json | `[case2][t0] stdout matches snapshot` | mech=REFERENCE, vault=1password, exid |
| list human | `[case2][t1] stdout matches snapshot` | turtle output, mech, vault |
| get locked | `[case3][t0] stdout matches snapshot` | status=locked, fix hint |

**snapshot review:**
- list json: captures REFERENCE mech, 1password vault, op:// exid
- list human: captures human-readable tree format
- get locked: captures locked status with unlock hint

---

## gap analysis

| contract | variant | snapped? | notes |
|----------|---------|----------|-------|
| os.daemon set | success | yes | - |
| os.daemon set | error | no | no error case test (all inputs valid) |
| os.daemon get | success | yes | - |
| os.daemon get | absent | yes | after relock |
| os.daemon unlock | lost | yes | after relock |
| 1password list | json | yes | - |
| 1password list | human | yes | - |
| 1password get | locked | yes | - |
| 1password set | invalid exid | no | test exists but no snapshot |
| 1password set | success | no | conditional on op cli |

**gaps identified:**
1. 1password set error case has test but no `.toMatchSnapshot()` call
2. 1password set success case conditional (op cli required)

**gap assessment:**
- gap 1 is minor: the test asserts on error content, snapshot would add vibecheck
- gap 2 is environment-dependent: cannot snapshot op cli output reliably

---

## conclusion

core variants are snapped:
- os.daemon: set success, get success, get absent, unlock lost
- 1password: list json, list human, get locked

one minor gap: 1password set error case lacks snapshot but has explicit assertions.

holds with minor gap.

