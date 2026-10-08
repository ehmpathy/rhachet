# rule.forbid.stormcloud-for-errors

> **`⛈️` never marks an error. every fault renders `✋` or `💥`, and the choice names its OWNER.**

```
✋  ConstraintError   — the CALLER must fix it   — exit 2
💥  MalfunctionError  — the SERVER must fix it   — exit 1
```

⇒ the `error-class` slot of `rule.prefer.emoji-language` holds **exactly two** glyphs, and this is
the blocker-grade rule that keeps it at two.

## .why — the two glyphs carry a FACT; the stormcloud carries a mood

| `⛈️` says | `✋` / `💥` say |
|---|---|
| a fault occurred | 🔴 **who must act, and what the exit code is** |
| — | a reader can route it: fix my call, or file a defect |

`rule.require.failloud` and `rule.require.exit-code-semantics` both turn on the same split —
caller-owned vs server-owned. **a glyph that renders both alike erases the one distinction the
error taxonomy exists to make**, at the first character, where a reader looks first.

🔴 **and it erases it silently.** a reader who sees `⛈️` feels no gap; they read *"error"* and move
on. so the absent route is never missed, which is what makes this a blocker rather than a style
note.

## .the test

> **"who must act on this — the caller, or us?"**

- the **caller** — a bad flag, an absent file, a read-only target, an unmet precondition → `✋`
- **us** — a broken adapter, an unclassified throw, an invariant violated → `💥`
- 🔴 **you cannot say** → that is not a licence for `⛈️`. it is the signal that the error itself is
  underspecified, and the repair is to classify it

| when… | then… |
|---|---|
| you reach for `⛈️` on a new line | 🔴 the strongest cue. run the test — the answer is always one of two |
| you edit a line that already carries `⛈️` | fix it forward. the owner is knowable from the code you are in |
| a line aggregates **many** faults of mixed owner | render the **summary** at the harsher owner, and let each leaf carry its own glyph |
| the fault is *"partly ours"* | 🔴 `💥`. an ambiguous owner defaults to us — never to the caller, and never to a mood |
| a fault is genuinely unclassified | `💥`, and say so in the message (`cause unclassified`) — the extant precedent |
| 🔴 the line is a **thrown error's message** | 🔴 **no glyph at all.** see below |

## 🔴 .a THROWN message carries no glyph — the frame already prefixes one

`asCliErrorFrame` prefixes the class glyph itself, so a glyph inside the message renders **twice**:

```
👎  💥 MalfunctionError: ⛈️ duplicate role.slug "echoer"
👍  💥 MalfunctionError: duplicate role.slug "echoer"
```

⇒ 🔴 **and the inner copy is the one that can disagree with the class.** it is authored at the
throw site, where the author picks a glyph by feel; the outer one is computed from the class the
error actually carries. so the pair drifts in exactly one direction — a hand-picked `✋` wrapped in
a `💥 MalfunctionError:`, which is the contradiction this rule exists to make impossible.

🟡 **so the repair for a `⛈️` in a throw is a DELETION, never a substitution** — and that is the one
case the test above cannot answer, because both of its answers are wrong.

| the line is | the glyph |
|---|---|
| a `console.log` / `console.error` you render yourself | 🔴 `✋` or `💥` — run the test |
| the `message` of an error you **throw** | 🔴 **none.** the frame supplies it from the class |

## 🟡 .the bound

this governs the **glyph that marks a fault**. it does not govern weather, nor a `⛈️` inside quoted
third-party output — and it does not forbid `⚠️`, which is the **callout** slot, for an advisory
that is no fault at all.

blocker: `⛈️` rendered as an error marker · an error marker that names no owner · an error glyph
whose class disagrees with its exit code (`✋` on an exit 1, `💥` on an exit 2) · 🔴 **any** glyph
inside a thrown error's `message`, the frame's own prefix included.
false positive: `⚠️` on a non-fault advisory · a `⛈️` inside third-party output rendered verbatim ·
a test that asserts `⛈️` is ABSENT — a clamp on this rule, not a violation of it.

⇒ see also: `rule.prefer.emoji-language` (the palette, and the `error-class` slot this pins) ·
`rule.require.failloud` · `rule.require.unabridged-error-prefix` (the same split, in words) ·
`rule.require.exit-code-semantics` (mechanic — the 1/2 split the glyph must agree with).
