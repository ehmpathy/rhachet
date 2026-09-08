# define.keyrack-verb-machine-wide-support

## .what

one inventory: how each `rhx keyrack <verb>` relates to a **machine-wide** ask (`--org @all` —
see `domain.terms/term=machine-wide._.choice._.md`).

⚠️ **the inventory below is the v1.47.2 BASELINE, not current behavior.** read the 🔴 column as the
BEFORE state: it names where each denial lived and why, so a NEW verb can be checked against the
same three axes.

three facts per verb, each of which can independently deny a machine-wide ask:

1. **can `--org @all` be spelled?** — does the verb declare an `--org` flag at all
2. **what gitroot form?** — `getGitRepoRootOrNull` (tolerates a non-repo cwd) vs strict
   `getGitRepoRoot` (refuses outside a repo, before any manifest question arises)
3. **does it load the repo manifest?** — and if so, is that load keyed on the gitroot rather
   than on the ask

## .why

a machine-wide credential is a fact about **the box**, never about a repo. so which verb asks
for it — and from which cwd — must not change whether it can be read. the wisher stated this as
a law:

> *"all keyrack verbs must support `--org @all` identically"* — 2026-08-25
>
> *"it should be consistent. any deviation of behavior is a hazard footgun."* — 2026-08-25
>
> *"no matter the cost, we do it right."* — 2026-08-25

## .the law, and why partial support is worse than none

**uniform support is not a polish item — it is the safety property.** a flag that works on some
verbs and not others is the most expensive shape a contract can take:

- a human learns `--org @all` on `get`, then reaches for it on `set` — where it is declared, and
  advertised by a hint (`:1137`) — and is refused for a cause unrelated to their ask
- the refusal names the **wrong cause** (a gitroot, or a manifest that was never consulted), so
  the human debugs the repo instead of the verb
- a command that works from one cwd dies from another, with no signal that the cwd was the axis

⇒ **a partially-supported flag teaches a false rule**, and a false rule is worse than an absent
feature: the human has no way to learn where the boundary sits, because the boundary is
incidental rather than declared. `rule.forbid.surprises`, `rule.require.pitofsuccess`.

that law is broken today in **two** ways, and they are easy to conflate because each produces
the same user-visible symptom (a machine-wide ask that fails). this table holds them apart so a
reader can tell which one bit them.

⚠️ **a claim true of one verb is not thereby true of its neighbour.** the verbs read alike and
their flags differ, so a per-verb table is the mechanism that makes an `--org` claim checkable
against the verb it is made about.

## the machinery is already complete — every denial sits upstream

the fact that decides how much the invariant costs to satisfy:

> **every verb already handles `@all` correctly downstream. not one of them lacks the logic.**

`@all` is handled at ~20 sites spanning the slug cast, the daemon protocol, the aws.params
vault adapter, the host-manifest schema, and the unlock session:

| site | what it already does |
|---|---|
| `asKeyrackKeySlug.ts:76` | `@all` is machine-wide ⇒ **exempt** from the org-match guard |
| `asResolvedAttempt.ts:25` | `@all` short-circuits **before** the manifest branch |
| `getOneKeyrackGrantByKey.ts:45-52` | `@all` returns the slug before any manifest is read |
| `unlockKeyrackKeys.ts:257-262` | a `@all.`-prefixed slug unlocks **manifest-or-not** |
| `daemon/…/handleGetCommand.ts:36-40` | the daemon serves a grant whose org is `@all` to any org |
| `adapters/vaults/aws.params/*.ts:25,32,33` | `@all` maps to imds identity + an `_all_` param segment |
| `daoKeyrackHostManifest/schema.ts:76` | `@all` is an explicitly valid org in the host manifest |
| `invokeKeyrack.ts:1124-1125` (`set`) | **`if (opts.org === '@all')` — the first branch, already correct** |
| `invokeKeyrack.ts:1322-1323` (`del`) | **the identical branch, already correct** |

