# rule.require.unabridged-error-prefix

# tldr

## severity: blocker

every error surfaced to a human on **stderr** must carry its full, unabridged prefix:

```
<glyph> <ClassName>: <message>
```

- `✋ ConstraintError: …` — the caller must fix it (exit 2)
- `💥 MalfunctionError: …` — the server must fix it (exit 1)

**never redact it. never abridge it. always propagate it.** the glyph alone is not the prefix.

---
---
---

# deets

## .what

the prefix has **two** parts and both do work:

| part | what it carries |
|---|---|
| the glyph | a glanceable severity a human reads without a parse |
| **the class name** | the machine-readable, greppable, unambiguous fault class |

a render that emits the glyph and drops the class name has shipped **half a contract**.

## .why

- **the glyph is not greppable.** a human cannot `grep ConstraintError` a log that only holds `✋`.
  neither can a ci parser, a log query, or a support engineer who reads a paste
- **the glyph is not unambiguous.** two classes can share a family of glyphs; the name cannot be
  confused with another
- **it is the caller-vs-server signal** — the one datum that tells a human whether to fix their own
  input or file a defect. to redact it is to redact the single most actionable field
- **it already exists in the code.** the render reads the class to pick the glyph (`ctor.emoji`),
  so it holds the name at the exact moment it drops it. this is a **redaction**, never an absence

## .the failure this exists to stop

a renderer that formats as `<glyph> <message>` looks correct in review — the output is pretty, the
glyph is right, the sentence is clear. the omission is invisible **because what is absent leaves no
mark**.

then a snapshot locks it:

```
"
✋ no brains available. add getBrainRepls() to your rhachet.use.ts
"
```

⇒ 🔴 **the snapshot is now a faithful record of a defect, and every resnap re-blesses it.** a
reviewer who diffs snapshots sees no change and approves. the redaction becomes the contract.

measured in `ehmpathy/rhachet` at `blackbox/cli/__snapshots__/act.acceptance.test.ts.snap` — a grep
for `Error` across the whole snapshot returns **zero matches**.

## ⚠️ .the glyph and the class are a PAIR — read them from ONE source

the two halves must agree, and they agree only if one read produces both:

| glyph | class | who fixes it | exit |
|---|---|---|---|
| `✋` | `ConstraintError` | the caller | 2 |
| `💥` | `MalfunctionError` | the server | 1 |

a mismatched pair (`✋ MalfunctionError`) asserts both at once, and a reader who trusts the glyph
hunts their own input for a server-side fault.

`helpful-errors` declares the pair as two statics on the class itself — `ConstraintError.emoji`,
`MalfunctionError.emoji` — and builds the `${emoji} ${name}: ` prefix it bakes into `.message` from
those same two. so a render that reads the constructor holds them in lockstep by construction:

```ts
// 👎 two independent reads ⇒ they WILL drift. this shipped `✋ MalfunctionError`
const errorClass = message.match(/^[^A-Za-z]*([A-Z][A-Za-z]*Error):\s*/)?.[1] ?? error.name;
return `   └─ ✋ ${errorClass}: ${bare}`;

// 👍 one read, off the constructor ⇒ they cannot disagree
const ctor = error.constructor as { name: string; emoji?: string };
return `   └─ ${ctor.emoji ?? '✋'} ${ctor.name}: ${bare}`;
```

⚠️ **`.name` is NOT a usable source.** `HelpfulError` never assigns `this.name`, so it reads
`'Error'` for every subclass. the constructor is the only faithful read — a `?? error.name`
fallback looks correct and is silently wrong for every error whose message was hand-composed.

## ⚠️ .the class is CONTENT, never chrome — and never substituted

a render may restyle all that surrounds the prefix — a tree, a panel, a colored block — and must
still carry the class verbatim.

two failure shapes, both blockers:

| shape | example |
|---|---|
| **strip** — the class deleted as if it were machine chrome | `✋ blocked: invalid --into` |
| **substitute** — the class swapped for a friendlier word | `✋ blocked:` where the class is `Error` |

the substitute shape is the subtler one. a base `Error` reads as uninformative, which tempts a
renderer to replace it with a term. but `Error` at a human-faced render is a **defect marker** —
`rule.forbid.helpful-error-parents` grades it a blocker at the THROW SITE — and that marker is
findable only if the word survives. substitute it and the defect becomes ungreppable.

