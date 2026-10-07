# F20 — close the door, or repair the walk?

- **rework** = 🔴 **dirty** — the walk repair edits `src/infra/`, which every layer reaches. 🟡 the
  grade follows the reversal, never the taken, and this row was in fact reversed mid-stone
- **status** = ANSWERED, **REVISED** — B was taken, then the residual flipped the cycle half to A
- **confidence** = 🔴 **88% at the take, and the 12% is what came true.** the residual section named
  the exposure the take underweighted, and it is now the take
- **where** = `src/domain.operations/boot/getOneBootSource.ts` · `src/infra/filesystem/getAllFilesFromDir.ts`
- **raised** = 2026-09-18, at `5.1.execution` `review.self r5` (`behavior-declaration-coverage`)

---

## .the fork

a requirement-5 probe ran `--manifest` against a **directory** rather than a typo:

```
$ npx rhachet roles boot --manifest src
MalfunctionError: ELOOP: too many symbolic links encountered, stat
  '…/node_modules/rhachet/node_modules/rhachet/node_modules/rhachet/…'
EXIT=1
```

**two defects, stacked**, and each has its own repair:

| # | the defect | whose |
|---|---|---|
| 1 | `existsSync` is **true for a directory**, so the requirement-5 guard never fired | 🔴 **mine** — `getOneBootSource`, written this round |
| 2 | `getAllFilesFromDir` follows symlinks with **no cycle guard**, and this repo ships `"rhachet": "link:."` | 🔴 **not mine** — `src/infra/`, extant, 6 production callers |

| option | what it costs |
|---|---|
| **A** — repair **both** | the right end state, and it edits `src/infra/` — the widest blast radius in the tree, with 2 suites that pin symlink behavior deliberately |
| 🔴 **B** — repair 1, dream 2 (taken) | the ELOOP is unreachable **through this feature**, and stays reachable for any future caller that walks an unbounded root |
| **C** — repair 2 only | 🔴 **wrong.** a directory would then walk successfully and render an empty payload in silence — the exact defect requirement 5 exists to forbid |

---

## .taken, and why

🔴 **taken: A — and B was taken FIRST, then reversed by the residual below.** the walk carries a
cycle guard, and the residual dream is now narrower than the fork that raised it:

| the repair | shipped? | where |
|---|---|---|
| 1 — the `isFile()` guard on `--manifest` | ✅ | `getOneBootSource.ts` |
| 2a — the **cycle guard** on the walk | ✅ | `getAllFilesFromDir.ts`, an ancestor chain keyed on `realpathSync` |
| 2b — `ELOOP` / `EACCES` **classification**, at the **walk** | 🔴 **still dreamed** | `getAllFilesFromDir.ts`'s ENOENT-only catch stands |
| 🔴 **2e** — the same classification at the **manifest's own stat** | ✅ **shipped** | `getOneBootSourceFromManifest.ts`, a closed-set errno narrow — see below |
| 🔴 **2c** — the **dir OPEN** carries the entry loop's `ENOENT` skip | ✅ **added i006** | `getAllFilesFromDir.ts`, the `readdirSync` IIFE |
| 🔴 **2d** — the **per-entry** `ENOENT` arm parts a stale link from a **vanish** | ✅ **added i007** | `getAllFilesFromDir.ts`, the `statSync` catch |

🔴 **2d was found by the same peer lane a round after 2c, and it is a THIRD grade of the same
defect.** `arch-hazards-behavior` i007 nitpick.1 named it: the per-entry catch was present, applied,
and **short an arm** — one errno with two causes, answered by one answer.

| round | what it found | the grain |
|---|---|---|
| i004 | the walk follows symlinks with **no cycle guard** | the **recursion** |
| i006 | the dir **open** is raw where its two neighbours are guarded | the **site** |
| 🔴 i007 | the per-entry catch answers **two questions with one answer** | 🔴 the **arity** |

