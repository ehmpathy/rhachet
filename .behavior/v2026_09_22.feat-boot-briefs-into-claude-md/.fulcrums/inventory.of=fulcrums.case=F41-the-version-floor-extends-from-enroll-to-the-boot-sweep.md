# F41 — the version floor extends from enroll to the boot sweep

| field | value |
|---|---|
| **status** | **TAKEN**, 85% |
| **rework** | clean |
| **raised by** | peer r11 (enroll-impl-arch-defects), blocker: the floor guards one call site of a corpus that three commands write |
| **lands** | `assertBrainCliVersionFloor` (`onAbsent`) · `syncAndReportBrainDirBoots` · `invokeEnroll` · `invokeInit` · `invokeRolesLink` · `execUpgrade` |

## .the fork, stated fairly

F2 ruled the floor a **hard refusal** — exit 2, floor `2.1.277` — and scoped it to one verb:
*"enroll halts."* but `rhx init`, `rhx roles link` and `rhx upgrade` each write the same corpus,
for the same reader, and none of them consulted the floor.

so: does the floor bind only the command that **spawns** the cli, or every command that **writes
the corpus that cli will read**?

| fork | the case for it |
|---|---|
| **(a) enroll only** — leave F2 as written | the floor's stated harm is a spawn against a cli that lacks `claudeMdExcludes`. an `init` spawns naught, so it harms nobody at the moment it runs |
| **(b) every writer** — extend the floor to the sweep | the corpus is the artifact, not the spawn. a corpus written for a cli that cannot read it correctly is wrong the instant it lands, and the human learns that only at the *next* enroll — one command removed from the one that caused it |

## .what was taken, and why at the time

**(b), with one asymmetry: an ABSENT cli is permitted at the sweep and refused at enroll.**

- **present and below the floor → refuse, both places.** such a cli lacks the `claudeMdExcludes`
  and dynamic-section flags the boot rests on, so it would load the **wrong corpus in silence**.
  that is F2's own harm, and it does not care which verb wrote the file.
- **absent → permit at the sweep, refuse at enroll.** the sweep writes a corpus for a **later**
  reader; with no cli on this host there is no reader, the floor binds nobody, and a refusal would
  block an otherwise-correct write. a ci box that installs no cli is exactly this shape. an enroll
  is about to **spawn** the binary, so its absence is fatal there and nowhere else.

⇒ the two policies are not a default and an exception — they are two different questions, so the
policy is a **required** input (`onAbsent: 'refuse' | 'permit'`, no default), per
`rule.forbid.unexpected-defaults`. each call site states its own answer at the call.

the gate sits at the **single shared entry** `syncAndReportBrainDirBoots`, which all three writers
already call, so one gate covers `init`, `roles link` and `upgrade` with no third policy to keep
in sync.

## .the counter-argument, stated fairly

**a refusal at `rhx init` blocks work that has naught to do with the brain cli.** a human who
runs `rhx init --roles mechanic` to link a role now fails on a binary they were not about to use.
that is a real cost, and (a) does not pay it.

⇒ it is judged the lesser harm: the refusal is loud, names the floor and the upgrade command, and
is one `claude update` away — where the (a) failure is **silent**, lands a wrong corpus, and
surfaces at a later command that is itself correct.

## .the confidence, and why it is not higher

**85%.** the shape is settled and the harm is F2's own. what is uncertain is the **blast radius at
`rhx init`**: the sweep now refuses on a host whose cli is stale, and `init` is the most-run verb
in the repo. if that proves too aggressive in practice, the clean narrowing is to carry a policy
for the *below-floor* case too — refuse at enroll, warn at the sweep — which is a one-line change
at each call site and no contract change.

## .the rework, and why it is clean

one new required input on one operation, and one gate at one shared entry. to reverse it: drop the
gate from `syncAndReportBrainDirBoots` and the `onAbsent` input reverts to enroll's behavior. no
caller of the corpus changes, no artifact shape changes, no stored state.

## .where it is covered

- `assertBrainCliVersionFloor.integration.test.ts` — `[case3] [t1]` permit-still-refuses below the
  floor; `[case4] [t0]/[t1]` absent under each policy; `[case5] [t1]` permit-still-malfunctions
- `syncAndReportBrainDirBoots.integration.test.ts` — `[case1]` below floor refuses **before any
  write** (no `boot.md`, no `<repo>/.claude`); `[case2]` at floor writes; `[case3]` absent writes

## .see also

- `inventory.of=fulcrums.case=F2-version-floor-hard-refusal-over-warn-and-proceed.md` — the parent verdict this extends
- `define.brain-dir-repo-vs-actor` — why the sweep's reader is the repo brain dir's, a distinct fact from enroll's fallback brain
- `rule.forbid.unexpected-defaults` — why `onAbsent` carries no default
