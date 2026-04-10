# self-review: has-questioned-requirements

## requirement 1: global upgrade as default

**who said this?** the wish: "rhx upgrade should also upgrade global rhachet by default, if installed globally"

**evidence:** the wish explicitly says "by default". this is not my invention.

**what if we didn't do this?** users would need to remember `npm i -g rhachet` separately. version drift between global and local continues. this is the actual pain point the wish addresses — users run `rhx upgrade` thinking they're current, but their global `rhx` (the command they actually type day-to-day) stays stale. they only discover this when a new feature doesn't work.

**is scope too large?** no. the wish is narrow: "if installed globally" — we only act when there's a global install to upgrade. the conditional is key: we don't REQUIRE global install, we opportunistically upgrade it IF present.

**simpler way?** considered opt-in (`--global` flag required), but:
1. wish explicitly says "by default"
2. opt-in defeats the purpose — users who forget to add `--global` (most users) still experience version drift
3. the value comes from "it just works" — no extra flags to remember

**why this holds:** the requirement comes directly from the wish. the wish is addressing a real pain point (version drift). the conditional "if installed globally" keeps scope tight. changing to opt-in would not fulfill the stated wish.

**verdict:** requirement holds.

---

## requirement 2: two escape hatches (`--no-global`, `--local-only`)

**who said this?** i added these in the vision. no one asked for them.

**evidence:** invented for "explicit control" usecase.

**what if we didn't do this?** users who want isolation would have no escape hatch.

**is scope too large?** yes — two flags for the same concept is redundant. `--no-global` is sufficient.

**simpler way?** just `--no-global`. drop `--local-only`.

**verdict:** issue found. simplified to single flag.

**fix:** removed `--local-only` from vision. `--no-global` is the escape hatch.

---

## requirement 3: `--global-only` flag

**who said this?** i added this in the vision.

**evidence:** speculative usecase "i only want to upgrade global".

**what if we didn't do this?** users could run `npm i -g rhachet@latest` directly.

**is scope too large?** yes. this is an edge case. users who want global-only can use npm directly.

**simpler way?** don't add this flag. document `npm i -g rhachet@latest` as the way.

**verdict:** issue found. removed from scope.

**fix:** removed `--global-only` from vision. not needed for MVP.

---

## requirement 4: detect global install silently

**who said this?** implicit in wish: "if installed globally" implies detection.

**evidence:** the wish conditions global upgrade on presence of global install. the phrase "if installed globally" is a predicate — it requires evaluation.

**what if we didn't do this?** two failure modes:
1. always attempt global upgrade → `npm i -g` fails when no global install exists (or worse, installs globally when user never wanted that)
2. never attempt global upgrade → back to square one, wish unfulfilled

**is scope too large?** no. detection is the minimal viable check. we're not trying to detect EVERY global install mechanism (volta, homebrew, nvm, etc.) — just npm's global prefix.

**simpler way?** considered alternatives:
1. try `npm i -g rhachet@latest` and swallow errors → dangerous, could install when user didn't want global
2. ask user every time → friction, defeats "just works" goal
3. detect once and remember → adds state management complexity
detection is the right primitive.

**why this holds:** the wish says "if installed globally" — that IF requires detection. there's no simpler way to satisfy the conditional. silent detection (no-op when absent) keeps the happy path clean for npx users.

**verdict:** requirement holds. necessary for correctness and wish fulfillment.

---

## requirement 5: warn and continue if global upgrade fails

**who said this?** i proposed this as a tradeoff decision.

**evidence:** speculative error handler.

**what if we didn't do this?** fail-fast: global permission error stops entire upgrade.

**is scope too large?** maybe. this is a policy decision that should be validated with wisher.

**simpler way?** fail-fast is simpler. but may frustrate users who just want local upgrade.

**verdict:** question for wisher. flagged in "open questions" section already.

---

## requirement 6: output format with sections

**who said this?** i designed this in the vision.

**evidence:** aesthetic choice for clarity.

**what if we didn't do this?** single-line summaries work fine (current behavior).

**is scope too large?** possibly. this is a UX detail, not core functionality.

**simpler way?** keep it simple — just add "global" to the summary line.

**verdict:** issue found. simplified output.

**fix:** simplified output to single line per upgrade, not sections.

---

## summary

| requirement | verdict | action |
|-------------|---------|--------|
| global upgrade as default | holds | none |
| two escape hatches | overbuilt | removed `--local-only` |
| `--global-only` flag | overbuilt | removed from scope |
| detect global install | holds | none |
| warn and continue | uncertain | flagged for wisher |
| sectioned output | overbuilt | simplified |

## reflection

i overcomplicated the vision with escape hatches and output format that weren't asked for. the wish is simple: upgrade global by default if installed. the implementation should match that simplicity.

the core behavior is:
1. detect if global install exists
2. if yes, upgrade it
3. proceed with local upgrade (extant behavior)

no new flags needed for MVP. `--no-global` is a reasonable escape hatch if users complain.