⇒ **a guard can be correct at every site and still be short an arm.** i006's prescribed sweep — a
grep on the guard's own vocabulary across every site it governs — finds an **absent site**, by
construction. it cannot find a site where the guard is present and conflates two causes, because
that site greps as a hit.

🔴 **2d's CLEAN answer flipped this row's `dirty` grade for the third time, and the flip was
measured rather than inherited.** the repair is 14 lines inside **one** `catch` arm: it touches no
signature, no caller, and no other branch, and the three extant `broken-*` suites are its regression
proof. ⇒ the `dirty` grade this row carries was earned by the **cycle guard** (2a), which changed
the walk's recursion — **a peer row's grade is a hypothesis about your own change, not a measurement
of it**.

🟡 **and the lane's one false sentence is what made the deferral look defensible**: it called the two
causes *"indistinguishable at this layer."* `lstatSync` stats the **link** rather than its target, so
a broken symlink lstats cleanly while a vanished entry raises `ENOENT` a second time. no heuristic,
no race window to guess at — one syscall, paid only on the `ENOENT` arm
(`rule.require.refute-a-premise-with-a-measurement`).

🔴 **the harm 2d closes is an UNDERCOUNT, which is the one direction a budget gate must never fail
in.** a file that vanishes between a parent's `readdirSync` and a child's `statSync` was silently
skipped, so the payload was measured over a tree **shorter than the one the author wrote** — and an
over-budget boot could pass. every peer reader on this same budget path refuses that race loudly
(`readOneBootSpecFile`, `readOneSayResource`, `calc.tokens`); the walk was the one silence, and it
feeds the gate its denominator.

🔴 **2c was found by a peer lane two rounds after this row was written, and it flips the row's own
premise a second time.** `arch-hazards-behavior` i006 blocker.1 named it: `existsSync` and
`realpathSync` validate the dir, and then `readdirSync` opens it — a third syscall, unguarded,
where the two above it are guarded and the per-entry `statSync` two lines below it is guarded too.

⇒ **the CLEAN answer for 2c is the opposite of 2b's, and for the reason the residual section
already gives.** 2b opens no door this feature did not already close with the cycle guard. **2c
does**: every budget gate drives this walk, so a `pnpm install` that relinks a role mid-walk holds
a session stop on a raw `ENOENT` at exit 1 — a malfunction code for the caller's own churn.

🟡 **and the clamp for 2c is deliberately partial**, which is stated rather than smoothed: the
`ENOENT` arm has no deterministic drive (three syscalls, one path, a kernel-owned window, and a
mock is forbidden at that tier). `[case4]` clamps the guard's **width** instead — an `ENOTDIR`
escapes unchanged — which is the half a too-eager repair gets wrong.

⇒ **the residual 12% below is what flipped it, and it flipped it exactly as that section predicts:**
*"a feature that opens a door owes the door's frame."* this feature is the first caller in the
repo's history that can walk `.`, so the cycle became reachable **through this diff** and the CLEAN
question was re-answered for defect 2a alone.

🟡 **2b stayed dreamed, and the line between them is the door.** no path this feature adds can
produce `ELOOP` or `EACCES` that the cycle guard does not already stop — so 2b opens no door, and
the original CLEAN verdict holds for it unchanged.

⇒ the fork's own **"what would flip it"** clause named this: *"a second caller that walks an
unbounded root."* the second caller was this one.

---

### the ORIGINAL argument, which the reversal did not refute

the SAFE/CLEAN test, run per defect (`rule.always.fix-forward-under-scouts-honor`):

| defect | SAFE? | CLEAN? | verdict |
|---|---|---|---|
| 1 — the guard | ✅ | ✅ **every file is mine, written this round** | 🔴 **fix now** |
| 2 — the walk | ✅ the repair strictly narrows | 🔴 **no** — `src/infra/`, 6 production callers, 2 suites that pin symlink behavior | dream it |