⇒ **`set --org @all` and `del --org @all` are already implemented.** the `@all` branch is the
*first* branch in each, and it needs neither a gitroot nor a repo manifest. yet both are fetched
**above** it — `set` at `:1070-1071`, `del` at `:1308-1309` — so the verb dies before it reaches
the branch that would have served the ask.

## .the two classes of denial

a verb denies an `@all` ask in exactly **two** ways:

| class | the denial | where it bites |
|---|---|---|
| **1 — unspellable** | the verb declares no `--org` flag, so `@all` cannot be typed | at the cli parse |
| **2 — the eager repo-fetch** | a repo artifact (**gitroot** or **manifest**) is fetched *before* the ask's org is read, so the fetch's failure modes are inherited by an ask that never needed it | above the `@all` branch |

**why class 2 spans both depths.** an eager **manifest** fetch and an eager **gitroot** fetch
present as two problems but are one root cause at two depths:

- the **manifest** is fetched too early (`get`, `source`, `unlock`)
- the **gitroot** is fetched too early (`set`, `del`)

both mis-key the same question. both ask *"is there a repo?"* where the honest question is
*"will this ask consult one?"* — and both sit above machinery that already answers `@all`
correctly. so they take **one** fix shape: read the ask's org first, then fetch only what the
ask needs. to split them into separate classes would imply separate fixes, and invite one to be
repaired while its twin is left.

⚠️ this matters for scope. a strict-gitroot denial is **not a feature to build** — it is the reported
defect, one line earlier in the same file. to fix `get` and leave `set` is not a narrower scope;
it is the same defect left half-repaired.

a verb may hold both classes at once.

## .the inventory

all citations read from `src/contract/cli/invokeKeyrack.ts` at `v1.47.2`.

| verb | declared | `--org`? | gitroot | loads manifest | `@all` branch downstream | classes |
|---|---|---|---|---|---|---|
| `init` | `:123` | ✅ `:137` | OrNull `:160` | ❌ none | n/a | — ✅ **conforms** |
| `get` | `:420` | ✅ `:427` | OrNull `:556` | ✅ `:560` (builder) | ✅ `getOneKeyrackGrantByKey:45` | **2** (manifest) |
| `source` | `:703` | 🔴 absent | OrNull `:801` | ✅ `:804` (builder) | ✅ same builder | **1 + 2** (manifest) |
| `set` | `:966` | ✅ `:987` | 🔴 strict `:1070` | ✅ `:1071` | ✅ **`:1124`** | **2** (gitroot) |
| `del` | `:1250` | ✅ `:1261` | 🔴 strict `:1308` | ✅ `:1309` | ✅ **`:1322`** | **2** (gitroot) |
| `unlock` | `:1498` | 🔴 absent | OrNull `:1589` | ✅ `:1591` | ✅ `unlockKeyrackKeys:261` | **1 + 2** (manifest) |
| `relock` | `:1715` | 🌙 declined | — | — | — | **1** |
| `status` | `:1767` | 🔴 absent | — | — | — | **1** |
| `list` | `:1870` | 🔴 absent | — | — | — | **1** |
| `fill` | `:1917` | 🌙 declined | 🔴 strict `:1951` | ✅ | — | **1 + 2** ⚠️ repo-scoped |
| `firewall` | `:2049` | 🌙 declined | 🔴 strict `:2127` | ✅ | — | **1 + 2** ⚠️ repo-scoped |

🌙 **declined ≠ absent.** the three read `🔴 absent` while `--org` was merely undeclared, so a
human who asked got commander's `unknown option` at exit 1. each now **declares** `--org` as a
hidden option and refuses it by name, with the reason and the fix — see *"to DECLINE a flag,
DECLARE it"* below. so the ask is stated on all eleven verbs: eight serve it, three refuse it
out loud.

