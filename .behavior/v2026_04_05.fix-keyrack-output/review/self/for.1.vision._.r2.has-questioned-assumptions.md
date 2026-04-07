# self-review r2: has-questioned-assumptions (deeper reflection)

## re-read the wish with fresh eyes

the wish states:

> "keyrack should support rhx keyrack get --value; it should also support rhx keyrack source --key xyz, with --strict mode, in a way that matches the sdk"

break down the semicolon structure:
1. `keyrack get --value` — first request
2. `keyrack source --key xyz, with --strict mode, in a way that matches the sdk` — second request

the phrase "in a way that matches the sdk" applies to source, not get.

---

## deep assumption review

### assumption: `source` and `get --value` serve different purposes

**what do we assume?** that both are needed — `get --value` for pipe use, `source` for shell env setup.

**what if opposite?** could achieve same with just one:
```bash
# with only get --value
export X=$(rhx keyrack get --key X --value)

# with only source
eval "$(rhx keyrack source --key X)"
```

both set `X` in the shell. why have both?

**deeper analysis:**

| need | get --value | source |
|------|-------------|--------|
| pipe to command | `cmd $(keyrack get --value)` | not ergonomic |
| set single env var | `export X=$(...)` | `eval "$(source --key X)"` |
| set multiple env vars | n/a | `eval "$(source ...)"` |
| programmatic (no shell) | works via stdout | requires eval |

verdict: they serve different usecases. both needed.

- `get --value` is for PIPES (stdin/stdout composition)
- `source` is for SHELL ENV SETUP (eval pattern)

**why it holds:** the wish explicitly asks for both: "keyrack get --value" AND "keyrack source --key xyz". the wisher sees them as distinct.

---

### assumption: "matches the sdk" means strict/lenient semantics

**what do we assume?** that "in a way that matches the sdk" means same strict/lenient mode behavior.

**what else could it mean?**
- same return types? (not applicable, CLI returns text/json)
- same error messages? (possible)
- same function signature? (not applicable, CLI is text-based)
- same defaults? (yes — strict is default)

**sdk analysis:**
```ts
sourceAllKeysIntoEnv(input: {
  env: string;
  owner: string;
  mode?: 'strict' | 'lenient';  // defaults to 'strict'
})
```

key sdk behaviors:
1. strict is default
2. strict mode exits with 2 if any key not granted
3. lenient mode skips absent keys
4. no `--key` option in sdk

**contradiction identified:**

the wish asks for `source --key xyz` but sdk's source has no key filter. the wish requests:
- sdk-LIKE behavior (strict/lenient, env, owner)
- PLUS new `--key` option (cli-only ergonomics)

**verdict:** "matches the sdk" means semantics (strict/lenient, defaults, error behavior), not exact signature. the `--key` option is new cli functionality that extends beyond sdk.

**action:** vision should explicitly document that `source --key` is CLI extension, not SDK parity.

---

### assumption: `source` without `--key` sources all repo keys

**what do we assume?** that omit of `--key` defaults to all repo keys.

**did wisher say?** no — wish only shows `--key xyz` example.

**sdk evidence:** sdk's source has no key option and sources ALL keys.

**question:** is all-keys mode needed or just nice-to-have?

**analysis:** if we only implement `--key` mode:
- matches wish literally
- users who want all keys must call multiple times or use sdk

if we implement both:
- exceeds wish but matches sdk behavior
- more complete solution

**verdict:** implement both, but clarify in vision that:
- `--key` mode: direct wish request
- all-keys mode: sdk parity bonus (optional if scope concern)

---

### assumption: `--env` is required for source

**what do we assume?** must specify env.

**sdk evidence:** sdk requires env: `input: { env: string; ... }`

**what if opposite?** could infer from NODE_ENV or .env file.

**why require explicit:** credentials are sensitive. env inference is dangerous. explicit is safer.

**verdict:** holds. matches sdk. explicit is safer.

---

### assumption: `--owner` is required for source

**what do we assume?** must specify owner.

**sdk evidence:** sdk requires owner: `input: { ...; owner: string }`

**counterexample:** could default to 'default' owner (most common case).

**what if opposite?** simpler command: `rhx keyrack source --env test` instead of `rhx keyrack source --env test --owner ehmpath`

**trade-off:**
- require owner: verbose but explicit, no surprise behavior
- default owner: concise but implicit assumption

**verdict:** keep required for now (matches sdk), but note as potential ergonomics improvement.

---

## issues found and fixes

### issue 1: vision doesn't clarify `source --key` is cli extension

**problem:** vision treats `source --key` as sdk parity, but sdk has no key option.

**fix:** update vision to explicitly state:
- `source` base behavior (strict/lenient, env, owner) = matches sdk
- `source --key` = new cli ergonomics, extends beyond sdk

### issue 2: all-keys mode wasn't requested

**problem:** i added `source` without `--key` that defaults to all keys, but wish only shows `--key` example.

**verdict:** keep it because it matches sdk behavior, but document as "bonus" that brings full sdk parity.

---

## summary

core vision holds. main clarification needed: `source --key` is cli extension beyond sdk, not sdk parity. the phrase "matches the sdk" applies to strict/lenient semantics, not exact signature.
