# F42 — a glyph for the landed corpus census

- **status** = TAKEN, 80% — hold the flat form this round; the glyph choice is the wisher's
- **rework** = dirty
- **where** = `src/domain.operations/boot/asBrainDirBootReportLines.ts:29` · its 4 pinned sites
- **caught** = 2026-09-25, review 7 of stone `5.3.verification` (`has-ergonomics-validated`)

## .the fork, stated fairly

the two renderers of one fact disagree on whether a glyph leads the line.

**the success census** (`asBrainDirBootReportLines.ts`) — no glyph, no treestruct:

```
boot.md (default): /…/actor.via.slug=.default/brain/.claude/boot.md — 21 roles, 809187 chars
```

**the failure twin** (`asBrainDirBootFailureLines.ts`) — both:

```
✗ boot.md (default) not written: 💥 MalfunctionError: brain dir boot.md could not be written
   ├─ brainDir: /repo/x
   └─ cause: Error: EACCES: permission denied
```

so the fork is: **does a landed corpus render earn a glyph, and which one?**

| option | the case for it | the case against |
|---|---|---|
| **A — hold the flat form** (taken) | the census has **no parent node** to hang a treestruct off: the renderer is shared by `init`, `roles link` and `enroll`, each with its own header, and the census is prepended *before* whichever header follows. a glyph implies membership in a phase the census is not part of — it reports a render that already completed | a human who scans for *"did it land?"* finds a glyph only on failure. and `rhx init --hooks` opens with an unglyphed line, then `🔭` — the two-header shape of `howto.write.skills-stdout` is broken at line 1 |
| **B — prefix a glyph** | restores parity with the `✗` twin, and makes the landed render scannable at a glance (`rule.require.treestruct-output`) | it needs a glyph **nobody has chosen**, and a wrong choice spreads across three commands' output and every snapshot of each. `✨` already means *the phase finished* in the same render; `📚`, `🧠` and `🪶` are each plausible and each a term call |

## .taken, and why — at the time

**A: hold the flat form.** three reasons, in order of weight:

1. **the harm test finds no shipped harm** (`rule.forbid.overzealous-blockers`). the line is
   **first**, legible, and names its file, scope, role count and char count. a human reads it. no
   user is misled and no on-call engineer is paged.
2. **the fix needs a choice that is not the driver's.** which glyph marks a landed corpus is a term
   decision that will appear on every `init`, `roles link` and `enroll` render from here on — exactly
   the kind of small call that tips a large outcome, and exactly what a fulcrum reserves for the
   wisher.
3. **the rework is dirty.** it changes a **pinned output contract** across 3 callers and 4+ assertion
   sites, on a verification stone whose whole claim is that the pinned set is green.

## .rework, and why it is dirty

| site | what pins the string |
|---|---|
| `asBrainDirBootReportLines.test.ts:25` | `toEqual` on the full census string |
| `asBrainDirBootReportLines.test.ts:47` | `toContain('boot.md (default)')` |
| `invokeInit.integration.test.ts:621` | `startsWith('boot.md (default): ')` |
| `invokeRolesLink.integration.test.ts:357` | `startsWith('boot.md (default): ')` |
| the journey snapshots | this span is masked by `maskBootCensusVolatiles`, so a shape change re-snaps them |

⇒ not a reversal of a design, but a re-pin of five places at once. clean **after** the glyph is
settled; dirty while it is not.

## .confidence, and why it is 80%

what could make A wrong: a human who scans a long `init` render for the boot line and misses it,
because every other line they scan for carries a glyph. that is a real scannability cost, and it is
why this is a fulcrum rather than a closed question. what holds A at 80%: the line is **line 1**, so
it is the one line a human cannot scroll past.

## .the verdict, once ruled

_(open)_

## .see also

- `dreams/v2026_09_25.chore.the-boot-census-line-wears-no-glyph-while-its-failure-twin-does.md` — the work, with the shape of the fix
- `review/self/for.5.3.verification._.r7.has-ergonomics-validated.md` — where it was scored, criterion *output is scannable*
- `rule.require.treestruct-output` · `rule.forbid.ambiguous-labels` (ehmpathy/ergonomist)