⇒ the prefix is unabridged, or it is a redaction. there is no third option.

## ⚠️ .the distinction from `rule.forbid.helpful-error-parents`

that rule shows a **flush-left dump** as a defect:

```
BadRequestError: invalid mechanism choice
{ … }
[args] keyrack,fill,--env,test
```

it is easy to read that as *"class names in renders are bad"*. **it is not what it says.** the
defects there are that the class is a **parent** (`BadRequestError` — names no owner, no exit
code), and that the dump lands *outside* the treestruct it interrupted.

⇒ the two rules agree and cover different halves:

| rule | demands |
|---|---|
| `rule.forbid.helpful-error-parents` | the class must be a **leaf** — `ConstraintError` / `MalfunctionError`, never a parent |
| **this rule** | that leaf must **survive into the render** |

a leaf class inside a well-formed tree satisfies both. that is the target shape:

```
🔐 keyrack firewall
   └─ ✋ ConstraintError: invalid --into: must be one of github.actions, json
      ├─ into: invalid-format
      └─ ran: keyrack firewall --env test --into invalid-format
```

glyph, then class, then message — then the facts, then the fix, then the invocation echo. the
prefix is **indented inside the node** rather than flush-left, and that is conformant: what the
tree replaces is the raw exception DUMP, never the prefix itself.

## .how

- render `<glyph> <ClassName>: <message>`, and read **both** the name and the glyph off the error's
  own constructor — never a second hardcoded table that can drift from the glyph table
- propagate through **every** layer that reformats. a wrapper that rethrows must not flatten the
  prefix; a json channel must carry `class` as its own field
- **snapshot the full prefix.** a snapshot that shows a bare glyph is evidence of the defect, never
  a contract that holds

## .the test

> read the render alone. can you tell **who must fix it** without the exit code?

- yes → the prefix is intact
- no → it was abridged

## .enforcement

- stderr that renders a glyph without its class name = **blocker**
- a glyph paired to the wrong class (`✋ MalfunctionError`, `💥 ConstraintError`) = **blocker**
- a renderer that strips a `SomeError:` prefix from a message = **blocker** — cut the glyph (it is
  re-emitted), keep the class
- a class substituted for a friendlier word (`blocked`, `error`, `failed`) = **blocker**
- a wrapper, frame, or formatter that drops the class name en route = **blocker**
- a snapshot blessed with a bare-glyph prefix = **blocker** (it converts the defect into the contract)
- a json error payload with no `class` field = **blocker**

## .see also

- `rule.require.unredacted-error-metadata` — the twin. this rule governs the PREFIX; that one
  governs the PAYLOAD ⚠️ named in the source note, not yet written
- `rule.forbid.helpful-error-parents` — the class must be a leaf; this rule keeps that leaf visible
- `rule.require.failloud` (mechanic) — the caller/server table the class encodes
- `rule.require.exit-code-semantics` (mechanic) — `ConstraintError` = 2, `MalfunctionError` = 1
- `rule.require.errors-name-the-fix` (ergonomist) — the message half
- `rule.require.refusals-carry-context` — the parent trap: a prettier render that says less
- `rule.forbid.snapshot-visual-blemishes` (behaver) — the peer that guards how a snapshot reads
- `term=glyph._.choice._.md` — the pair law, itemized
- `term=chrome._.choice._.md` — what a render may cut; a class name is **not** chrome

## .citations

> hard rule. stderr messages must say :emoji: {Constraint,Malfunction}Error

> always propogate the full :emoji: ConstraintError / :emoji: MalfunctionError prefix

> never redact it

source: human directive, 2026-09-04, `ehmpathy/rhachet` behavior `v2026_08_25.fix-node-pty-install`

## .provenance

authored on branch `beav/fix-node-pty-install` at
`.agent/.notes/rule.require.unabridged-error-prefix.md`.

branch `beav/fix-keyrack-all-skips-manifest` independently wrote `rule.require.errors-name-their-class`
from the same directive on 2026-09-05 — one law, two names. this file is the merge: the
`.notes` spine is canonical, and the keyrack branch's two unique sections (the
`helpful-error-parents` tension-resolution, and the treestruct target shape) are folded in above.
the duplicate is deleted and every ref re-pointed here.

⚠️ prose was reworded in three spots to satisfy this repo's `rule.forbid.gerunds`; the
`.citations` block preserves the human's words verbatim.
