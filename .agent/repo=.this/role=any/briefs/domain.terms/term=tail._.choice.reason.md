# domain.term.choice.reason: tail

## .etymology

`tail` is **adopted, never coined** — it is `tail(1)`, the posix command that does exactly this
act, and every engineer already reads it as *"the last N lines."*

rejected alternatives, and each rejection is the same argument:

| candidate | why rejected |
|---|---|
| `truncate` | names the act from the **cut** end. a truncation keeps the HEAD and drops the tail — the precise inverse of what this does, and the inverse of where a diagnosis lives |
| `snippet` / `excerpt` | says a fragment was taken; says naught about WHICH. a reader cannot tell whether the cause survived |
| `summary` | claims the content was **condensed**. it is not — the kept lines are verbatim |
| 🔴 `redact` | the word for what this exists to PREVENT. a redact removes what a reader must not see; a tail bounds what a reader has already seen. to share a word would erase the distinction the whole repair rests on |

⇒ **the word must say WHICH END survives**, because that is the entire correctness claim. only
`tail` does.

## .evidence — the term was born from an over-correction i shipped

the round's defect was a **render-side redact**: `asCliErrorFrame` dropped every metadata field
but `hint`, to stop one install log from swamping its own fix. that bought one surface's brevity
with every other surface's fix — an error whose fix lived in `path` / `from` / `envVar` lost it
outright.

the first repair over-corrected in the opposite direction: i **deleted** the `output` field
(replaced with a byte count). four tests went red at once, over `facts.output` and `EACCES`.

⇒ 🔴 **they were right, and the pair of failures is what defines the term.** the log is neither
noise (to delete) nor sacred (to attach whole). it is **bulk with a load at one end**:

| the shape | what it costs |
|---|---|
| attach the whole log | the fix is lost under bytes the human already saw |
| redact it at the render | every OTHER error's fix is deleted too |
| **delete the field** | a report can no longer quote the cause |
| **tail it at the source** | ✅ no duplicate bulk, and the cause survives |

## .the boundary

`term.boundary = install.output`. the test — *"a tail, of WHAT?"* — answers **"of the install's
output"** in one phrase.

⚠️ a future tail of some other stream (a transcript, a socket log) is a distinct cluster under
its own boundary. the word generalizes; **the bound does not** — 20 lines is right for a package
manager's error block and is no claim about any other stream.

## .the rule it serves

**bound bulk at its SOURCE, on the one field that carries it — never at the render, across every
field.** the render cannot tell a bulk field from a load-bearer; the thrower always can.

⇒ that is the durable half, and it is why this term exists rather than a second redact.

## .disputes

none raised.
