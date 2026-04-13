# self-review: has-questioned-requirements

## requirement 1: fill should prompt for mech like set does

**who said this?** wisher, this conversation

**evidence:**
- `keyrack set` shows "which mechanism?" when `--mech` not provided
- fill currently skips this, goes straight to "enter secret for..."
- root cause: hydration hardcodes `mech: 'PERMANENT_VIA_REPLICA'`

**what if we didn't do this?**
- users forced into static token flow for fill
- must detour through `set` to use ephemeral credentials
- inconsistent UX between fill and set

**could we achieve simpler?**
- this IS the simplest fix
- two lines changed: make mech nullable, stop hardcode of default
- no new code, no new files, no new logic

**verdict:** requirement holds. minimal fix, clear value.

## requirement 2: no key-name-based mech inference

**who said this?** wisher explicitly rejected this approach

**original proposal:**
```ts
if (keyName.includes('GITHUB_TOKEN')) return 'EPHEMERAL_VIA_GITHUB_APP';
```

**wisher's response:** "no. it should not infer. it should use the same exact flow as set does today"

**what if we did inference?**
- would auto-select mech based on key name patterns
- fewer prompts for known patterns
- but: adds complexity, magic behavior, harder to understand

**verdict:** requirement holds. explicit prompt > implicit inference. same behavior as set.

## conclusion

both requirements are justified:
1. parity with set — clear user need, minimal fix
2. no inference — user explicit rejection, simpler is better
