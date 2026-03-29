# self-review: has-questioned-deletables

## feature 1: translateHookToClaudeCode return type change

**traceability:** criteria usecase.5 — "wildcard filter fires on all boot events"

**can we delete?** no — wildcard requires return of multiple entries

**verdict: HOLDS** — the return type must change to array to support `filter.what=*`

---

## feature 2: BOOT_EVENTS constant

**traceability:** criteria usecase.6 — "invalid filter value fails fast"

**can we delete?** no — need to validate filter.what values

**simpler version?** could inline the values in the function

**verdict: SIMPLIFY** — inline validation, no separate constant needed. the function itself can have:
```ts
const VALID_BOOT_EVENTS = ['SessionStart', 'PreCompact', 'PostCompact'];
if (!VALID_BOOT_EVENTS.includes(bootTrigger)) throw new BadRequestError(...);
```

---

## feature 3: isValidBootEvent type guard

**traceability:** criteria usecase.6 — "invalid filter value fails fast"

**can we delete?** yes — simple `includes()` check is sufficient

**verdict: DELETE** — removed from blueprint, use inline check instead

---

## feature 4: ClaudeCodeSettings type update

**traceability:** prod research pattern 5 — "need to add PreCompact and PostCompact to the type"

**can we delete?** yes — the `[key: string]: unknown` already allows any keys

**simpler version?** keep type as documentation, but not strictly required

**verdict: HOLDS (optional)** — add for documentation value, but not a blocker

---

## feature 5: genBrainHooksAdapterForClaudeCode.del update

**traceability:** prod research pattern 6 — "this also needs update to handle new boot events"

**can we delete?** need to check if del actually needs update

**analysis:** del looks up by event type. if an onBoot hook was registered under PostCompact, del needs to know that. but the current logic only deletes from one event bucket per hook.

**verdict: ISSUE FOUND** — del uses hardcoded map. BUT: for onBoot hooks with filter.what=PostCompact, the hook.event is still 'onBoot'. the del method uses `hook.event` to determine which bucket. this means del will look in SessionStart bucket even for PostCompact hooks.

**fix needed:** del must also use filter.what to determine the bucket for onBoot events.

---

## feature 6: supplier brief

**traceability:** wish — "findsert a brain supplier brief"

**can we delete?** no — explicitly requested

**verdict: HOLDS**

---

## feature 7: readme link

**traceability:** wish — "ensure that brief is linked like the other brain supplier briefs"

**can we delete?** no — explicitly requested

**verdict: HOLDS**

---

## summary

| feature | verdict |
|---------|---------|
| return type change | HOLDS |
| BOOT_EVENTS constant | SIMPLIFY (inline) |
| isValidBootEvent guard | DELETE |
| ClaudeCodeSettings type | HOLDS (optional) |
| del update | ISSUE FOUND (needs fix) |
| supplier brief | HOLDS |
| readme link | HOLDS |

## fixes applied

1. removed isValidBootEvent type guard from blueprint — inline check is simpler
2. simplified BOOT_EVENTS to inline validation
3. noted del method issue for execution phase

---

## lessons

### lesson 1: trace before build

before adding a component, ask "which requirement demands this?"

the isValidBootEvent type guard felt necessary but traced to no explicit requirement. a simple inline check does the job. the criteria said "fail fast" — it did not say "create a type guard".

### lesson 2: del method asymmetry

the translate functions go both directions:
- TO: BrainHook → ClaudeCodeEntry
- FROM: ClaudeCodeEntry → BrainHook

but del uses a third path: unique key → bucket lookup. this asymmetry means any new event type (PostCompact, PreCompact) creates three codepaths to update, not two. the blueprint now notes this.

### lesson 3: optional is not deletable

ClaudeCodeSettings type update is optional (the `[key: string]: unknown` fallback works). but "optional" does not mean "delete". documentation value exists. i kept it because it helps readers understand the shape, even if TypeScript doesn't enforce it.

