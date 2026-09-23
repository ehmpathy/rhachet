# rule.forbid.deferrals-short-of-a-dedicated-pr

## .what

no deferral of found work — not a dream, not a fulcrum, not a "follow-up" — unless the work is a
**massive dirty refactor that warrants its own dedicated PR**. every item below that bar is done
**now**, in the PR that found it.

> zero deferrals allowed. the only exception is a massive dirty refactor that deserves its own
> dedicated PR. any bar less than that → forbidden, do now.

## .why

a deferral feels like a record and is a deletion in a polite coat. the context that made the fix
cheap — the file already open, the mechanism already understood, the credential already unlocked —
is spent NOW and re-bought later at full price, by someone who lacks it. a dream is the second-best
outcome, and its bar is high, not low.

the old `rule.always.fix-forward-under-scouts-honor` SAFE/CLEAN test deferred aught that read
"dirty". that bar was too low: it let a 2-file DRY extraction, a dead-code removal, a scope-leak
move, and a measurement-gated test all become dreams. this rule raises the bar to its true height.

## .the one exception

a **massive dirty refactor** — one that re-shapes a core contract, ripples across many callers, and
genuinely warrants its own focused review — may become **its own dedicated PR**. that is NOT a
vague dream in `.dream/`; it is a planned, scoped follow-up PR with a title and a bounded diff.

## .the test

> **is this a massive dirty refactor that deserves its own dedicated PR?**

- **no** → do it now, in this PR. drop the dream if one was caught.
- **yes** → open (or plan) a dedicated PR with a bounded scope. still not a `.dream/` deferral.

## .what does NOT clear the bar (each = do now)

| the excuse | why it fails |
|---|---|
| "rule of three — only 2 usages" | wet-over-dry is not a deferral licence; if the extraction is right, do it |
| "it would touch it twice" | a clean extraction helps the later work, it does not double it |
| "measurement-gated" | take the measurement now — run the realbrain capture, read the `.d.ts` |
| "can't verify this session (credential/SSO)" | ask the human to open the gate — do not assume it is closed |
| "a scope-cut nitpick" | a nitpick found is a nitpick fixed |
| "dead code, low priority" | a delete of dead code is small and clean — remove it |
| "a scope-leak / arrow-backwards move" | mechanical and clean — move it |

## .enforcement

- any deferral (a `.dream/`, a fulcrum, a "follow-up" note) of work that is NOT a massive dirty
  refactor worth its own PR = **blocker**.
- a credential/SSO gate cited as a deferral reason before the human was asked to open it =
  **blocker**.
- a measurement cited as a deferral reason when the measurement could be taken now = **blocker**.

## .see also

- `rule.always.fix-forward-under-scouts-honor` (bhrain/driver) — the SAFE/CLEAN test this hardens
- `rule.always.catch-dreams-for-followups` (bhrain/driver) — a dream is now reserved for the
  dedicated-PR case only
