# self-review: has-questioned-assumptions

## explicit assumptions in the vision

### assumption 1: "the -270m is a symptom, not the root cause"

**what evidence supports this?**
- the TTL calculation code looks correct: `Date.now() + effectiveDurationMs`
- the same code works for non-sudo keys

**what evidence contradicts this?**
- the -270m is extremely specific (4.5 hours in the past)
- if the calculation were correct, expiresAt would be in the future

**what would prove this assumption wrong?**
if the TTL calculation itself produces a past timestamp, the -270m IS the root cause.

**verdict**: this assumption is likely WRONG. the -270m is too specific to be random. investigate the TTL calculation path for sudo keys specifically.

---

### assumption 2: "the tests cover the happy path"

**what evidence supports this?**
- tests pass for `os.direct` vault
- 94 tests passed in the sudo acceptance test suite

**what evidence contradicts this?**
- user's issue is with `1password` vault, not `os.direct`
- tests may not cover the exact IPC serialization path

**what would prove this assumption wrong?**
if the defect only manifests with 1password vault or specific IPC conditions.

**verdict**: this assumption holds partially. tests cover `os.direct` but not `1password`.

---

### assumption 3: "the daemon was stale"

**what evidence supports this?**
- daemon bytecode persistence is a known pattern
- user may have had an old daemon active

**what evidence contradicts this?**
- user's output shows: `[keyrack-daemon] spawned background daemon (pid: 2540735)`
- this means a FRESH daemon spawned, with FRESH bytecode

**what would prove this assumption wrong?**
if the daemon was freshly spawned (which the output confirms).

**verdict**: this assumption is FALSE. the user's daemon was freshly spawned. stale bytecode is not the cause.

---

## hidden assumptions in the vision

### hidden assumption 4: "the 30m TTL is enforced correctly for sudo"

**what do we assume?**
the vision states "30 minutes" for sudo TTL as if it's a fact.

**what evidence supports this?**
need to verify the code path that determines TTL for env=sudo.

**what if the opposite were true?**
if TTL calculation uses a different value for sudo, or defaults incorrectly, expiresAt could be wrong.

**verdict**: must verify. check `unlockKeyrackKeys.ts` for TTL calculation with env=sudo.

---

### hidden assumption 5: "the daemon stores the key correctly"

**what do we assume?**
the vision assumes unlock sends data to daemon and daemon stores it.

**what if the unlock appeared to succeed but daemon.set() failed?**
the CLI would show success, but daemon would have no key.

**what evidence supports this?**
user's `keyrack status` shows "(no keys unlocked)" — daemon has no keys stored.

**verdict**: daemon either never received the key, or rejected it. investigate IPC between unlock and daemon.

---

### hidden assumption 6: "the slug format is consistent"

**what do we assume?**
"ehmpathy.sudo.GITHUB_TOKEN" is the slug format used everywhere.

**what if set uses one format but get uses another?**
key would be stored under one slug, queried under another.

**what evidence supports this?**
user ran `set --key GITHUB_TOKEN --env sudo --org ehmpathy` and it showed `ehmpathy.sudo.GITHUB_TOKEN`. consistent.

**verdict**: slug format appears consistent. low risk.

---

### hidden assumption 7: "the unlock output means success"

**what do we assume?**
the vision says "unlock appears to succeed" based on CLI output.

**what evidence?**
user's output shows the key details with `-270m` expiration. the CLI *did* output data.

**what if the -270m causes immediate expiration?**
unlock "succeeded" in the sense that it ran, but the grant expired immediately because expiresAt was in the past.

**verdict**: unlock did run. the defect is that expiresAt was already expired at creation time. this is the root cause.

---

### hidden assumption 8: "expiresAt type is preserved through IPC"

**what do we assume?**
`KeyrackKeyGrant.expiresAt` is `IsoTimeStamp` (string), and it stays a string through daemon IPC.

**what evidence contradicts this?**
found type mismatch: `daemonAccessGet` declares `expiresAt: number` in some interfaces.

**what would happen if type changed?**
string "2026-03-29T18:35:50.000Z" becomes NaN when parsed as number, or vice versa.

**verdict**: high risk. the type mismatch between string and number could corrupt the timestamp. investigate IPC serialization.

---

## new hypothesis

given that:
1. daemon was freshly spawned (assumption 3 is false)
2. tests pass with `os.direct` vault
3. -270m is a very specific number (4.5 hours in the past)
4. user's `keyrack status` shows "(no keys unlocked)"

the root cause is likely in:
1. **daemon IPC serialization**: `expiresAt` type loss (string vs number mismatch)
2. **or** daemon rejected the grant because expiresAt was already expired
3. **or** daemon never received the grant due to IPC failure

### type mismatch evidence

found in research:
- `daemonAccessGet` declares `expiresAt: number`
- `KeyrackKeyGrant.expiresAt` is `IsoTimeStamp` (string)

this type mismatch could cause:
- daemon stores timestamp as number
- client expects string
- deserialization produces invalid date

**next step**: trace the exact path from unlock to daemon storage, verify type at each step.

---

## what changed in the vision

after review:
1. **stale daemon theory is disproven** — daemon was fresh (update vision line 118)
2. **type mismatch is the new primary hypothesis** — expiresAt serialization
3. **focus shifts to IPC layer** — not vault adapter or TTL calculation
4. **"no keys unlocked" is critical evidence** — daemon has no keys stored, not just expired

the vision's evaluation section lists three possibilities (lines 117-120). option 1 (stale daemon) is now disproven. the vision should be updated to reflect this.
