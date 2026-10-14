# rule.forbid.colons-in-stdout

> **stdout carries no `:` as a separator. a label never runs on into its detail; the detail
> sits on a subbranch of its own.**

```
👎  ✨ hooks: no changes needed

👍  ✨ hooks
       └─ no changes needed
```

## .why

- **the tree is the separator.** stdout here is a treestruct; a `:` is a second, flatter way to say
  "this belongs to that". two separators for one relation is one too many
- **a colon line does not scan.** the eye finds the header glyph, then must read across to find where
  the label ends and the detail starts. a subbranch puts the detail where the eye already goes
- **a colon line does not grow.** a second detail on `hooks: …` has nowhere to go but the same line.
  a branch takes a second leaf for free

## .the repairs

| the colon form | the repair |
|---|---|
| a header that runs on into its detail — `✨ hooks: no changes needed` | the header alone, the detail as a subbranch — `✨ hooks` / `└─ no changes needed` |
| a key and its value on a leaf — `├─ grants: 3` | `├─ grants = 3`, or the value as a subbranch of the key |
| a count with a label — `├─ files: 4` | the count reads as prose — `├─ 4 files` |

## .the boundary

| a violation | not a violation |
|---|---|
| a `:` that joins a label to its detail in stdout | a `:` inside a value — a path, a url, a time, a port, a `uri://` |
| a `:` that joins a key to its value in stdout | a `:` in a code block or a quoted command the human may copy |
| | an error header on **stderr** — `✋ ConstraintError:` is mandated by `rule.require.qualified-error-headers` |

**the line that parts them: is the colon a separator the output chose, or a character of the data
it prints?** a separator → forbidden. data → untouched.

## .extant output — fix forward, no sweep

extant colon lines stay until a change touches them; repair on the way through
(`rule.prefer.scouts-honor`). a bulk rewrite is forbidden: it cannot part a separator from a colon in
the data, and every touched line moves a snapshot.

## .enforcement

- a new or edited stdout line that uses `:` as a separator = **blocker**
- an extant colon line inside a change that did not otherwise touch it = not a violation

## .see also

- `rule.require.treestruct-output` (ergonomist) — the shape stdout takes
- `rule.require.qualified-error-headers` (mechanic) — the stderr header this rule leaves alone