⇒ **the two halves of one stack trace land on opposite sides of the CLEAN question**, which is why
the fork is worth a row rather than a note. a reader who sees *"an ELOOP, half-fixed"* would read a
shortcut; the table is the argument that it is a boundary.

the repair taken for defect 1:

```ts
const statSpec = statSync(pathToSpec, { throwIfNoEntry: false });
if (!statSpec?.isFile())
  throw new ConstraintError('--manifest points at no file', {
    path: from.manifest.path,
    pathTaken: pathToSpec,
    expected: 'a readable boot.yml',
    found: statSpec?.isDirectory() ? 'a directory' : 'no such path',
  });
```

🟡 **the `found` field is not decoration.** `rule.require.errors-name-the-fix` asks an error to name
the fix, and *"points at no file"* on a path that plainly exists reads as a lie without it.

---

## 🔴 .the residual 12% — this behavior opened the door

the walk defect is old and was unreachable: all six extant callers walk a **bounded** subtree
(`.../skills`, `.../inits`, `.../briefs`, a role dir). **a manifest's `rootDir` is
`dirname(pathToSpec)`**, so `--manifest ./boot.yml` is the first caller in the repo's history that
can walk `.`.

⇒ so *"not mine"* is true of the **code** and only half true of the **exposure**. the honest
counter-argument to the taken is: a feature that opens a door owes the door's frame, and B leaves
the frame to a dream.

🟡 **what makes B defensible rather than convenient** is that the guard closes it at the *right*
layer. a manifest that is not a file is a **caller** defect and owes exit 2; an infra walk that
cannot terminate is a **server** defect and owes exit 1. to repair only the walk would have
answered a caller's typo with a malfunction — so defect 1 was owed regardless of defect 2.

---

## 🔴 .2b, re-graded — the "opens no door" claim is NARROWER than it was written

raised at `5.1.execution` `review.peer r010` §5: the exit-1 inconsistency lands specifically on
`--manifest`, which is **the new caller-faced surface this feature adds**, while every other refusal
on this path is a `ConstraintError` at exit 2.

⇒ the claim above — *"no path this feature adds can produce `ELOOP` or `EACCES` that the cycle guard
does not already stop"* — is **half right, and it was written as though it were whole**:

| the errno | does the cycle guard close it? |
|---|---|
| `ELOOP` | ✅ **yes.** an ancestor chain keyed on `realpathSync` terminates every cycle, so the ELOOP that raised this row is unreachable |
| 🔴 `EACCES` | 🔴 **no. the cycle guard has naught to do with permissions.** a `chmod 000` dir anywhere under a manifest's `rootDir` still raises it, and the `ENOENT`-only catch still rethrows it raw |

🔴 **so `--manifest ./boot.yml` beside an unreadable dir yields `MalfunctionError`, exit 1** — a
server code for a caller's own filesystem. that is the inconsistency the reviewer names, and it is
real.

### .accepted as-is, and why — a conscious call rather than a drop

| the test | answer |
|---|---|
| is it **SAFE** to repair now? | ✅ yes — the repair strictly widens a catch arm |
| is it **CLEAN**? | 🔴 **no, and for the reason this row has argued since i004**: the arm lives in `src/infra/`, which **6 production callers** share, and an `EACCES` that today crashes loudly would instead return a **partial** tree. that is an undercount, which is the one direction a budget gate must never fail in |

⇒ **the CLEAN answer is what parts 2b from 2c and 2d.** both of those repaired an `ENOENT` whose
correct answer is unambiguous — skip a stale link, refuse a vanish. an `EACCES` has **no** such
answer:

| the candidate repair | what it costs |
|---|---|
| **skip** the unreadable dir | 🔴 a silent undercount — the gate measures a tree shorter than the author's |
| **refuse** with a `ConstraintError` | ✅ the right shape, and it moves 6 callers from *crash* to *refuse*, each with its own clamps to re-bless |

