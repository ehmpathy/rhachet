# define.invariant.a-symlink-under-agent-is-foreign

## .what

an artifact under `.agent/repo=$slug/role=$name/` is owned by **another repo** exactly when it is a
symlink. one syscall answers *"is this ours?"* — no path arithmetic, no repo-root derivation, no
realpath escape check.

```ts
const isArtifactForeign = (await lstat(path)).isSymbolicLink();
```

## .kind

🔴 **nature.** no decision could have gone otherwise, and that is the whole strength of the test.

`rhachet roles link` is the **only** writer under `.agent/repo=*/role=*/`, and what it writes is a
symlink into the version-pinned pnpm store. so the symlink is not a *proxy* for foreign ownership,
nor a *convention* that signals it — **it IS the mechanism by which a foreign role enters a repo.**
a foreign artifact that is not a symlink cannot exist there, because no other writer puts one there.

## .the invariant

for any artifact `a` under `.agent/repo=*/role=*/`:

```
foreign(a)  ⟺  lstat(a).isSymbolicLink()
```

and the corollary that gives it teeth:

```
foreign(a)  ⟹  ¬writable(a)
```

an edit inside a `.pnpm` store path is wiped by the next `pnpm install`, **and** it is a published
artifact of a repo this one does not control. so a mechanism that names a foreign artifact as the
site of a fix has named a fix the caller cannot apply.

## .why the domain depends on it

**measured in this repo, 2026-09-18 — of 15 `boot.yml` specs, 13 are symlinks and 2 are regular
files.** the 2 are this repo's own (`repo=.this`); every linked role is a symlink.

```
.agent/repo=.this/role=any/boot.yml           ASCII text
.agent/repo=.this/role=keyrack/boot.yml       ASCII text
.agent/repo=bhrain/role=driver/boot.yml       symbolic link to ../../../node_modules/.pnpm/…
.agent/repo=ehmpathy/role=mechanic/boot.yml   symbolic link to ../../../node_modules/.pnpm/…
```

⇒ **the majority case is the un-writable one.** any mechanism that assumes a `.agent/` artifact can
be edited is wrong 87% of the time here.

the concrete hazard that surfaced it: a `budget.tokens` gate whose halt named three remedies —
*move a `say` to `ref`* · *point `say` at a `.min`* · *raise the budget*. **every one is a write to
the `boot.yml`.** on a foreign spec, each remedy names a file the reader cannot write, so a halt
there has no remedy the reader may apply (`rule.always.raise-a-blocker-a-taken-cannot-close`'s
**OWED ≠ PERMITTED**, at product scale). this is why a foreign spec over budget warns, never halts.

⇒ so the refusal mode is **computed from this invariant**: a symlinked spec warns
(say it, proceed), a regular file halts (refuse, name the fix). `halt` where the caller can act,
`warn` where they cannot.

## .scope — what it does NOT cover

🟡 **bounded to `.agent/repo=*/role=*/`.** the biconditional holds there because `roles link` is the
only writer. it does **not** hold for symlinks in general:

| the symlink | foreign? |
|---|---|
| under `.agent/repo=*/role=*/`, written by `roles link` | ✅ **yes** — the invariant applies |
| this repo's own `rhx symlink` convention (e.g. a route's `dreams/` into `.dream/`) | 🔴 **no** — a repo linked within itself |
| anywhere else | undetermined — check the **target's path**, not merely the link's existence |

⇒ a mechanism that generalizes the test past `.agent/` must add a target-path check. inside
`.agent/repo=*/role=*/` the bare `isSymbolicLink()` is exact, and a path check there buys naught.

## .the litigation

the rival test is a **realpath escape check**: derive the artifact's real path, derive the repo
root, refuse if the former sits outside the latter.

🔴 **the symlink test wins because it answers the question actually asked** — *"did `roles link`
put this here?"* the escape check answers a question about *geography* and infers ownership from
it, so a repo nested inside another reads as ours. the symlink test reads the **ownership marker
directly**, in one syscall, because the marker is what the link is.

## .the counter-argument, stated fairly

> a bare `isSymbolicLink()` cannot tell a foreign link from a link a repo made within itself. this
> repo's own `rhx symlink` convention creates exactly such links, so the test is fragile.

it is a real limit, and it is why `.scope` above is narrow rather than universal. within
`.agent/repo=*/role=*/` the case does not arise — `roles link` is the only writer there — so the
counter bounds the invariant's *reach* without weakening it where it is declared.

## .what would overturn it

per the nature/nurture test, the domain would have to be misread, or to change:

- **`roles link` stops to use symlinks** — if it copies files instead, the marker is gone and every
  linked artifact reads as ours. this is the one that would truly break it
- **a second writer appears** under `.agent/repo=*/role=*/` and writes a symlink of its own
- **a linked role ships an artifact that is a regular file** — which would need `roles link` to
  materialize rather than link

## .enforcement

- a mechanism that names a `.agent/` artifact as the site of a fix, with no foreign check = **blocker**
  (a halt with no remedy)
- a realpath escape check written where `isSymbolicLink()` answers the question = **blocker**
- a bare `isSymbolicLink()` applied **outside** `.agent/repo=*/role=*/` with no target-path check = **blocker**
- a refusal mode fixed as a constant where this invariant could compute it = **nitpick**

## .see also

- `rule.require.read-the-record-not-the-correlate` — the escape check reads a correlate; the symlink is the record
- `rule.always.raise-a-blocker-a-taken-cannot-close` (bhrain/driver) — **OWED ≠ PERMITTED**, the rule this invariant protects a product surface from violation
- `define.agent-dir` — what `roles link` places under `.agent/`, and why
- `.behavior/v2026_09_17.feat-boot-manifest-and-budget/` — the worked example: the behavior whose
  budget gate computes its refusal mode from this invariant
