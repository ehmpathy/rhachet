# review.self: has-consistent-mechanisms (r3)

## the question

did we add new mechanisms that duplicate extant functionality?

## deeper investigation

searched the codebase for:
1. exec patterns: `grep -E 'execAsync|execSync|promisify\(exec\)'` → 23 files
2. CLI check functions: `grep -E 'export (const|function) is\w+Installed'` → 2 files
3. shared exec infrastructure: `glob '**/infra/*exec*'` → 0 files

## findings

### CLI check functions in codebase

only two `is*Installed` functions exist:

| function | location | domain |
|----------|----------|--------|
| isOpCliInstalled | `1password/isOpCliInstalled.ts` | 1password vault |
| isAwsCliInstalled | `aws.iam.sso/setupAwsSsoProfile.ts` | aws sso vault |

**pattern:** each vault adapter owns its CLI dependency check. this is intentional — vault adapters are self-contained.

**why not extract to shared infra?**

1. the functions are 3-5 lines each
2. they check different CLIs with different commands (`which op` vs `aws --version`)
3. extraction would create dependency between unrelated vault adapters
4. the rule.prefer.wet-over-dry applies: wait for 3+ usages before abstraction

**verdict:** not duplication. domain-appropriate colocation.

### exec wrapper patterns

no shared `execAsync` wrapper exists in `src/infra/`. each module creates its own:

```typescript
// pattern used in multiple files
const execAsync = promisify(exec);
```

**why not extract to shared infra?**

1. it's a one-liner (zero abstraction value)
2. import cost would exceed inline cost
3. the pattern is idiomatic node.js

**verdict:** correct inline usage, not duplication.

### prompt utilities

two prompt utilities exist in `src/infra/`:
- `promptHiddenInput` — for secrets (asterisk echo)
- `promptVisibleInput` — for non-secret input (visible echo)

**our usage:** 1password adapter correctly uses `promptVisibleInput` for exid (not a secret).

**verdict:** correct reuse of extant utility.

### daemon SDK

os.daemon adapter reuses:
- `daemonAccessUnlock` — store grant in daemon
- `daemonAccessLock` — remove grant from daemon
- `daemonAccessGet` — retrieve grant from daemon

**verdict:** correct reuse of extant mechanism.

## edge case: could we generalize isCliInstalled?

**hypothetical:**
```typescript
// generic CLI check
export const isCliInstalled = async (input: { cli: string }): Promise<boolean> => {
  try {
    await execAsync(`which ${input.cli}`);
    return true;
  } catch {
    return false;
  }
};
```

**why we didn't:**
1. only 2 CLI checks exist — below 3-usage threshold
2. aws check uses `aws --version` (validates the cli runs, not just exists)
3. op check uses `which op` (existence check is sufficient)
4. different error messages for different CLIs

the domain-specific functions allow each vault to provide appropriate install instructions.

**verdict:** abstraction would be premature.

## conclusion

no mechanisms duplicate extant functionality:

| new code | extant pattern | reused or appropriate? |
|----------|----------------|------------------------|
| isOpCliInstalled | isAwsCliInstalled | appropriate parallel |
| execAsync wrapper | inline pattern | appropriate inline |
| promptVisibleInput usage | extant utility | reused |
| daemon SDK calls | extant daemon SDK | reused |

all new code follows extant patterns appropriately.
