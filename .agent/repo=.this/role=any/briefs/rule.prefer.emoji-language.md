# rule.prefer.emoji-language

> **scope — `repo=.this` (this rhachet repo only).** THIS repo's emoji vocabulary, not a cross-repo
> or org-wide law. conform to it when you emit output from this repo.

## .what

this repo speaks an emoji **language**: a small, shared set of glyphs, each with one stable sense
across all cli output. a glyph tells the human **which tool speaks** and **what kind of line** they
read — a status, an error class, an actionable callout — before they parse a single word.

this brief is the **inventory**: hold a new glyph against the vocabulary and **conform** (reuse the
chosen glyph for its slot), or **register** a new domain-root here on purpose with a stated why.

it governs every glyph THIS repo's own cli emits, for every role. a glyph inherited from a linked
supplier package (`repo=ehmpathy/...`) is that package's vocabulary, named here only where it would
otherwise be mistaken for this repo's.

## .why

- a shared glyph reads faster than a word — the human recognizes the credential tool (`🔐`), the
  reach socket (`🔌`), or an actionable tip (`💡`) at a glance.
- one glyph, one sense: the **same** glyph on two grains, or a bespoke glyph for a slot that already
  has one, makes the reader stop and decode.
- a written inventory turns "which emoji?" from taste into a lookup: match the slot, reuse the glyph.

## .the slots

every glyph fills exactly one slot:

| slot | role | glyphs |
|------|------|--------|
| **role-mascot** | a ROLE's own voice — never rhachet's | (supplier-role only — see below) |
| **domain-root** | roots a DOMAIN's output | `🔐` keyrack · `🎭` actor · `😶` clone · `🧹` clone prune |
| **verb-artifact** | names the OPERATION, inline after the `😶` clone face | `🎙️` clone say (speak in) · `🎧` clone get (listen out) |
| **error-class** | names the fault owner — one of exactly two | `✋` caller-must-fix · `💥` server-must-fix |
| **status-leaf** | one fact about a step | `✨` success · `✓`/`✗` ok/fail · `🫧` absent · `♻️` reuse |
| **callout** | an actionable advisory | `💡` tip · `⚠️` caution |
| **connection** | a literal socket / port / connection | `🔌` reach a clone |
| **lookup** | a discover/read operation | `🔭` |
| **tree-branch** | structure | `├─` `└─` `│` |

## .rhachet has no voice — mascots belong to roles

rhachet is the framework, not a character. its generic cli (`enroll`, `clone`, `actor`, `init`,
`keyrack`, `run`, …) speaks in the **neutral** slots only and carries **no mascot of its own**.

