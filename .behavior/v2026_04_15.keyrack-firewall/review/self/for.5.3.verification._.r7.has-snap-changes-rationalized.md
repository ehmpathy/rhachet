# self-review: has-snap-changes-rationalized (r7)

## question

> is every `.snap` file change intentional and justified?

## analysis

### snapshot file changed

```
blackbox/cli/__snapshots__/keyrack.firewall.acceptance.test.ts.snap
  226 insertions(+), 0 deletions(-)
```

### type of change

**all additions** — no modifications, no deletions. new tests added, new snapshots generated.

### why these snapshots were added

in review r6 (has-contract-output-variants-snapped), I found that the firewall CLI tests had NO snapshots. they only had functional assertions. the guide said "if a contract lacks any variant, add the test case NOW."

I added:
1. `toMatchSnapshot()` to all extant firewall tests (t0-t6)
2. a new `t-help` test for `keyrack firewall --help`

### per-snapshot deep examination

#### [case4] t-help: firewall --help

```
Usage: rhachet keyrack firewall [options]

translate and validate secrets for CI environments

Options:
  --env <env>      which env to grant (test, prod, prep, all)
  --from <source>  input source slug (e.g., json(env://SECRETS),
                   json(stdin://*))
  --into <format>  output format (github.actions, json)
  --owner <owner>  keyrack owner (default: "default")
  -h, --help       display help for command
```

**intended?** yes. this is the help output for the new firewall CLI command.
**rationale**: help output shows all flags, default values, and examples.
**stability**: commander generates this deterministically. no timestamps.

#### [case4] t0: firewall with safe key (success)

```
🔐 keyrack firewall
   ├─ grants: 1
   └─ keys
      ├─ SAFE_API_KEY
      │  ├─ mech: PERMANENT_VIA_REPLICA
      │  └─ status: granted 🔑

[JSON array with grant details]
```

**intended?** yes. success path for firewall command.
**rationale**: treestruct shows visual summary, JSON shows structured data.
**stability**: no timestamps, no random ids. secret value is test fixture.

#### [case4] t1: firewall with blocked key (ghp_*)

```
🔐 keyrack firewall
   ├─ grants: 0
   ├─ blocked: 2
   └─ keys
      ├─ GHP_TOKEN
      │  ├─ status: blocked 🚫
      │  └─ reasons: its dangerous to use long lived tokens...
```

**intended?** yes. blocked path for firewall command.
**rationale**: shows blocked count, reasons, and fix suggestions.
**stability**: static error messages. no dynamic data.

#### [case4] t2: firewall with locked keys

```
[JSON with status: "locked", fix: "rhx keyrack unlock..."]
```

**intended?** yes. shows keys in vault but not provided via env.
**rationale**: fix hint tells user how to unlock the key.
**stability**: static message format.

#### [case4] t3: firewall with stdin input

same output as t0 (stdin vs env var input, same result).

**intended?** yes. verifies stdin input works.
**rationale**: different input source, same output structure.

#### [case4] t4-t6: required argument errors

```
[commander error] error: required option '--env <env>' not specified
```

**intended?** yes. commander's standard error format.
**rationale**: clear error message tells user what's required.
**stability**: commander generates this deterministically.

### common regression check

| check | result |
|-------|--------|
| output format degraded? | no — new snapshots, no prior output to degrade |
| error messages less helpful? | no — messages show fix hints |
| timestamps leaked? | no — verified each snapshot |
| temp paths leaked? | no — fixtures use relative paths |
| extra output added? | intentional — new tests |

## why it holds

1. **all additions** — cannot regress what did not exist
2. **each snapshot justified** — fills gap in contract coverage
3. **no flaky data** — examined each snapshot for timestamps, random ids
4. **output is well-formed** — treestruct + JSON follows pattern
5. **error messages are helpful** — blocked/locked show fix hints

## verdict

**holds** — 8 new snapshots added during r6 review to fill contract coverage gap. all intentional, all stable, no regressions.
