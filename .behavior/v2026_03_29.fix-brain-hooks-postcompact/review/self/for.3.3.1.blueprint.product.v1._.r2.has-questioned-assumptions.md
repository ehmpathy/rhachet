# self-review r2: has-questioned-assumptions

## assumption 1: blueprint error type inconsistency

**what we assume:** blueprint consistently uses UnexpectedCodePathError for invalid filter

**evidence:** r1 review decided on UnexpectedCodePathError, but blueprint lines 40 and 109 still say BadRequestError

**verdict: ISSUE FOUND** — blueprint text not updated after r1 decision

**fix:** update blueprint codepath tree line 40 and test coverage line 109 to use UnexpectedCodePathError

---

## assumption 2: matcher for boot events should be '*'

**what we assume:** for boot events, matcher should always be '*' regardless of filter.what

**evidence:** current code (translateHook.ts:28) sets `matcher = hook.filter?.what ?? '*'`

**for onBoot with filter.what=PostCompact:**
- current: matcher = 'PostCompact', event = 'SessionStart'
- proposed: event = 'PostCompact', but what should matcher be?

**analysis:** claude code boot events don't have a "tool" to match against. the matcher field for SessionStart/PreCompact/PostCompact has no semantic value — boot events fire unconditionally within their trigger.

**verdict: GAP FOUND** — blueprint doesn't explicitly state matcher strategy for boot events

**fix:** add explicit note: for onBoot events, matcher is always '*' (filter.what determines event, not matcher)

---

## assumption 3: return type change affects all callers uniformly

**what we assume:** a return type change from single to array only affects onBoot callers

**evidence:** blueprint says "single entry → array of entries (for wildcard)" but the signature change affects ALL calls

**analysis:** genBrainHooksAdapterForClaudeCode.upsert (line 109) destructures:
```ts
const { event, entry } = translateHookToClaudeCode({ hook });
```

after change, this becomes:
```ts
const results = translateHookToClaudeCode({ hook });
for (const { event, entry } of results) {
  // upsert each
}
```

this applies to onTool and onStop too — they just always return single-element arrays.

**verdict: CLARIFICATION NEEDED** — blueprint notes upsert needs update but doesn't show the iteration pattern

**fix:** no change needed — blueprint already notes upsert needs update; implementation detail

---

## assumption 4: del method must check filter.what to find bucket

**what we assume:** del should use filter.what for onBoot hooks to find the correct bucket

**evidence:** r1 deletables review identified this. del (line 164) hardcodes:
```ts
const claudeEvent = eventMap[event];  // always 'SessionStart' for onBoot
```

**analysis:** for hook with event='onBoot' and filter.what='PostCompact':
- hook was registered in 'PostCompact' bucket
- del looks in 'SessionStart' bucket
- hook not found, del fails silently

**verdict: CONFIRMED** — r1 identified correctly, blueprint notes this in codepath tree

---

## assumption 5: reverse translation for SessionStart preserves filter

**what we assume:** SessionStart → onBoot (no filter) is correct

**evidence:** blueprint reverse translation table shows:
- SessionStart entry → `[{ event: 'onBoot' }]` (no filter)

**analysis:** if someone manually adds a SessionStart hook in settings.json, should we preserve it as onBoot without filter? yes — SessionStart is the default/backwards-compat behavior.

but wait — what if there are BOTH SessionStart and PostCompact hooks from the same author with same command? the reverse translation would create two separate BrainHooks with different filters. this is correct behavior — they are semantically different hooks.

**verdict: HOLDS** — reverse translation correctly distinguishes hook types

---

## summary

| assumption | verdict |
|------------|---------|
| blueprint error type | ISSUE (BadRequestError → UnexpectedCodePathError) |
| matcher for boot events | GAP (needs explicit '*' strategy) |
| return type affects all callers | CLARIFICATION (implementation detail) |
| del checks filter.what | CONFIRMED (r1 correct) |
| reverse translation SessionStart | HOLDS |

## fixes applied to blueprint

1. update codepath tree line 40: BadRequestError → UnexpectedCodePathError
2. update test coverage line 109: BadRequestError → UnexpectedCodePathError
3. add note: for onBoot events, matcher is always '*' (filter.what determines event, not matcher)

---

## lessons

### lesson 1: r1 decisions must be applied

when r1 review makes a decision (e.g., use UnexpectedCodePathError), the blueprint must be updated immediately. r2 should not find the same inconsistency.

### lesson 2: semantic divergence needs explicit documentation

filter.what has different interpretations per event type:
- onTool: filter.what = matcher (which tool to match)
- onBoot: filter.what = event selector (which boot trigger)