a role-mascot (`🐢` mechanic, `🦉`/`🌙` driver, the dreamer's moon) belongs to that **role**, emitted
by that role's own skills. these come from supplier packages, so they are not this repo's framework
vocabulary. likewise `🐚` (the mechanic seaturtle's shell) is a supplier glyph — **never** a rhachet
root; a rhachet tree roots on its domain glyph.

- ⛔ a rhachet-generic line that wears a role-mascot = **blocker** (pick a neutral slot).
- ✅ a role's own skill output wears its role's mascot.

## .the vocabulary — chosen

| glyph | slot | sense |
|-------|------|-------|
| `✋` | error-class | caller-must-fix (ConstraintError, exit 2) — a blocked halt |
| `💥` | error-class | server-must-fix (MalfunctionError, exit 1) |
| `✨` | status-leaf | success / freshly-minted / complete |
| `🫧` | status-leaf | absent / empty |
| `♻️` | status-leaf | an idempotent reuse (`♻️ reused`) |
| `🔭` | lookup | discover / read |
| `🔐` | domain-root | keyrack (credentials) |
| `🎭` | domain-root | **actor** (`🎭 actors`) — the performer / identity |
| `😶` | domain-root | **clone** (`😶 clones`) — an exact replica of the actor's DNA; a mouthless face the roles give a voice (etymology: `choice.clone-glyph`) |
| `🎙️` | verb-artifact | **clone say** — you speak INTO the clone (the dispatch/input side); inline after `😶`, no space (`😶🎙️ said to @:bert`) |
| `🎧` | verb-artifact | **clone get** — you LISTEN to the clone (the observe/output side); the in/out counterpart to `🎙️` |
| `🧹` | domain-root | `🧹 clone prune` (the reap / sweep surface) |
| `🔌` | connection | a literal socket / port (`🔌 reach this clone`) |
| `💡` | callout | an actionable tip (`💡 tip` header — see below) |
| `⚠️` | callout | a caution |

## .forbidden

| glyph | why | use instead |
|-------|-----|-------------|
| `⛈️` | obscures the fault owner and the exit code — a fault is caller-owned or server-owned, never a mood | `✋` (caller) or `💥` (server) |
| bare `⚠` / `♻` (no U+FE0F selector) | render monochrome on some terminals — a cross-terminal drift | the colorful `⚠️` / `♻️` |
| `🐚` as a rhachet root | a supplier-role (seaturtle) glyph, not this repo's | the domain glyph (`🎭`, `😶`, `🧹`, …) |
| a role-mascot on a rhachet-generic line | the framework has no voice | a neutral slot |

## .the tip form — an emoji-headed node

an **actionable advisory** (a line that names the one command to run next) renders as its **own
emoji-headed treestruct node**, never a flat inline `label:` line:

```
   💡 tip
      └─ reap dead clones with `rhx clone prune [--older-than <dur>]`
```

why the header, not a flat `tip:` line: an actionable callout is **loud**; a passive key (a `legend:`
that decodes glyphs already on screen) is **quiet**. the `💡` header raises *what to DO* above *what
the letters mean*, and mirrors the command's own root banner (`😶 clones` → `💡 tip`). a flat `tip:`
line for an actionable advisory is **forbidden**.

## .the clone talk header — `😶` face + `🎙️`/`🎧` verb-artifact

the clone talk surface (`say` / `get`) roots on a compact header: the neutral clone face `😶` then
the OPERATION glyph — no space between the two emojis — then a plain-english phrase + the clone
address. each turn in `get` drops the words entirely: just the direction glyph + the offset, on its
own blank-separated branch:

```
😶🎙️ said to @:bert
```

```
😶🎧 talk of @:bert  ·  tail 20

   ├─ 🎙️ T0+00H00M
   ...
```

`🎙️` (mic, speak IN) and `🎧` (headphones, listen OUT) are a matched personal-audio pair — the mic is
the dispatch/input side, the headphones the observe/output side, so the two verbs read as one in/out
gesture. the `😶` face names WHICH domain (clone), the verb-artifact names WHICH operation (say/get),
the phrase names WHOSE clone. rhachet is voiceless, so `😶` carries no role-mascot slogan of its own.

## .the two-grain split — `🎭` actor, `😶` clone

`🎭` roots the **actor** domain (`🎭 actors`) — the performer, the identity, the recipe. `😶` roots
the **clone** domain (`😶 clones`) — a live, reachable instance spawned from that identity. two
grains, two roots, so the peer lists never read identically. `😶` marks the one invariant the
framework knows about a clone: it is an **exact replica of the actor's DNA** (brain + roles), a
mouthless face whose **voice comes from its roles**. full etymology: `choice.clone-glyph`.

## .enforcement

- a bespoke one-off glyph for a slot that already has a chosen glyph = **nitpick** (reuse it, or
  register a new domain-root here with a stated why).
- a forbidden glyph (see the table) = **blocker** — replace it with the chosen form.
- a glyph this brief documents, read by a reviewer as a treestruct/consistency blemish = **not a
  defect** (this inventory is the authority the glyph conforms to).

## .see also

- `choice.clone-glyph` — the etymology behind `😶` (an exact replica of the actor's DNA; its voice comes from its roles)
- `rule.require.keyrack-emoji-palette` — the domain-palette precedent
- `ergonomist/briefs/cli/rule.require.treestruct-output.md` — the generic tree grammar (`├─`/`└─`)
- `mechanic/briefs/practices/lang.tones/rule.prefer.chill-nature-emojis.md` — the tone (chill, nature, ≤5–7 per callout)
