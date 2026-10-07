# rule.forbid.framework-owned-hooks

> **rhachet declares no hooks of its own. every hook reaches a brain through a ROLE.**
>
> **one exception, and only one: the `.this` budget gate**, armed by a role's own declared budget
> (see `.the sole exception` below).

rhachet **relays** a role's declared hook into a brain's config — that is its whole job. what it may
never do is **author** one.

## 🔴 .why — a framework is AGNOSTIC of usecases

> **a framework supplies mechanism. a usecase comes from a human. we never mix that boundary.**

| | belongs to | rhachet's part |
|---|---|---|
| *"a hook can fire at `onStop`"* | 🔩 **mechanism** | ✅ build it, document it, relay it |
| *"at `onStop`, run THIS"* | 🎯 **a usecase** | 🔴 never. a human asked, or nobody did |

🔴 **a hook IS a usecase, written down in config** — *"when X happens, do Y."* so a framework that
declares one has adopted a usecase it cannot own: it has decided, on every consumer's behalf and
with no consumer in the room, what they want to happen and when.

and in rhachet a human's usecases arrive as a **role**. that is what a role *is* — the unit in which
a human says what they want. so the boundary has a name on both sides, and the rule is simply that
the name never moves.

## .what a mixed boundary costs

| | a role's hook — a human's usecase | 🔴 a framework's — a guessed one |
|---|---|---|
| how it arrives | `roles link` — the consumer asked | **every repo, unconditionally** |
| how it leaves | `roles link` the role away | 🔴 **fork the framework** |
| who can edit it | the role's author, in the role's tree | rhachet's maintainers |
| what it is attributed to | a `repo=`/`role=` coordinate | naught |
| who reviews its cost | that role's author, in that role's diff | 🔴 **nobody — it has no role to belong to** |

⇒ every row is one consequence of the same mix. the sharpest is how it leaves: **a consumer who wants
a guessed usecase gone has no lever short of a fork.**

## 🔴 .the disparity — a privileged path the suppliers cannot reach

the mix does not merely add a hook. it forks the mechanism in two, and **one of the two is
privileged**:

| | a supplier's path | 🔴 the framework's own |
|---|---|---|
| where it declares | a role's hooks file | rhachet's source |
| what governs it | a spec, a budget, a coordinate, a `roles link` | 🔴 **naught — it answers to no contract** |
| how a consumer refuses it | unlink the role | 🔴 fork |
| how a supplier gets the same reach | 🔴 **ask rhachet's maintainers** — a permission, not a mechanism |

**that asymmetry is the disaster, and it compounds:**

- the privileged path is **exercised by the framework's own need**, so it stays healthy while the
  supplier path drifts
- the supplier path gets **less investment**, precisely because the framework's own usecase is
  already served without it
- ⇒ so a capability suppliers need arrives as a **special case** somebody grants, rather than a
  contract anybody can hold

🔴 **the test for the disaster is one question: *could a supplier have built this, the same way?***
no → you built a privilege. the repair is to make the supplier path carry it, then use that path
yourself — which is the only version that keeps the two in step.

## 🔴 .the measured incident — 2026-09-22

`syncRhachetHooksIntoEachBrainRepl` wrote an `onStop` entry into **every** `.claude/settings.json`,
in every repo, attributed to no role:

| what it cost | |
|---|---|
| per session stop | 🔴 **2,223ms** mean — vs a 388ms control on the same binary |
| what it swept | `**/boot.yml`, repo-wide — **blackbox test fixtures among them** |
| what it returned | 🔴 **exit 2**, on a deliberately-invalid fixture, on every stop |
| which role asked for it | 🔴 **none.** so no consumer could unlink it |

⇒ the root was never the sweep or the tokenizer. **it was that a framework grew a hook**, and a
framework hook has no author to review it and no consumer to switch it off.

## .the test

> **"which ROLE declares this hook?"**

- you can name one → **declare it there**, in that role's tree
- you cannot name one → 🔴 **it does not belong in rhachet either.** it belongs to a role that does
  not exist yet, and the work is to create that role

