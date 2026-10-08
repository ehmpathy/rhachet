# F34 — one halt rendered twice, or the class name lost?

- **raised** = 2026-09-23, at `5.1.execution.from_vision`, `review.peer i014 r010`
- **rework** = clean
- **status** = **DISPUTED**
- **confidence** = **93%**

---

## .the fork, stated fairly

a budget halt reaches a human as **two** renders, back to back:

```
   └─ fix — four strategies, cheapest first
      ├─ catalogize  …
      └─ eliminate   …

✋ ConstraintError: boot payload exceeds its declared budget

{ "hint": …, "budget": 20, "payload": 335, "over": 315 }

[args] roles,boot,--repo,.this,--role,any
```

`assertBootWithinBudget` prints the friendly tree, then **throws**; `emitCliErrorAndExit` catches
every throw by design and renders the class frame. so the same three numbers appear twice, in two
registers.

| | **keep both** | **suppress the frame when a friendlier one was printed** |
|---|---|---|
| what a human reads | the ladder, then a denser restatement with a json tail | 🔴 the ladder alone — matches every worked example in `0.wish.md`, `case=2`, `case=8` |
| what a **machine** reads | ✅ `budget` / `payload` / `over` as structured json on stderr | 🔴 prose it must regex |
| the **class name** | ✅ present — `ConstraintError`, once | 🔴 **gone.** the tree renders `├─ ✋ over budget` — glyph, no class |
| the rule | conforms | 🔴 **violates `rule.require.unabridged-error-prefix`**: *a wrapper, frame, or formatter that drops the class name en route = blocker* |
| the cost | cosmetic noise on a human surface | a capability, and a rule violation |

---

## .the call, and why — at the time

**keep both. the duplication is the accepted cost.**

four grounds, and the fourth is the one that settles it:

1. 🔴 **the suppression would create a blocker.** the friendly tree carries `✋` and no class name.
   the class appears in exactly one place — the frame the reviewer would suppress. ⇒ **the two
   halves cover for each other**: the tree is legible, the frame is greppable. remove the frame and
   `ConstraintError` vanishes from the whole surface, so a human cannot part a caller fault from a
   server one without the exit code — which is that rule's own stated test.
2. **the bag is a capability, not decoration.** `assertBootWithinBudget` is reached from the sdk and
   from both gates. a caller that catches the error can **branch** on `budget`/`payload`/`over`; it
   cannot recover those numbers from prose it never captured.
3. **it was raised before and settled on the record** — `assertBootWithinBudget.ts:92-96` carries the
   prior round's answer verbatim: *"a strip of this bag was tried … the concern is real and it is
   COSMETIC, where the loss is a capability — so the bag stays."*
4. 🔴 **the repo already met this exact fork and resolved it the OTHER way.**
   `getRoleBySpecifier.ts:31-46` once printed `✋ failed to load rhachet.use.ts:` plus the message,
   then rethrew — and the **friendly copy was deleted, the class frame kept**, on three counts of
   which the first is *"it carried a bare `✋` with NO class name."* ⇒ **one double-render, two
   copies, and the copy that was cut is the friendly one.**

🟡 **and the budget halt is the case where that resolution is not even available.** the friendly
copy here **is** requirement 3 — the remedy ladder the wish asks for by name. so the precedent's
move (keep the frame, drop the copy) cannot apply, and the only reachable shapes are **both** or
**frame-only**. the reviewer asks for the third, and the third is the one that loses the class.

### what the reviewer IS right about, and it shipped

the frame's `hint` once read *"the strategies are named above"* — true on a cli and false for every
other caller; an sdk consumer has no *"above"*. it now names the moves in its own words, so a reader
who holds only the error still holds a fix. **that was the genuinely defective half of the
duplication**, and it is closed.

---

## .why the confidence is 93% rather than higher

**the 7% is the reviewer's strongest sentence, and it is unanswered by this call:**

> *"no acceptance test asserts the *absence* of the raw-JSON duplication the way it asserts the
> *presence* of the pretty box"*

⇒ that is correct. the snapshot **pins** the current shape, so a future edit that makes the
duplication worse — a third render, a wider json tail — would be re-blessed by a resnap rather than
caught. the decision above is *"both renders are right"*; it does **not** clamp *"and no more than
two."*

🟡 a negative assertion (`the halt renders exactly one class frame`) is the cheap fix and it is not
in this round. that is the honest residual: the fork is settled, and the clamp on the settlement is
owed.

---

## .where

- `src/domain.operations/boot/assertBootWithinBudget.ts:92-101` — the prior round's record + the
  self-contained `hint`
- `src/domain.operations/invoke/getRoleBySpecifier.ts:31-46` — the first-party precedent, resolved
  the opposite way
- `blackbox/cli/__snapshots__/roles.boot.budget.acceptance.test.ts.snap` — where both renders are
  pinned
- `.agent/repo=.this/role=any/briefs/rule.require.unabridged-error-prefix.md` — the rule the
  suppression would violate

## .the verdict, once ruled

_(open — for the fulcrum council)_
