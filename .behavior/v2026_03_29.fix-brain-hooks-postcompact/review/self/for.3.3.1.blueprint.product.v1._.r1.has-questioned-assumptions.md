# self-review: has-questioned-assumptions

## assumption 1: claude code supports PreCompact and PostCompact events

**what we assume:** claude code exposes PreCompact and PostCompact hook events

**evidence:** vision mentions this as a research question: "claude code exposes PreCompact and PostCompact — we assume these hooks are available; needs validation"

**what if opposite were true?** if claude code doesn't support these events, the entire blueprint is moot

**verdict: RISK** — this is noted in vision as needs validation. the blueprint proceeds with this assumption. if the events don't exist, we fail fast at runtime when the hook is synced to settings.json.

---

## assumption 2: return type change is backwards compatible

**what we assume:** callers of translateHookToClaudeCode can handle array return

**evidence:** searched for usages — genBrainHooksAdapterForClaudeCode.upsert calls translateHookToClaudeCode

**current call:**
```ts
const { event, entry } = translateHookToClaudeCode({ hook });
```

**if we change to array:** callers must destructure differently or iterate

**verdict: ISSUE FOUND** — the upsert method expects single return. must update upsert to handle array. this is internal code so not a backwards compat break for users, but it's a code change not in the blueprint.

**fix:** added to filediff tree — genBrainHooksAdapterForClaudeCode.ts needs update for upsert

---

## assumption 3: matcher should be * for all boot events

**what we assume:** for PostCompact/PreCompact hooks, matcher should be `*`

**evidence:** current onBoot hooks use `*` matcher. claude code boot events don't have a tool to match against.

**what if opposite were true?** PreCompact/PostCompact might have different matcher semantics

**simpler approach:** keep matcher as `*` for all boot events. this matches current behavior.

**verdict: HOLDS** — boot events don't have a subject to match. `*` is correct.

---

## assumption 4: wildcard expansion order matters

**what we assume:** when filter.what=*, the order of returned events is SessionStart, PreCompact, PostCompact

**evidence:** no explicit order requirement in criteria

**what if opposite were true?** different order might cause hooks to fire in unexpected sequence

**simpler approach:** claude code fires events independently. order in settings.json shouldn't affect fire order.

**verdict: HOLDS** — order in settings.json is cosmetic. claude code determines actual fire order.

---

## assumption 5: BadRequestError is appropriate for invalid filter

**what we assume:** invalid filter.what should throw BadRequestError

**evidence:** criteria usecase.6 says "sync fails with clear error"

**alternative:** could use UnexpectedCodePathError since invalid filter is a developer mistake, not user input

**verdict: QUESTION** — BadRequestError implies user input error. UnexpectedCodePathError implies code bug. invalid filter.what in a role definition is authored by a developer, so it's closer to a code bug than user input.

**decision:** use UnexpectedCodePathError instead — updated in blueprint mental model.

---

## summary

| assumption | verdict |
|------------|---------|
| claude code supports PreCompact/PostCompact | RISK (noted in vision) |
| return type change is backwards compat | ISSUE (fix upsert caller) |
| matcher=* for boot events | HOLDS |
| wildcard expansion order | HOLDS |
| BadRequestError for invalid filter | QUESTION (use UnexpectedCodePathError) |

## fixes applied

1. noted upsert needs update to handle array return
2. changed error type from BadRequestError to UnexpectedCodePathError for invalid filter

