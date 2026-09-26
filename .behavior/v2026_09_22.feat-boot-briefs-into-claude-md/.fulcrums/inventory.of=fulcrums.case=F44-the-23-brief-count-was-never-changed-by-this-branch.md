# F44 — the `23 brief(s)` count was never changed by this branch

| field | value |
|---|---|
| **status** | **DISPUTED** — peer i002 r4.nitpick.2 refuted with a measurement |
| **rework** | clean — a dispute is an argument; it edits no code and reverses with one line |
| **confidence** | 99% — three independent measurements agree, and each is re-runnable |
| **lands** | `blackbox/cli/__snapshots__/init.incremental.acceptance.test.ts.snap` (unchanged at the cited lines) |

## .the fork stated fairly

peer lane `ergo-acceptance-journey-coverage` (i002 `fb8055a7b005302bf8` r004) raised nitpick.2:

> *snapshot expected brief count changed 20 → 23 with no inline justification* —
> `init.incremental.acceptance.test.ts.snap:375` and `:424`, against
> `rule.forbid.test-intent-violations`. *"An updated expected value without a comment is
> exactly the change forbid.test-intent-violations calls suspect: a reader cannot tell whether
> the linked reviewer role package genuinely gained 3 briefs … or the render regressed and the
> snapshot was re-baselined to match."*

the rule the lane cites is real and the concern it names is a genuine hazard. the fork is
whether **this branch** performed the edit the concern describes.

## .taken, and why

**it did not.** the count is an unchanged context line, so there is no re-baseline to justify
and no comment to owe. a concession here would attach an explanatory comment to a line this
branch never wrote — which is itself the defect `rule.require.timeless-comments` names: a note
that reacts to a conversation rather than a fact.

⇒ absorbed as **disputed**, not conceded.

## .the measurement — three independent lines, each re-runnable

**1. the diff shows it as CONTEXT, never as a change.**

```sh
git diff origin/main -- blackbox/cli/__snapshots__/init.incremental.acceptance.test.ts.snap
```

the two hunks the lane cites are `@@ -363,6 +375,7 @@` and `@@ -410,6 +424,7 @@`. in each, the
`23 brief(s)` line is **space-prefixed** — a context line. the whole diff carries **zero `-`
lines**; every `+` line is one of two shapes:

```
+boot.md (default): $REPO/.agent/.actors/actor.via.slug=.default/brain/.claude/boot.md — N roles, __CHARS__ chars
+moved: .claude/settings.json → .agent/.actors/actor.via.slug=.default/brain/.claude/settings.json
```

the line numbers moved (`363 → 375`, `410 → 424`) purely because 17 census lines were inserted
above them. **a shifted line number is not an edited value**, and that shift is what the lane
read as a change.

**2. `main` itself already holds `23`.**

```sh
git show origin/main:blackbox/cli/__snapshots__/init.incremental.acceptance.test.ts.snap
```

`23 brief(s)` sits at main's lines **363** and **410** — the pre-shift positions of the very
lines cited. no `20` appears anywhere in either revision of the file.

**3. no part of the change could move the count.**

`rhachet-roles-bhrain` is pinned at **`0.37.0`** in both `main` and this branch, and no file in
this change touches brief discovery, brief counting, or the link stats render. the count has one
input — the linked package's brief corpus — and that input is byte-identical across the two
revisions.

## .the reviewer was not careless

the false positive has a legible cause worth recording: **17 insertions above the cited lines
shifted every subsequent line number**, so a lane that reads a hunk header and a line number,
rather than the `+`/`-` prefix of the line itself, sees "the value at line 375 differs from the
value at line 375 in the base" — which is true, and is not a change to that value.

⇒ the general lesson: **grade a snapshot line by its diff marker, never by its line number.**
that lesson is the only durable output of this fulcrum.

## .the verdict, once ruled

open for the wisher. the driver's position is that the concern does not apply to this branch and
that no edit is owed. should the wisher prefer the comment anyway — as a note for a future
reader about why the reviewer corpus holds 23 briefs — it is a one-line addition to the case and
clean to make.

## 🔴 .the third recurrence — i008 r002, graded a blocker, on a NEW premise

the same concern returned a third time (`i005.r004`, `i006.r002`, now `i008.r002`), and this time it
is graded a **blocker** rather than a nitpick. its premise is new and explicit:

> *the target diff under review clearly renders the `-`/`+` pair in both hunks, i.e. the expected
> value did change within the diff under review*

that claim is false, and the hunk header alone settles it — no read of the file body is needed:

```
@@ -363,6 +375,7 @@ … given: [case20] …
```

**6 lines in, 7 lines out.** one line ADDED, none replaced. a hunk that swapped `20` for `23` would
carry a `-` line and its two counts would balance. the same holds for the second hunk it names,
`@@ -410,6 +424,7 @@`. re-measure with:

```sh
git diff origin/main -- blackbox/cli/__snapshots__/init.incremental.acceptance.test.ts.snap
```

the `23 brief(s)` line renders **space-prefixed** in both hunks — a context line. the one `+` line
in each is the `boot.md (default): …` census row this branch adds. the whole file diff carries
**zero** `-` lines.

and the base still reads `23`:

```sh
git show origin/main:blackbox/cli/__snapshots__/init.incremental.acceptance.test.ts.snap
```

`23 brief(s)` sits at main's line 363 — the pre-shift position of the very line cited as changed.

⇒ the refutation is unchanged and now rests on a **fourth** independent measurement: the hunk
header's own line-count arithmetic. the rule that rules the lane asks it to re-grade a point that
has survived three rounds (`rule.forbid.overzealous-blockers`); absent that, the dispute stands.

## 🔴 .the fourth recurrence — i009, and the one measurement no read can dispute

the lane returned again, with the same claim and a **different pair of hunk headers**:
`@@ -360,9 +372,10 @@` and `@@ -407,9 +421,10 @@` (the earlier round quoted `@@ -363,6 +375,7 @@`;
both are the same file at different `-U` context widths, which is why the headers differ).

⚠️ **its own quoted header refutes it a second time**: `-360,9 +372,10` is **nine lines in, ten
out** — one line added, none replaced. the arithmetic holds at every context width, because a
replacement never changes the in/out delta and an addition always does.

and there is a measurement that needs no hunk read at all:

```sh
git diff --numstat origin/main -- blackbox/cli/__snapshots__/init.incremental.acceptance.test.ts.snap
```

```
17	0	blackbox/cli/__snapshots__/init.incremental.acceptance.test.ts.snap
```

**seventeen lines added, ZERO deleted.** git itself reports the deletion count for the whole file.
a `-20 brief(s)` line cannot exist in a diff whose deletion count is zero — the claim is refuted by
git's own arithmetic, with no read of the file body, no hunk header, and no judgment.

⇒ five independent measurements now agree. the dispute stands.

## .see also

- `rule.always.absorb-every-concern` — a dispute owes a fulcrum, and this is it
- `rule.forbid.overzealous-blockers` (bhrain/reviewer) — the re-grade owed after three rounds
- `rule.forbid.test-intent-violations` (bhuild/behaver) — the rule the lane correctly cites
- `rule.require.refute-a-premise-with-a-measurement` — the standard this refutation is held to
- `rule.require.timeless-comments` (ehmpathy/mechanic) — why a reactive comment is the wrong repair