`init` is the one verb that already conforms: it tolerates a non-repo cwd **and** loads no repo
manifest, so a machine-wide ask has no way to die on it.

⚠️ the `--org` column reads the **flag**, not the capability. a full `@all.$env.$KEY` slug via
`--key` reaches some class-1 verbs anyway, which is exactly why the gap hid for so long: the
capability half-exists while the spelled form does not.

## .the sharpest contradiction

`set` declares `--org @all` (`:987`) and its own hint advertises it (`:1137`):

> *"tip: for sudo credentials without keyrack.yml, use `--org @all`"*

yet `set` derives its gitroot with **strict** `getGitRepoRoot` (`:1070`), so that advice cannot
be taken from a cwd that is not a repo. the cli makes a promise its own next line forbids —
`rule.forbid.surprises`, in the most expensive place (a hint shown to a human).

`invokeKeyrack.ts:1409` carries the same promise a second time.

## .the bar for a repo-scoped verb

`fill` and `firewall` are repo-scoped **by nature** — they write into, or sweep, a repo's
keyrack. the invariant does not demand they run from anywhere. it demands the weaker, exact
property, which the wisher settled:

> *"an `@all` ask is well-defined"* — 2026-08-25

⇒ on a repo-scoped verb, a machine-wide ask must have a **stated, deliberate** answer — which
may be a loud refusal by design. what fails the bar is an **incidental** answer: a strict
gitroot that happens to bite, or a throw from a manifest the ask never consults.

| the ask | the bar |
|---|---|
| `get` / `source --key` / `unlock --key` — one named key | **serve it** — no manifest, no gitroot |
| bare `source` / `firewall` — a repo sweep | **refuse, loud and by design** — a repo sweep IS the manifest's content |
| `fill` — writes into a keyrack | **well-defined**: an `@all` key belongs in the **host** manifest, so the ask has a meaningful answer |
| `set` / `del --org @all` — writes a machine-wide key | **serve it** — the `@all` branch already exists (`:1124`, `:1322`) and needs no repo; only the eager gitroot above it denies the ask |

⚠️ **"well-defined" is the bar, and it is not the same as "unrestricted."** a loud, stated refusal
satisfies the invariant. an incidental one does not. the distinction is what keeps
`rule.forbid.failhide` and this law on the same side — and it is the only deviation the law
permits, because it is a **declared** deviation rather than an emergent one.

## 🔴 the class-1 fix: `--org` is a FILTER on a sweep verb, and its default is "no filter"

to add `--org` to a sweep verb (`unlock`, `source`, `list`, `status`) is the class-1 fix. **its
default must be the verb's extant scope, never `@this`.**

**the trap.** `unlock`'s default scope is already a **union** — `unlockKeyrackKeys.ts:178-187`
sweeps repo keys **∪** machine-wide keys, clamped by `unlockKeyrackKeys.test.ts:257` and `:295`.
so an `@this` default would silently stop unlock of every machine-wide key that unlocks today,
with no error — the keys simply leave the swept set. that kills the bootstrap-to-clone path the
`@all` sigil exists for.

⇒ **the class-1 fix must ADD reach, never narrow a default.** a new flag whose default changes
extant behavior is not a fix; it is a regression in a fix's clothes.

| ask | scope | manifest |
|---|---|---|
| `unlock --env camp` (bare — unchanged) | repo ∪ machine-wide | bound ✅ |
| `unlock --env camp --org @all` | machine-wide only | **free** ← the class-1 win |
| `unlock --env camp --org @this` | repo only | bound |
| `unlock --env camp --org @this`, **no repo** | ⛈️ a loud refusal | bound |
| `unlock --env camp --org otherorg` | an empty set | per the ask |

⚠️ **the filter is decided ONCE, above the branch, and applied on every path.** a filter computed
inside one branch is silently dropped on the others — and the drop is not a failure but a WRONG
ANSWER: an `--org @this` ask from a non-repo cwd would yield every machine-wide key, the opposite
provenance to the one named. the ask is the same on every path, so the filter must be too
(`rule.require.org-scope-grain-hardcut`).

