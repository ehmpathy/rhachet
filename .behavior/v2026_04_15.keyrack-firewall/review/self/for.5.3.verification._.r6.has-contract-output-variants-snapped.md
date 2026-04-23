# self-review: has-contract-output-variants-snapped (r6)

## question

> does each public contract have EXHAUSTIVE snapshots?

## analysis

### contract: keyrack firewall CLI command

the firewall CLI command (`npx rhachet keyrack firewall`) is a new public contract.

#### gap found and fixed

firewall CLI tests (t0-t6) had NO snapshots. only functional assertions.

| test | what | snapshot status |
|------|------|-----------------|
| t-help | firewall --help | ADDED |
| t0 | firewall with safe key (success) | ADDED |
| t1 | firewall with blocked key (error) | ADDED |
| t2 | firewall with locked keys | ADDED |
| t3 | firewall with stdin input | ADDED |
| t4 | firewall requires --env | ADDED |
| t5 | firewall requires --from | ADDED |
| t6 | firewall requires --into | ADDED |

#### coverage checklist (per contract)

| variant | covered |
|---------|---------|
| positive path (success) | t0, t3 |
| negative path (error) | t1 (blocked), t4, t5, t6 (required args) |
| help/usage | t-help (ADDED) |
| edge cases | t2 (locked keys) |

### what the snapshots captured

verified snapshot file shows actual CLI output:

**t0 (success)**: treestruct header + JSON array with granted status
```
🔐 keyrack firewall
   ├─ grants: 1
   └─ keys
      ├─ SAFE_API_KEY
      │  ├─ mech: PERMANENT_VIA_REPLICA
      │  └─ status: granted 🔑
```

**t1 (blocked)**: treestruct with blocked status + reasons
```
status: blocked 🚫
reasons: ["detected github classic pat (ghp_*)"]
fix: "update the stored value to use a short-lived or properly-formatted credential"
```

**t2 (locked)**: shows locked keys with fix hints
```
status: locked
fix: "rhx keyrack unlock --env test --key GHP_TOKEN"
```

**t4-t6 (error)**: commander error messages
```
[commander error] error: required option '--env <env>' not specified
```

### contract: keyrack get CLI command

the firewall tests also cover `keyrack get` behavior (via [case1], [case2], [case3]):

| test | what | snapshot status |
|------|------|-----------------|
| [case1] t0 | get safe key (json) | has snapshot |
| [case1] t0.1 | get safe key (human) | has snapshot |
| [case1] t1 | get blocked ghp_* (json) | has snapshot |
| [case1] t1.1 | get blocked ghp_* (human) | has snapshot |
| [case1] t2 | get blocked AKIA* (json) | has snapshot |
| [case1] t2.1 | get blocked AKIA* (human) | has snapshot |
| [case2] | --allow-dangerous bypass | has snapshot |
| [case3] | env var ghp_* blocked | has snapshot |

all `keyrack get` variants have snapshots.

### fix applied

1. added `toMatchSnapshot()` assertions to all firewall CLI tests (t0-t6)
2. added t-help test for `keyrack firewall --help`
3. ran tests with `-u` flag to generate snapshots
4. verified snapshot file shows actual CLI output (211 lines added)

## why it holds (after fix)

1. firewall CLI success paths snapped (t0, t3)
2. firewall CLI error paths snapped (t1, t4, t5, t6)
3. firewall CLI help/usage snapped (t-help)
4. firewall CLI edge case snapped (t2)
5. keyrack get variants already had snapshots
6. all snapshots show actual output, not placeholders
7. PR reviewers can now vibecheck output without execute

## verdict

**holds (after fix)** — added 8 snapshots to firewall CLI tests (7 output + 1 help)
