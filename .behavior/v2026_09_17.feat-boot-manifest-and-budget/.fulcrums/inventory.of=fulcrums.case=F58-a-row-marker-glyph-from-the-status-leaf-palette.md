# F58 — may a render row carry `🟡` or `✗` as its status marker?

- **raised** = 2026-09-30, at `5.1.execution.from_vision`, `review.peer i011` — `behavior-intent-coverage`
  nitpick.1 (`🟡` on an over-budget sweep row, an absent-resource row, an unreadable-spec header) and
  nitpick.5 (`✗` on a hook-fault row)
- **raised again** = 2026-10-01, `review.peer i016` — `mech-failhides` nitpick.1 (the `🟡`
  unreadable-spec header, read against `rule.require.qualified-error-headers`) and nitpick.2 (the
  `✗` hook-fault rows). the same fork from a second rule: a warn that exits 0 claims no refusal, and
  a row in a mixed-owner set carries its own class read off the error
- **rework** = clean
- **status** = OPEN — **yes, keep both**
- **confidence** = **80%**

## .the fork, stated fairly

| | **words, or `✋`/`💥`** (the reviewer's read) | **the palette glyph** (taken) |
|---|---|---|
| `🟡` | a callout glyph misused as a row verdict | `rule.prefer.emoji-language` registers `🟡` in TWO columns: callout (caution) and **status-leaf** (degraded). an over-cap spec, an empty resource set, and a skipped spec are each a degraded leaf |
| `✗` | an abridged refusal, where peers render `✋ ConstraintError:` | the palette registers `✓`/`✗` as the status-leaf ok/fail pair. the row is one fault in a list, and it carries the class token (`asErrorClassText`) inside it |
| `rule.require.unabridged-error-prefix` | binds `✋`/`💥` to a refusal | governs the HEADER of a thrown refusal. a fault row inside a report is a leaf, not the header |

## .the call, and why

**keep both.** each glyph is used in a sense the palette already registers, so neither is a new
coinage and neither owes a catalog row. `✋`/`💥` stay reserved for the one header a refusal opens
with; a leaf row that lists a fault borrows the leaf pair.

## .why the confidence is 80%

`🟡` in two columns is the palette's own choice, and a reader who meets it at a row's tail may still
read a caution rather than a degraded leaf. if a wisher wants one sense per column position, the
over-cap marker becomes a word (`over`), like the `(linked)` tag beside it.

## .rework

clean — swap the sweep row marker to ` (over)` and resnap `roles.cost`; swap `✗` for the class glyph
in `asHookFaultRows` and resnap `init.hooks` / `upgrade`.
