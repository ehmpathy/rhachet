# seed S7 — the gate fires at THREE points, and the symlink computes the rung

**caught 2026-09-18, at the `1.vision` approval gate.** it corrected a requirement **I had written
minutes earlier**, from the wisher's own prior word.

> 🔴 **NARROWED 2026-09-23 by `S14`: gate 2 is CUT — three gates became two.** the symlink half of
> this seed is untouched and still governs both live gates. **the `onStop` half is reversed by the
> same wisher who added it**, and the reversal is recorded at the foot under `.the narrow`.

---

## .said

> nah needs to be the symlink option, needs to fire onStop too, cause not all boot ymls are from
> `introspect`

and, in the next breath:

> e.g., the behavior onBoot usecase, with the custom `--manifest`; that doesn't use introspect cause
> it's not for a role repo

*(quoted against my whole requirement-9 section, which had read "the gate is `repo introspect`, NOT
the render path".)*

---

## .settled

**three gates, and the rung is computed per spec — never a per-gate constant.**

| # | gate | the population it covers | rung |
|---|---|---|---|
| 1 | `repo introspect` | role-package specs, pre-publish | **halt** (a constant — see below) |
| 2 | 🔴 `hook.onStop` | every spec introspect cannot see — a `repo=.this` role, a route-scoped `--manifest` | **computed** |
| 3 | `roles boot` / `onBoot` | every boot, foreign specs among them | **computed** |

**the marker is one syscall:** `lstat(specPath).isSymbolicLink()`. `roles link` is the only writer
under `.agent/repo=*/role=*/`, so **the symlink IS the marker of foreign ownership** — no path
arithmetic, no realpath escape check.

🟡 **this refines `S4`.** that seed's candidate mechanism was a realpath escape check; the wisher
named the cheaper and more exact one.

## 🔴 .why my requirement 9 was wrong — introspect is ADDITIVE, and blind by construction

I took *"gate at introspect"* to mean *"introspect **instead of** the render path"*. it does not.

`invokeRepoIntrospect.ts:55-59` is a hard `ConstraintError`: introspect **refuses to run** outside a
`rhachet-roles-*` package. so it sees:

| the spec | does introspect see it? |
|---|---|
| `src/domain.roles/*/boot.yml` in a role package | ✅ yes — its whole scope |
| `.agent/repo=.this/role=*/boot.yml` — a repo-local role | 🔴 **no.** not a role package |
| 🔴 a route-scoped custom `--manifest` | 🔴 **no.** not a role package, and never published |

🔴 **the third row is the payload that motivated this entire wish.** the ~46% `SessionStart` hook
was a route-scoped custom payload. ⇒ **my introspect-only requirement would have missed the one case
the wish was written for**, and the wisher's second message named exactly that case.

## 🔴 .why `onStop` rather than `onBoot` for gate 2

both fire in the author's own session, so both satisfy *"the author can write the file."* they
differ in what a halt **costs**:

| | a halt at `onBoot` | 🔴 a halt at `onStop` |
|---|---|---|
| what it blocks | **the session's start** — the author cannot work | naught. the work is done |
| when the author learns | before they hold any context | at the end, **still before they commit** |
| so an over-budget local spec | 🔴 **bricks the author's own repo** until they trim | is a note they act on, or not |

⇒ `onStop` is the one point where the refusal is **both actionable and harmless**. `onBoot` would
make a self-declared budget a self-inflicted outage.

🟡 `hook.onStop` is first-class and already declared — `BrainHookEvent = 'onBoot' | 'onTool' |
'onStop' | 'onTalk'` (`BrainHookEvent.ts:11`), with `RoleHooksOnBrain.onStop` and a sync path at
`syncOneRoleHooksIntoOneBrainRepl.ts:121-126`. **no new hook kind is owed.**

## 🔴 .why gate 1's rung is the only true constant

a foreign spec **cannot arrive** at gate 1: git cannot track a symlink into `node_modules`, and
introspect reads only git-tracked source. ⇒ **the symlink test is owed at gates 2 and 3, and is dead
code at gate 1** — which is what makes cell `H2` (introspect × foreign) genuinely **impossible**
rather than merely unlikely.

⚠️ **and gate 2's rung is computed, not constant** — my first table wrote `halt` there flatly.
`.agent/repo=*/role=*/**` is in `onStop`'s scope, and 13 of 15 are symlinks, so a linked role's
over-budget spec warns at `onStop` exactly as it does at boot. **the author is present; the file is
still not theirs.**

---

## .landed

- 🔴 **wish requirement 9 rewritten** — three gates, and the misread admitted in the text
- 🔴 **requirement 8's mechanism changes** to `lstat().isSymbolicLink()`, one syscall, in place of
  the realpath escape check `S4` had proposed
- 🔴 axis **H** is walked with the rung **computed**: `H2` impossible, `H5`/`H6` identical to `G1`/`G2`
- `case=9.onstop-holds-the-stop` — the demo for cell `H3`, **and the cell the wish was written for**
- 🔴 `define.invariant.a-symlink-under-agent-is-foreign` — enbriefed into **this** repo, kind
  **nature**, because `roles link` is the only writer under that path
- 🔴 **the durable lesson:** when a wisher names a gate, ask what that gate **cannot see** before you
  write it as *the* gate. a redirect toward one mechanism is rarely a claim that the others are
  wrong — and *"not X, but Y"* is a far stronger claim than *"also Y"*, so it owes evidence rather
  than inference.

---

## 🔴 .the narrow — 2026-09-23, `S14`. gate 2 is cut

**the same wisher who added gate 2 removed it**, once it was built and they could see what it did:
a roster rendered into every session's close, forever, on a question no session posed.

| what this seed settled | verdict under `S14` |
|---|---|
| the **symlink** is the marker of foreign ownership | ✅ **stands, untouched.** it governs the boot gate, and is dead code at introspect |
| the rung is **computed**, never a per-gate constant | ✅ **stands** |
| introspect is **blind by construction** to a route manifest | ✅ **stands — it is a measurement**, and it is what made gate 2 seem owed |
| ⇒ therefore a **third gate at `onStop`** | 🔴 **CUT.** the blindness is real; a gate was the wrong instrument |
| `case=9.onstop-holds-the-stop` | 🔴 **deleted** with the gate |

🔴 **the split is by CALLER, and that is what this seed's own argument never asked.** it settled
*where in a session* an unprompted refusal should fire — `onStop` over `onBoot`, on the sound ground
that a close costs the author no work — and never asked **whether an unprompted refusal was owed at
all.**

⇒ **`onStop` is the least-harmful moment for a refusal nobody asked for, which is not a moment that
earns one.** the population gate 2 named is served instead by `roles cost --all`: a **report** a
human types, which refuses naught (`S13`, `S16`).

🟡 **so the lesson above survives and gains a second half:**

> ask what a gate **cannot see** before you write it as *the* gate — **and then ask whether what it
> cannot see is owed a gate at all, or a report.**

a population outside every gate's reach is a real finding. *"add a gate"* is one answer to it, and
it is the answer that charges every session for a question one author had.