this divergence deserves explicit callout in the blueprint.

### lesson 3: return type changes have blast radius

a return type change affects every caller, not just the primary usecase. the blueprint should enumerate all affected callsites.

### lesson 4: semantic overload requires explicit documentation

the same field name (`filter.what`) now carries different semantics depending on event type. this is a form of semantic overload — the field "means" different things in different contexts:

| event | filter.what means |
|-------|-------------------|
| onTool | which tool to match (becomes matcher) |
| onBoot | which boot trigger fires the hook (determines event bucket) |

this divergence isn't wrong — it's the minimal contract change. but it requires explicit documentation to prevent confusion. the blueprint now includes a note clarifying this.

### lesson 5: review layers build on each other

r1 reviewed deletables and assumptions, found issues, made decisions. r2 should verify those decisions were applied. finding the same BadRequestError issue in r2 reveals a process gap: decisions made during review must be immediately applied to the artifact.

the fix applied during r2:
- updated codepath tree line 40: BadRequestError → UnexpectedCodePathError
- updated test coverage line 109: BadRequestError → UnexpectedCodePathError

future reviews should not find stale decisions.

### lesson 6: boot events are fundamentally different from tool events

the core insight: boot events don't have a subject to match against.

| event type | subject | matcher purpose |
|------------|---------|-----------------|
| PreToolUse | tool name | filter which tools trigger hook |
| PostToolUse | tool name | filter which tools trigger hook |
| SessionStart | (none) | no subject — matcher is cosmetic |
| PreCompact | (none) | no subject — matcher is cosmetic |
| PostCompact | (none) | no subject — matcher is cosmetic |

for boot events, matcher='*' is the only sensible value. filter.what serves a completely different purpose: selecting which boot trigger fires the hook.

this fundamental difference justifies the semantic overload of filter.what — we're adapting one field to serve two purposes based on event type.

---

## counterexamples and alternatives explored

### alternative 1: separate event types instead of filter.what

**what if:** instead of `onBoot + filter.what=PostCompact`, we added `onPostCompact` as a new BrainHookEvent?

**pros:**
- no semantic overload of filter.what
- explicit event types in the domain model
- cleaner mental model

**cons:**
- breaks backwards compatibility (new event type)
- contract change required (add to BrainHookEvent union)
- proliferates event types for each boot trigger

**verdict:** rejected. filter.what is already the pattern for onTool — using it for onBoot maintains consistency. adding new event types would require contract changes and would be harder to extend for future boot triggers.

### alternative 2: keep filter.what as matcher for all events

**what if:** filter.what always becomes matcher, even for boot events?

**analysis:** for `onBoot + filter.what=PostCompact`, this would set:
- event = SessionStart (from EVENT_MAP)
- matcher = 'PostCompact' (from filter.what)

but SessionStart hooks with matcher='PostCompact' wouldn't fire on PostCompact — they'd try to match 'PostCompact' against... no subject. boot events have no target to match.

**verdict:** rejected. it would be semantically broken. matcher has no target for boot events.

### alternative 3: new field `filter.trigger` for boot events

**what if:** we added a new field specifically for boot triggers?

```ts
interface BrainHookFilter {
  what: string;              // tool matcher for onTool
  when?: 'before' | 'after'; // timing for onTool
  trigger?: string;          // boot trigger for onBoot
}
```

**pros:**
- explicit field for each purpose
- no semantic overload

**cons:**
- contract change required
- two fields that serve similar purposes
- `filter.what` and `filter.trigger` both answer "what triggers this hook?"

**verdict:** rejected. adds complexity without clarity. filter.what already answers "what triggers this hook?" — we're just interpreting the answer differently per event type.

### exception: what if claude code changes boot event structure?

**assumption:** claude code boot events (SessionStart, PreCompact, PostCompact) use the same hook structure as tool events.

**what if opposite were true:** boot events might have different structure or no matcher field at all.

**mitigation:** the blueprint tests should verify the generated settings.json structure. if claude code changes, tests will fail and reveal the incompatibility.

**verdict:** acceptable risk. we proceed with the assumption and trust tests to catch structural changes.

---

## the simplest approach question

**guide asks:** "could a simpler approach work?"

**answer:** the blueprint IS the simplest approach that:
1. requires no contract changes (filter.what already accepts any string)
2. maintains backwards compatibility (no filter = SessionStart)
3. follows extant patterns (filter.what determines "what triggers this")
4. extends cleanly (future boot triggers just work)

the only alternatives would require contract changes (new event types, new filter fields) which violate the principle of minimal change.

