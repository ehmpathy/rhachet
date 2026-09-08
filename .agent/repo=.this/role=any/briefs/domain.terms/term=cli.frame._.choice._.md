# domain.term: frame

term.chosen   = frame
term.kind     = noun
term.boundary = cli
term.synonyms.forbidden:
- output
- render
- display
- banner
- block

## .what

**the LINES a human reads off one cli event.** a frame is the rendered shape — the glyph row, the
sentence, the hint row, the blank lines that bound it — as it lands on a terminal.

```
                                        ← the frame is these four lines
✋ keyrack.yml not found
   └─ run `rhx keyrack init` to create keyrack.yml

```

## 🚨 .the boundary — a frame is the RENDER; a report is the PAYLOAD

this is the distinction the term exists to hold, and the repo paid for it:

| word | what it names | who reads it |
|---|---|---|
| **report** (`blocked`, `notice`) | the error OBJECT and its fields — message, hint, metadata | a caller, a test, a machine |
| **frame** | the LINES those fields are composed into | a human, on a terminal |

⇒ **a payload snapshot proves a report; only a run through the real binary proves a frame.** the two
are one careless step from a read as the same fact, and this repo took that step: a unit clamp
asserted a hint's exact words against the error object while the render never printed the datum the
hint told a reader to compare. every test was green and the sentence on screen was a dead end.

so `frame` is not a nicety of vocabulary — it is the word that makes *"which of the two did you
actually verify?"* a question one can ask.

## ⚠️ .the near-neighbors, and why each stays distinct

| word | its own concept |
|---|---|
| **frame** | the lines, as rendered |
| **notice** | a nullable render a SUCCESSFUL command leaves behind (`term=notice`) |
| **blocked** | a refusal report that carries a hint, from a `ConstraintError` (`term=blocked`) |
| **glyph** | ONE character within a frame, which carries a sense (`term=glyph`) |

⇒ a `notice` and a `blocked` report each get **a** frame. the frame is the shape; those two are
occasions for one.

## .why the forbidden synonyms are forbidden

- **`output`** — overloaded past use. it already names a *stream* (stdout/stderr), a *metadata key*
  on install errors (`metadata.output`, the captured package-manager log), and a *cli flag*
  (`--output json`). a fourth sense would be the overload `rule.forbid.domain-term-ambiguity` names
- **`render`** — the VERB is legitimate and used freely (*"the frame renders"*); as a noun it names
  the act rather than the artifact
- **`display` / `banner` / `block`** — each reads as a decoration or a layout unit rather than the
  composed lines of one event

## .refs
- `src/contract/cli/asCliErrorFrame.ts`        # the one owner of an error's frame
- `src/contract/cli/asCliErrorFrame.test.ts`   # the clamp, asserted row by row
- `src/contract/cli/withCliOutputErrors.ts`    # a caller — the talk verbs
- `src/contract/cli/invoke.ts`                 # a caller — the top-level catch

## .reason
see the ref-level cluster beside this choice:
- `term=cli.frame._.choice.reason.md` — etymology, the payload-vs-screen incident, the rejected words