⚠️ **`@this` with no manifest REFUSES, never falls back.** the same rule `status` and `list`
apply, through the same operation (`asKeyrackFilterOrg`). a soft fallback from a specific-org ask
to the machine-wide grain is the hazard that rule exists to forbid.

**this is one sense of `--org`, not two.** the flag names **provenance** on every verb
(`invokeKeyrack.ts:465-467`); what differs is the verb's **arity**. `--env` already behaves the
same way, which makes this symmetric rather than novel:

| flag | on a singular verb (`get`) | on a sweep verb (`unlock`) |
|---|---|---|
| `--env` | selects the slug's env segment | filters the swept set |
| `--org` | selects the slug's org segment | filters the swept set |

⚠️ **`source` holds BOTH arities, so it must read the flag under exactly ONE per invocation.**
with `--key` it is singular and the flag SELECTS; bare it is a sweep and the flag FILTERS. to
apply both is to consume one flag twice under two senses — and the two disagree by design, since
a full slug outranks the flag on the keyed path (`getOneKeyrackGrantByKey.ts:45-50` returns the
slug verbatim). so `source --key <org>.<env>.<KEY> --org @all` resolves the right slug, and a
sweep filter run over that result would then exclude it for its own org segment: an empty export,
exit 0, no message. ⇒ **the filter is gated to the sweep path.** clamped at
`keyrack.machine-wide-skips-manifest.acceptance.test.ts` `[case2] [t3]`.

⚠️ **a bare sweep stays manifest-bound, correctly.** with no `--org`, the ask spans both
namespaces, so any member that needs the manifest requires the load. the flag does not retire
that — it lets a caller **opt into** an explicitly machine-wide ask, which turns an unreachable
ask into a reachable one. that is the whole class-1 win, stated exactly.

## ⚠️ the ONE ratified carve-out: `relock` keeps no `--org`

`relock` sits in the class-1 list above and is the one member that does **not** take the class-1
fix. that is a deviation from the table, so it is ratified here rather than left to a code
comment — a divergence recorded only at the call site reads to the next traveler as an oversight,
which is the exact way this whole defect family hid (`rule.require.timeless-comments`).

| the ask | on `relock` |
|---|---|
| relock one machine-wide key | ✅ **served** — `relock --key @all.camp.FOO`, by full slug |
| relock every machine-wide key at once | 🔴 **unspellable** — no `--org @all` |

the capability is therefore **reachable but not sweepable**, which meets the weaker bar a
repo-scoped verb owes (an `@all` ask is *well-defined*) without taking the class-1 fix.

two facts decide it, and both are about **direction**:

1. **a relock REVOKES.** every other `--org` site narrows a set of grants; here it would narrow a
   set of *purges*. the verb's own header states the asymmetry — *"to grant is narrow and to
   revoke is wide"* — so a filter that shrinks a revoke is the one direction that turns a
   half-applied flag into keys left unlocked, silently. a grant filter that errs leaves a human
   without a credential; a revoke filter that errs leaves a credential without a human
2. **the daemon protocol has no org grain.** it filters by slug or by env only, so the cut cannot
   happen at the cli at all — it would have to be implemented **inside the daemon**. that is a
   protocol change, not a flag, and a protocol change that alters what a revoke purges is owed
   its own round with its own clamps

⇒ **deferred on purpose, and reversible.** to add it later is additive in exactly the way the
sweep verbs' `--org` was: a new flag whose default is the verb's extant scope. no caller is
shaped around its absence, so no rework is owed.

## 🔴 to DECLINE a flag, DECLARE it — silence is not a stated refusal

