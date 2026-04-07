# self-review: has-questioned-requirements

## requirement 1: `keyrack get --value`

**who said?** the wish explicitly: "keyrack should support rhx keyrack get --value"

**evidence?** current workaround: `--json | jq -r '.grant.key.secret'` — requires jq, verbose.

**what if not?** users continue needing external tools for simple piping.

**scope right?** yes — minimal addition: one flag, one output mode.

**simpler way?** no — this is the simplest approach.

**verdict:** holds. clear value, minimal scope, direct request.

---

## requirement 2: `keyrack source --key xyz`

**who said?** the wish: "it should also support rhx keyrack source --key xyz"

**evidence?** sdk has `keyrack.source()` but no CLI equivalent.

**issue found: sdk/cli mismatch**

the sdk's `sourceAllKeysIntoEnv` has this signature:
```ts
input: { env: string; owner: string; mode?: 'strict' | 'lenient' }
```

note: NO `--key` option. sdk sources ALL repo keys, not single keys.

but the wish explicitly says `source --key xyz` — single key mode.

this is a **contradiction** between:
- wish: requests `--key` support
- sdk parity: sdk has no `--key` for source

**options:**
1. add `--key` to CLI source (new feature not in sdk)
2. skip `--key` for source (match sdk, but doesn't fulfill wish)
3. add `--key` to both CLI AND sdk (more scope)

**my recommendation:** add `--key` to CLI source only. CLI ergonomics differ from sdk — shell users often need single-key exports.

**action:** flagged in "questions for wisher" section, but should be more prominent. this needs wisher input before proceeding.

**verdict:** requirement needs clarification. i've expanded scope beyond what sdk supports.

---

## requirement 3: `--strict` mode

**who said?** the wish: "with --strict mode"

**evidence?** sdk already has `mode: 'strict' | 'lenient'` with strict as default.

**what if not?** cli wouldn't match sdk semantics.

**scope right?** yes — direct parity with extant sdk.

**simpler way?** no — direct mapping is simplest.

**verdict:** holds. exact parity with sdk.

---

## requirement 4: `source` as subcommand

**who said?** implied by wish ("keyrack source --key xyz").

**alternatives considered:**
- `keyrack get --output shell` — more flags, less discoverable
- `keyrack export` — another name for same thing

**why subcommand wins:** matches sdk namespace (`keyrack.source()`), clear intent, familiar pattern (`source .env`).

**verdict:** holds. best ergonomics.

---

## issues fixed

none yet — the vision needs updates based on this review.

## issues to address

1. **sdk parity mismatch for `--key` on source**: need to either:
   - make this more prominent in questions for wisher
   - or decide to deviate from sdk intentionally (document why)

2. **missing from vision**: should clarify that `source --key` is CLI-only ergonomics, not sdk parity.

## overall assessment

vision is 90% solid. main gap: the `source --key` requirement contradicts "matches the sdk" since sdk's source has no key option. this needs wisher clarification before proceeding.