🟡 *"it is generic, so it belongs to the framework"* is the trap, and it inverts the rule.
**generic is what `repo=.this/role=any` is for** — a repo-local role, with a coordinate and a
consumer who can unlink it.

| when… | then… |
|---|---|
| you would write a brain-config entry from rhachet's own source | 🔴 the strongest cue. which role declared it? |
| you write a `syncXHooksIntoY` whose `X` is rhachet | 🔴 the relay is rhachet's; the **declaration** is never |
| a hook must fire *"in every repo"* | that is the defect, stated as a requirement. a role the consumer links is how every repo gets it |
| a capability needs a trigger and no role provides one | 🔴 **ask what already triggers.** a boot is a trigger; a link is a trigger; a build is a trigger |
| rhachet relays a role's declared hook into a config | ✅ not a violation — that is the framework as courier, which is its job |

## 🔴 .the corollary — reach for an extant trigger before you invent one

the incident's chain was: *a gate needs a moment → no moment exists → invent a hook.* the second
step was false. **`roles boot` already fires once per role per session**, and the gate belonged
inside it.

⇒ so a framework hook is usually a **trigger** somebody wanted, reached for at the wrong layer.
name the trigger you actually need, then find the extant one — a boot, a link, a build, a role's
own declared hook — before you author a new one at a layer that owns no roles.

## 🟡 .the sole exception — the `.this` budget gate

a `.agent/repo=.this` boot that declares `budget.tokens` needs a stop hook to enforce it. rhachet
arms that one hook itself — `roles cost --all --when hook.onStop` — and supports no other
framework-owned hook. it keeps every property the rule protects except the declaration site:

| the property | how the gate keeps it |
|---|---|
| a human asked | 🔴 only a `.this` role whose `boot.yml` declares a budget arms it. no budget, no hook |
| a coordinate | relayed under the first budgeted role, `author: repo=.this/role=$slug` |
| a consumer can switch it off | delete the budget. the next `init --hooks` removes the entry |
| one sweep, never N | armed once per repo, since the sweep is repo-wide |

⇒ the usecase is the human's — the budget they wrote. the hook is the mechanism that budget means,
so rhachet couriers a declaration that lives in `boot.yml` rather than in a hook file. no peer may
copy this path: a new framework hook is still a blocker, and *"it is like the budget gate"* is the
trap to refuse.

## 🟡 .the peer question — a framework-grain BRIEF or SKILL

the same *"which role owns it?"* test applies, and it has two sanctioned answers rather than one:

| the artifact | where it goes |
|---|---|
| framework knowledge a **human reader** needs | 🔴 the **readme**, linked — as this repo already does |
| framework knowledge or capacity an **agent** needs | 🔴 **lift it into `rhachet-roles-rhachet`** — a real role, with a `boot.yml`, a budget, and a `roles link` a consumer can undo |

⇒ so *"rhachet itself has a thing to say"* never licenses a framework-owned declaration. it routes
to a doc a human opens, or to **the role that exists for exactly this** — `enroller` already carries
the framework's own briefs today.

## .the boundary

| a violation | not a violation |
|---|---|
| a hook entry rhachet's source writes on its own behalf | rhachet as **courier** for a hook a role declared |
| a hook attributed to no `repo=`/`role=` coordinate | a hook declared under `repo=.this/role=any` — a role |
| *"every repo needs this, so the framework declares it"* | *"every repo needs this, so every repo links the role"* |
| framework knowledge shipped as resident agent payload by rhachet | the same knowledge in the **readme**, or lifted into **`rhachet-roles-rhachet`** |

blocker: a hook declared by rhachet's own source, other than the `.this` budget gate · a sync path that writes a config entry
attributed to no role · a new framework hook authored where an extant trigger would serve.

⇒ see also: `rule.require.when-names-the-caller` (a hook-invoked command declares its CALLER, never
a policy) · `rule.always.reuse-pavement-before-improvise` (bhrain/learner — the braid this rule's
corollary prevents) · `define.agent-dir` (the `repo=`/`role=` coordinate every declaration owes).
