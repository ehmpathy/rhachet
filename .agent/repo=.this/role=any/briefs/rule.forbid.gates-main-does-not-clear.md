# rule.forbid.gates-main-does-not-clear

## .what

do not hold a branch on a bar that **`main` does not clear**. before you file any *"this is not
fully proven, so it blocks"*, check what `main` proves about the same seam. if `main` ships with
the gap, your branch may ship with it too — **named**, never silently.

the question a buttonup asks is *"does this regress what `main` guarantees?"* — never *"is this
perfect?"*

## .why

a branch is graded against the trunk it merges into, not against an ideal. a gap the trunk already
carries is **repo debt**, and repo debt is a wisher's item — never a hold on the stone that
happened to make it visible.

the failure mode is quiet and self-serving: you look hard at your own diff, find a seam that is not
fully verified, and grade it a blocker. it reads as rigor. it is actually a **self-imposed gate**,
and it spends a human's attention on a bar nobody set.

⚠️ and the worst part: **the branch that discloses a gap gets blocked, while the trunk that hides
the same gap ships.** that inverts the incentive exactly backwards — it punishes the disclosure.

## .the incident

a vault acceptance suite. this branch converted it from a **mock** (a replaced `gh` binary on
`PATH`) to a **swap** (the real `gh` binary driven against a local HTTPS stand-in). strictly
stronger: the real client stack — auth, http, json, exit codes — now runs.

one hop stayed unexercised: the `PUT`/`DELETE` write to real github, which needs a repo-admin
token. I named it honestly in the yield, then **held the stone on it** and escalated to a human as
*"a credential I cannot mint."*

one `git show` refuted the hold. `main`'s write hop, verbatim:

```bash
  "secret set "*)
    # gh secret set NAME --repo OWNER/REPO
    # reads secret from stdin, succeeds silently
    cat > /dev/null  # consume stdin
    exit 0
    ;;
```

it swallows stdin and exits 0. **the identical gap — and `main` does not name it.**

| | `main` | the branch I blocked |
|---|---|---|
| the binary under test | replaced (a mock) | real |
| the client stack | never exercised | fully exercised |
| the write hop to the real service | **not exercised** | **not exercised** |
| is the gap disclosed? | no | yes |

⇒ the branch narrows the gap **and** discloses the remainder, and I graded it a blocker on the
remainder. a disclosure is not a regression.

## .the test

before a *"not fully proven ⇒ blocked"* verdict, run the parity probe:

```sh
git show origin/main:<the file>          # what does main actually assert here?
git diff origin/main -- <the file>       # what did this branch change about it?
```

then answer:

| what `main` does | your branch does | verdict |
|---|---|---|
| proves it | does not prove it | ⛔ **regression — a real blocker** |
| does not prove it | does not prove it either | ✅ **carry it forward, named** — repo debt, not a hold |
| does not prove it | proves it, or narrows it | ✅ **an improvement** — never a hold |

- **a regression** → block, and name the exact fix
- **parity or better** → land it, record the residue for a wisher, and move
- **unprobed** → you have not earned the verdict yet

## .the caveat — this is not a licence to match main's floor

parity is the bar for a **hold**, not the bar for the **work**. if a gap is cheap to close, close
it — that is exactly what a swap over a mock was. what this rule forbids is the *escalation*: to
stop the road and spend a human on a bar the trunk never set.

and the residue must be **named**, every time. an unnamed gap carried forward is
`rule.forbid.failhide` at the report layer.

## .enforcement

- a stone held on a gap `main` carries too, filed without the parity probe = **blocker**
- an escalation to a human on a self-imposed bar the trunk does not set = **blocker**
- a gap carried forward at parity, but **unnamed** in the yield = **blocker**
- a real regression against `main`, waved through as "parity" = **blocker**

## .see also

- `rule.require.check-the-precondition-before-you-escalate` — the twin: probe before you halt
- `rule.forbid.mechanism-inferred-from-outcome` — the inference defect underneath both
- `rule.always.spend-own-levers-before-escalation.md` — the general form
- `rule.forbid.scope-leaks` — the mirror: do not *widen* to fix repo debt either
