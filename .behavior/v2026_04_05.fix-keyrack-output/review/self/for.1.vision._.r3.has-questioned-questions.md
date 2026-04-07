# self-review r3: has-questioned-questions (deep verification)

## verification against code

### question 3 revisited: should lenient mode emit notices to stderr?

**my r2 answer:** yes, emit notices to stderr.

**but wait — what does the SDK actually do?**

from `sourceAllKeysIntoEnv.ts`:
```ts
const mode = input.mode ?? 'strict';
const keysNotGranted = keysForEnv.filter((k) => k.status !== 'granted');
if (mode === 'strict' && keysNotGranted.length > 0) {
  process.exit(2);
}
// lenient mode: no notices, just skips
for (const key of keysForEnv) {
  if (key.status === 'granted') {
    process.env[key.keyName] = key.secret;
  }
}
```

**SDK lenient mode is SILENT.** no notices at all.

**contradiction identified:**

| behavior | SDK | my vision |
|----------|-----|-----------|
| lenient mode skips | yes | yes |
| lenient mode emits notices | **no** | **yes** |

the wish says "in a way that matches the sdk". my proposal adds notices that SDK does not have.

**is this a contradiction?**

analysis:
- "matches the sdk" could mean: same semantics (strict/lenient behavior)
- or: exact output parity (no notices, same as SDK)

the wish asks for `--strict mode, in a way that matches the sdk`. this phrase modifies `--strict mode`, not lenient mode.

but the spirit is: CLI should behave like SDK.

**options:**

1. **silent lenient (SDK parity)**: no notices, just skip
   - pro: exact SDK match
   - con: harder to debug why keys absent

2. **notices on stderr (CLI extension)**: emit `⚠️ KEY: skipped`
   - pro: debuggability
   - con: deviates from SDK

3. **notices opt-in via --verbose**: silent by default, notices with flag
   - pro: SDK parity by default, debuggability opt-in
   - con: adds another flag

**resolution:**

the wish emphasizes `--strict mode` to match SDK. lenient mode notices are a CLI ergonomics choice, not a semantic deviation. the core behavior (skip absent keys, exit 0) matches SDK.

however, to be conservative: change vision to match SDK exactly (silent lenient). users can use `--json` if they need to debug which keys were skipped.

**action:** update vision to remove stderr notices from lenient mode.

---

### question 1 updated: `--value` as flag AND `--output value` [UPDATED per wisher feedback]

**the question:** should `--value` be a flag or output mode like `--output value`?

**original answer:** use `--value` as flag for consistency with extant `--json` flag.

**wisher feedback:** support both. `--output` is the full format, `--value` and `--json` are aliases.

**updated answer:** support both patterns:
- `--output <mode>` is the full format (value, json, vibes)
- `--value` is shorthand for `--output value`
- `--json` is shorthand for `--output json`

**why this is better:**

1. **extensibility**: `--output` pattern allows more modes later (e.g., `--output yaml`)

2. **ergonomics**: `--value` and `--json` remain as convenient shorthands for common cases

3. **explicitness**: users who prefer explicit can use `--output value`; users who prefer brevity can use `--value`

4. **consistency**: aligns output mode selection under one `--output` flag with aliases for convenience

**verdict:** answer updated per wisher direction. support both `--output <mode>` and shorthand aliases.

---

### question 2 verified: no `--for repo` syntax [non-issue]

**the question:** should `source` support `--for repo` syntax or just default to repo?

**why this matters:** `keyrack get` uses `--for repo` vs `--key X` distinction. should `source` follow the same pattern?

**evidence from SDK:**
```ts
sourceAllKeysIntoEnv(input: { env: string; owner: string; mode?: 'strict' | 'lenient' })
```

no key filter in SDK. it sources ALL repo keys, no option to filter.

**why the answer holds:**

1. **SDK parity**: SDK has no key filter. `source` without `--key` = all repo keys is exact SDK parity.

2. **common case is all keys**: users who want to source keys typically want all of them for their env. requiring `--for repo` for the common case adds friction.

3. **`--key` is the escape hatch**: `source --key X` is the CLI ergonomics extension for single-key use. this is additive, not replacing the default.

4. **simpler mental model**: `source` = source all keys. `source --key X` = source just X. no need to remember `--for repo`.

5. **wish validates single-key mode**: the wish explicitly asks for `source --key xyz`. this confirms the wisher wants both:
   - all keys (SDK parity)
   - single key (CLI extension)

**verdict:** answer holds. omit `--for repo`. simpler, intuitive, SDK-parity for default case.

---

## vision update required

remove stderr notices from lenient mode behavior:

**before:**
```
stderr: ⚠️ ehmpathy.test.API_KEY: skipped (not granted)
```

**after:**
lenient mode is silent (SDK parity). use `--json` to see which keys were skipped.

---

## issues found and fixes

### issue 1: lenient mode notices contradict SDK parity [FIXED]

**problem:** r2 answer for question 3 proposed stderr notices in lenient mode. but SDK's lenient mode is silent — no notices at all.

**the wish says:** "in a way that matches the sdk"

**what i learned:**
- always verify answers against actual code, not just logic
- "matches the sdk" means semantic parity, not just "similar vibes"
- SDK code is the source of truth for SDK parity questions

**how i fixed it:**
1. read the actual SDK code in `sourceAllKeysIntoEnv.ts`
2. discovered lenient mode has no console output at all
3. updated vision to match SDK (silent lenient mode)
4. updated answer to question 3 in vision document

**the fix in vision:**
```diff
- 3. **should lenient mode emit notices to stderr for skipped keys?**
-    [answered] yes. stderr notices help debug; don't break eval on stdout.
+ 3. **should lenient mode emit notices to stderr for skipped keys?**
+    [answered] no. SDK lenient mode is silent; CLI matches SDK. use `--json` to debug.
```

---

## reflection on the review process

### what worked well

1. **code verification**: actually reading `sourceAllKeysIntoEnv.ts` revealed the contradiction my logic-only answer missed.

2. **structured question triage**: the "can this be answered via code?" prompt forced me to look at SDK implementation.

3. **conservative resolution**: when in doubt about "matches the sdk", i chose exact parity over ergonomic deviation.

### what i'll remember

- "matches the sdk" questions require reading SDK code, not just understanding SDK intent
- debugging ergonomics (notices) can be achieved via `--json` without SDK deviation
- every answer should cite evidence, not just reasoning

---

## summary

**questions triaged:**

| question | status | evidence |
|----------|--------|----------|
| `--value` as flag vs `--output value` | [answered] | extant `--json` flag pattern |
| `--for repo` syntax for source | [answered] | SDK has no key filter |
| lenient stderr notices | [answered] | SDK is silent |

**issues found:** 1

**issues fixed:** 1 (lenient mode notices removed to match SDK silence)

all three questions now have [answered] status with code-verified evidence. no [research] or [wisher] items remain.