the three verbs that decline `--org` — `relock`, `fill`, `firewall` — declined it by leaving it
**undeclared**, and each recorded why in a source comment. that reads as a stated decision and is
not one, because an undeclared flag never reaches an action: commander's `unknownOption()`
answers first, with `error: unknown option '--org'` at **exit 1**.

| what a human got | what the decision held |
|---|---|
| `[commander error] error: unknown option '--org'` | the reason the verb has no org grain |
| exit **1** — a malfunction code for a caller-fixable ask | `relock --key @all.<env>.<name>`, the escape hatch |
| no keyrack tree, so a scripted reader sees a different shape | a whole paragraph, three lines up in the source |

⇒ each of the three now **declares** `--org` as a **hidden** option and refuses it with a
`ConstraintError`, so the refusal carries the reason and the fix at exit 2, through the same
`KeyrackCommand` boundary as every other refusal.

- **hidden**, because `--help` must list what WORKS — a control that always refuses is friction
  in the one place a human reads to learn the verb (`rule.require.safe-by-default`)
- **only `--org`**, never a blanket `allowUnknownOption()`. that shape retires the parse gate for
  every OTHER flag on those verbs, so a typo would run the verb instead of halt it. the
  asymmetry is the point: eight verbs in this family **teach** `--org`, so a human who tries it
  on the other three applies a rule the cli taught. `--bogus` has no such story and keeps
  commander's refusal
- clamped both ways in `keyrack.blocked-render-consistency.acceptance.test.ts` — `[case1]` pins
  the three branded refusals, and `[case2]` pins the limit, so the blanket shape goes red

> **the lesson, stated for the next carve-out:** a decision a human cannot reach is a decision
> only a reader of the source holds. to decline is a behavior, so it is owed a declaration and a
> clamp, exactly like a supported flag.

## .the derivable class-2 test

a verb suffers **class 2** if it performs **either** repo-fetch above the point where the ask's
org becomes readable:

| depth | the fetch | verbs |
|---|---|---|
| **gitroot** | `getGitRepoRoot` (strict) — refuses outside a repo | `set` `:1070`, `del` `:1308`, `fill` `:1951`, `firewall` `:2127` |
| **manifest** | `daoKeyrackRepoManifest.get` / the get-context builder | `get` `:560`, `source` `:804`, `unlock` `:1591`, `getKeyrackKeyGrants` `:111` + `:171` |

so the set is derivable by **two greps** — `getGitRepoRoot(OrNull)?\(` and
`daoKeyrackRepoManifest\.get|genContextKeyrackGrantGet\(` — rather than observed by a caller
sweep.

⚠️ **read the gitroot's ORIGIN, never its local expression.** a site that receives `gitroot` as
a **parameter** (e.g. `fillKeyrackKeys.ts:158`) shows no `getGitRepoRoot*` call of its own, so a
bare grep will not name it. follow the value up the call chain to the call that produced it;
only the origin decides.

⚠️ **the null-tolerant form is not a clean bill of health, and the strict form is not a licence.**
`getGitRepoRootOrNull` is not a filter: a verb does not fall out of scope merely because it calls
the strict `getGitRepoRoot`. the tempting argument — that such a verb is "repo-bound by contract"
— is circular, because the strict call **is** the denial, never evidence that the verb ought to be
repo-bound. `set`'s own `@all` branch at `:1124` settles it: the verb is ready to serve a
machine-wide ask that its own gitroot call already refused.

⇒ audit every site by which artifact it fetches and when, never by which gitroot helper it names.

## .see also

- `domain.terms/term=machine-wide._.choice._.md` — the term, its forbidden synonyms
- `getAllMachineWideSlugsForEnv.ts:6-11` — the design intent, in the repo's own words: an
  `@all` key *"must be unlockable with NO repo manifest at all"*
- `invokeKeyrack.ts:465-467` — why `--org` (provenance) and `--reach` (destination) keep
  separate words
- `ehmpathy/rhachet#467` — the reported class-2 defect on `get`
