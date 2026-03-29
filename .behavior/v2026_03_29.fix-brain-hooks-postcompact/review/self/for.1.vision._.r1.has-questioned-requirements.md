# self-review: has-questioned-requirements

## requirement 1: use filter.what for boot triggers

**who said?** vision proposes to reuse filter.what pattern from onTool

**evidence:** onTool already uses filter.what for tool selection; consistent pattern

**what if we didn't?** we'd need a new field like `filter.trigger` or `filter.on`, which adds contract surface

**simpler way?** could use separate events (onSessionStart, onPreCompact, onPostCompact) instead of filters

**verdict: HOLDS** — filter.what is more composable and avoids event proliferation. one umbrella `onBoot` with filters is cleaner than three separate events.

---

## requirement 2: no filter means all boot events

**who said?** vision assumes this for backwards compat

**evidence:** current behavior maps onBoot → SessionStart only

**what if we didn't?** prior hooks would behave differently — they'd now also fire on compact events

**challenge:** this is actually a BREAKING CHANGE, not backwards compat. prior behavior is onBoot → SessionStart only. new behavior would be onBoot → SessionStart + PreCompact + PostCompact.

**verdict: ISSUE FOUND** — vision claims backwards compat but proposes breaking change. need to decide:
- option A: no filter = SessionStart only (true backwards compat)
- option B: no filter = all events (breaking change, requires migration)

**resolution:** prefer option A. no filter = SessionStart only. this preserves prior behavior. roles that want compact events must use explicit filter.

---

## requirement 3: usecase 4 contradicts established facts

**who said?** vision usecase 4 says "boot briefs on session start only (not compaction)"

**evidence:** user clarified "SessionStart already covers compaction"

**challenge:** if SessionStart fires on compaction too, then filter.what=SessionStart does NOT exclude compaction. usecase 4 is wrong.

**verdict: ISSUE FOUND** — usecase 4 is based on incorrect assumption. filter.what=SessionStart would still fire on compaction if SessionStart fires on compaction.

**resolution:** remove usecase 4. the mental model needs clarification:
- SessionStart fires on: new session AND compaction
- PostCompact fires on: compaction only
- filter.what=SessionStart = fires on new session AND compaction
- filter.what=PostCompact = fires on compaction only (not new session)

the distinction is: PostCompact is a subset of SessionStart events, not an alternative.

---

## requirement 4: adapter emits multiple claude hooks from one rhachet hook

**who said?** vision proposes this for no-filter case

**evidence:** enables "fire on all boot events" with single declaration

**what if we didn't?** users would need to declare separate hooks per event

**simpler way?** could require explicit filter always (no default "all")

**verdict: QUESTION** — do we need this? if no filter = SessionStart only (per issue #2), then no multi-emit needed.

**resolution:** if we go with option A (no filter = SessionStart only), then adapter remains simple 1:1 mapping. only filter.what=* would require multi-emit.

---

## requirement 5: supplier brief for PostCompact

**who said?** wish mentions "findsert a brain supplier brief"

**evidence:** needed for documentation completeness

**what if we didn't?** users would have to discover the pattern from code

**verdict: HOLDS** — documentation is required.

---

## requirement 6: link from readme

**who said?** wish mentions "ensure that brief is linked from the root readme"

**evidence:** current readme links to other supplier briefs

**what if we didn't?** brief would be undiscoverable

**verdict: HOLDS** — follows current pattern.

---

## issues found

1. **backwards compat claim is false** — no filter = all events is a breaking change
2. **usecase 4 is based on wrong assumption** — SessionStart fires on compaction too
3. **mental model needs clarification** — PostCompact is subset of SessionStart triggers

## fixes applied ✓

1. ✓ updated vision: no filter = SessionStart only (true backwards compat)
2. ✓ removed usecase 4 (contradicted established facts)
3. ✓ clarified mental model: SessionStart includes compaction; PostCompact is compaction-only subset
4. ✓ updated adapter logic: no filter defaults to SessionStart, wildcard expands to all
5. ✓ updated examples: use `npx rhachet run --init postcompact.trust-but-verify.sh` instead of fictional native command
6. ✓ updated goal: "question assumptions the brain made" not "retained critical context"
7. ✓ updated day-in-the-life: "never trust anyone, even yourself" philosophy

---

## requirement 7: custom init for trust-but-verify

**who said?** user clarified during review that trust-but-verify should be a custom init

**evidence:** "trust but verify would be a custom npx rhachet run --init postcompact.trust-but-verify.sh, not some native rhachet primitive"

**what if we didn't?** vision would imply a native `rhachet verify` command that doesn't exist

**verdict: ISSUE FOUND** — original vision used fictional `npx rhachet verify --quick-check`

**resolution:** updated all examples to use `npx rhachet run --init postcompact.trust-but-verify.sh` pattern, which aligns with how roles define custom inits

---

## requirement 8: clarity on why PostCompact matters

**who said?** user emphasized during review

**evidence:** "cause we only need to verify compaction claims IF there was a compaction event. not on fresh boot"

**what if we didn't?** usecase might be read as "verify on every boot" which misses the precision

**verdict: HOLDS** — the timeline already shows:
- t0: fresh boot → PostCompact does NOT fire
- t2: compaction → PostCompact fires → verification runs

the distinction is explicit in the vision.

---

## requirement 9: trust-but-verify means question assumptions

**who said?** user clarified the philosophy

**evidence:** "never trust anyone, even yourself"

**what if we didn't?** goal might be read as "confirm the bot remembered things" — passive validation

**verdict: ISSUE FOUND** — original goal said "verify the brain retained critical context" which is passive

**resolution:** updated goal to "question assumptions the brain made after compaction" — active questioning. the compaction summary is a claim that should be verified. never trust, even yourself.

---

## lessons for next time

### lesson 1: verify claims about prior behavior

the original vision claimed "backwards compatible" while proposing a breaking change. this happened because I assumed "no filter = all events" was the prior behavior without checking.

**how to avoid:** before claiming backwards compat, read the current implementation. the truth is in translateHook.ts:
```ts
const EVENT_MAP: Record<BrainHookEvent, string> = {
  onBoot: 'SessionStart',  // <- this is the truth
  ...
};
```

### lesson 2: question usecases that fight the domain

usecase 4 said "boot briefs on session start only (not compaction)" — but this fights the established fact that SessionStart fires on compaction. the usecase was trying to solve a non-problem.

**how to avoid:** when a usecase feels forced, ask "does this usecase fight the domain model?" if yes, the usecase may be based on a false premise.

### lesson 3: clarify event hierarchies early

the mental model was unclear: is PostCompact an alternative to SessionStart, or a subset? the answer (subset) changes everything about the design.

**how to avoid:** early in vision work, diagram the event hierarchy:
```
triggers:
  new session    → SessionStart only
  compaction     → SessionStart AND PostCompact
```

this makes the relationship explicit before writing usecases.
