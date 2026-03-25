# self-review r2: has-questioned-assumptions

## deeper reflection

a pause. re-read the wish. re-read the vision. look for what I missed.

---

## assumption 9: the wish asks for TWO features

### what do we assume?
that os.daemon and 1password are equally scoped features.

### re-read the wish:

```
1. keyrack set --key EXAMPLE_KEY --vault os.daemon

so that we can set keys adhoc temporarily into daemon without persistant storage in any vault

2. keyrack set --key EXAMPLE_KEY --vault 1password

so that we can leverage the 1password cli to grant keys

set should verify that 1password cli (or sdk?) is setup on this machine

and then should simply set into the host manifest the exid of where to find the key within 1password

unlock should then actually pull the key value from 1password, and set to daemon
```

### what I notice now:
- os.daemon is described as "without persistant storage in any vault"
- 1password explicitly says "set into the host manifest the exid"

**issue found:** the wish explicitly says 1password stores to manifest, but says os.daemon has "no persistent storage in any vault". this confirms os.daemon should NOT have manifest entry.

**previous assumption (no manifest for os.daemon) holds** — the wish is explicit.

---

## assumption 10: os.daemon "set" is the right verb

### what do we assume?
that `keyrack set --vault os.daemon` is the correct command.

### re-read the wish:
the wisher uses "set" explicitly for both os.daemon and 1password.

### what if different?
- could be `keyrack cache --key X --secret @stdin`
- could be `keyrack unlock --key X --vault os.daemon`

### verdict: assumption holds

**non-issue:** wisher explicitly used "set". maintain consistency.

---

## assumption 11: os.daemon and os.direct are different

### what do we assume?
that os.daemon is fundamentally different from os.direct.

### compare:
- os.direct: stores plaintext to disk, no unlock needed
- os.daemon: stores to memory only, ephemeral

### what if they merged?
- os.direct could have an `ephemeral: true` flag
- but that's more complex than separate vault types

### verdict: assumption holds

**non-issue:** separate vault types is cleaner. os.daemon is "volatile storage" vs os.direct "persistent storage".

---

## assumption 12: 1password validation on set

### re-read wish:
> "set should verify that 1password cli (or sdk?) is setup on this machine"

### what did I assume?
that validation means "check op cli is installed".

### what if broader?
the wish says "setup" not just "installed". could mean:
- op cli installed
- op cli authenticated (signed in)
- op cli can reach the specific exid

### verdict: needs clarification

**issue found:** should "verify setup" mean:
- option a: check `op whoami` succeeds (installed + authed)
- option b: check `op read $exid` succeeds (installed + authed + exid valid)

option b is stronger validation but reveals secret at set time. option a defers validation to unlock.

**question for wisher:** validate exid on set or defer to unlock?

---

## assumption 13: unlock pulls from 1password every time

### re-read wish:
> "unlock should then actually pull the key value from 1password, and set to daemon"

### what do we assume?
that every unlock fetches from 1password.

### what if different?
- first unlock: fetch from 1password → cache in daemon
- subsequent unlocks: already in daemon

but daemon is session-scoped. after logout:
- daemon dies
- next session needs fresh unlock
- 1password fetch happens again

### verdict: assumption holds

**non-issue:** unlock fetches from 1password. daemon caches for session. this is correct.

---

## assumption 14: get from 1password goes through daemon

### re-read wish:
> "get, will of course, then just pull from daemon as usual"

### what do we assume?
that get never goes to 1password directly.

### verify in code:
from `getKeyrackKeyGrant.ts` pattern:
1. check os.envvar (ci passthrough)
2. check os.daemon (session cache)
3. return null if not found

get does NOT check vaults. get only checks daemon.

### verdict: assumption holds

**non-issue:** get → daemon only. unlock → vault → daemon. this is the keyrack pattern.

---

## new issues found in r2

### issue: validate exid on set?

the wish says "verify setup" but doesn't specify if exid should be validated.

**options:**
- a: validate only `op whoami` — defers exid validation to unlock
- b: validate `op read $exid` — confirms exid works but reveals secret at set time

**recommendation:** option a (validate authed, defer exid) because:
- set should not fetch secrets
- unlock is when secrets flow
- failed exid will surface at unlock time with clear error

---

## summary after r2

| assumption | after r2 |
|------------|----------|
| no manifest for os.daemon | **confirmed by wish** — explicit "no persistent storage" |
| "set" is correct verb | holds |
| os.daemon vs os.direct distinct | holds |
| validate op authed on set | **needs wisher input** — validate exid or defer? |
| unlock fetches from 1password | holds |
| get goes through daemon only | holds |