⇒ option 2 is the right end state, and it is **a repair of the walk's contract** rather than of this
feature — the identical boundary this row drew at i004, on an errno the cycle guard never touched.

🟡 **and the one cheap half is already taken**: the manifest's **own** path is guarded at exit 2
(`getOneBootSource.ts`'s `isFile()` check, defect 1 above). the residual is the walk **beneath** it,
which is `src/infra/`'s to answer.

⇒ carried by
`.dream/2026_09_18.getallfilesfromdir-rethrows-eloop-and-eacces-unclassified.dream.md`, whose live
scope is now **`EACCES` alone** — the `ELOOP` half it was caught for was repaired by 2a.

---

## 🔴 .2e — the MANIFEST's own stat was narrowed, and 2b's live scope shrank to the walk — 2026-09-24

the row above said *"the ENOENT-only catch stands"* as though **one** catch answered the whole
question. there are **two** stats on a `--manifest` path, at two layers, and only one of them is
`src/infra/`'s:

| the stat | whose | verdict |
|---|---|---|
| the **manifest's own path** — `getOneBootSourceFromManifest.ts` | 🔴 **mine**, added this round | ✅ **narrowed** — a closed set of caller-fixable errnos raises a `ConstraintError` at exit 2 |
| the **walk beneath it** — `getAllFilesFromDir.ts` | not mine, 6 production callers | 🔴 **still dreamed**, for the CLEAN reason argued above |

⇒ **so the deferral was never whole, and the row stated it as though it were.** the CLEAN argument
that keeps 2b dreamed — *"it moves 6 callers from crash to refuse, each with its own clamps to
re-bless"* — has **no purchase at all** on a site with one caller that this feature wrote.

### .the narrow is a CLOSED SET, and the closure is the load-bearing half

```ts
const isCallerFixable =
  code === 'EACCES' ||      // the path, or a dir above it, denies a read
  code === 'EPERM' ||       // the operation is not permitted
  code === 'ELOOP' ||       // the path walks a symlink cycle
  code === 'ENAMETOOLONG';  // the argument exceeds the fs limit
if (!isCallerFixable) throw error;
```

an `EIO` or an `ENOMEM` escapes unchanged rather than sweeps into one bucket
(`rule.forbid.failhide`): a disk fault reported as a caller defect sends a human to edit a path that
was never wrong.

🟡 **`ENOTDIR` is deliberately ABSENT, and the absence was MEASURED.** node suppresses it under
`throwIfNoEntry: false` exactly as it does `ENOENT`, so a row for it would be a branch that can
never be taken — and a dead branch reads to the next author as a case that IS handled.

### 🔴 .the clamp's fixture was measured too, and two likelier candidates are dead ends

| the candidate | what `statSync(p, { throwIfNoEntry: false })` does |
|---|---|
| `EACCES` — a `chmod 000` dir | throws ✅ — 🔴 but **root ignores the mode bits**, so the clamp is green with the defect present on any container that runs as root |
| `ENOTDIR` — a parent that is a FILE | 🔴 **returns `undefined`.** node reads it as an absence |
| ✅ `ELOOP` — a symlink cycle | throws, on every uid, with no mode bit to bypass |

⇒ `getOneBootSourceFromManifest.integration.test.ts` `[case5]` drives the `ELOOP` row, and its own
docblock says out loud that `EACCES` is covered by **the closed set this row proves is consulted**
rather than fixtured directly. a clamp described as a catch of a defect it measurably does not
catch is trusted wrongly.

### 🟡 .the lesson — enumerate the errnos a call raises, never only the one the concern named

the dream this row carries was caught for `ELOOP`. 2a closed `ELOOP`. the row then wrote 2b's live
scope as *"`EACCES` alone"* — correct for the walk, and it silently carried the **layer** of the
original report along with the errno. one enumeration of the sites, rather than of the errnos alone,
would have parted them a round earlier.

---

## .what would flip it

🔴 **this clause already fired, and the taken above is the result.** it read: *"a second caller that
walks an unbounded root … makes the walk repair `urgent` rather than `better`."* the second caller
is this feature, and the cycle half became work.

what remains to flip **2b**: any report of an `ELOOP` or `EACCES` from a non-cyclic path, which
would make the classification `urgent` and the dream work.

🟡 **the lesson is the clause's own value.** a fulcrum's *"what would flip it"* is not decoration —
it is a trigger a later round can check, and here the later round was the same one.

---

## .the clamps

**defect 1** — `src/contract/cli/invokeRolesBoot.manifest.integration.test.ts` `[case6]`: a
`--manifest` that points at a **directory** refuses with `--manifest points at no file`, and the
error carries `a directory`. suite: 9 passed, 0 failed.

⚠️ **the clamp bites.** before the repair this input escaped the guard entirely and died downstream
at exit 1; the assertion on `found: 'a directory'` cannot pass under `existsSync`.

**defect 2a** — `src/infra/filesystem/getAllFilesFromDir.integration.test.ts`, three cases: a
self-cycle, a mutual cycle, and 🔴 **a dag that must still be walked by both routes**. that third
case is what bounds the guard from below — an ever-visited set would terminate the cycles too, and
would also collapse the dag, which is a behavior change `getAllFilesFromDir.test.ts` pins against.

🔴 **defect 2d** — `[case5]`: a stale link at the top level and a second one a level down, beside a
real file. three `then`s — the walk does **not** throw, the real file is **still** yielded, and **no**
stale link enters the list.

⚠️ **the clamp is of the arm's WIDTH, and that is stated in its own docblock rather than left for a
reader to infer.** the vanish arm has no deterministic drive — the window between a parent's
`readdirSync` and a child's `statSync` belongs to the kernel, and a mock is forbidden at this tier
(`rule.forbid.integration.mocks`). ⇒ the same honest bound `[case4]` carries for the dir open, for
the same reason, and it is the half a too-eager repair gets wrong: a fix that simply threw on
`ENOENT` would refuse every stale link in every linked-role tree, and `[case5]` goes red the moment
it does.

🟡 **the three extant `broken-*` givens drive the same arm and are NOT redundant with `[case5]`.**
they assert what the walk **returns**; `[case5]` asserts **why** it returned it, and its docblock
carries the `lstat` discriminator — two nets over one defect
(`rule.require.a-cue-is-not-a-claim`).

**defect 2b** — none. it is dreamed, and the dream names the two fixtures it owes.

🔴 **defect 2e** — `src/domain.operations/boot/getOneBootSourceFromManifest.integration.test.ts`
`[case5]`: a manifest path that walks a two-link symlink cycle refuses as a `ConstraintError`
rather than a malfunction.

⚠️ **the clamp bites, and it also states what it does NOT grade.** the narrow's other half — that a
fault outside the closed set still escapes unwrapped — needs an INJECTED fault, and the operation
binds `statSync` at import, so a spy never reaches the call. that half is left to review rather than
clamped blind, and named in the docblock so the clamp's reach is not overread.

---

## .see also

- `rule.always.fix-forward-under-scouts-honor` (driver) — the SAFE/CLEAN test, run per defect
- `rule.always.catch-dreams-for-followups` (driver) — why the deferred half owes a dream **and** this row
- `rule.require.exit-code-semantics` (mechanic) — why a caller-caused walk owes exit 2
- `rule.require.errors-name-the-fix` (ergonomist) — why the `found` field carries weight
- `.dream/2026_09_18.getallfilesfromdir-rethrows-eloop-and-eacces-unclassified.dream.md` — the deferred half
- `review/self/for.5.1.execution.from_vision._.r5.behavior-declaration-coverage.md` — the round that raised it
