# rule.forbid.defective-defaults

> **a default path that always prints a defect is the defect.**

the default path is the run a human makes with no flags, on a repo in its normal state: a clean
`rhx init`, a clean `rhx upgrade`. if that run reports a problem every time, the report is wrong,
or the system left undone the work it reports. either way the human learns to ignore it, and the
one real defect it would someday name is lost in the noise.

```
👎  🎭 actors.yml
       └─ declared, unlinked → to link      # printed on every upgrade, before the link ran

👍  🎭 actors.yml
       └─ in sync                           # read after the link, so it names what is
```

## .why

- **a warn shown every run is a warn no one reads.** it trains the eye to skip the block, so the
  day it names a real defect, no one sees it
- **it names a state the system itself will fix.** a report read before the act it describes
  reports the plan as a fault. read it after, and the fault is gone
- **a printed fix is a chore handed to a human.** where the system knows the right act, it does
  the act. a two-fix hint tree on the default path asks a human to choose what the system could
  have chosen

## .the test

> **on a clean repo, with no flags, does this run print a warn, a fix, or a "to do"?**

yes → the default is defective. move the report after the act it describes, or have the system do
the act, until the clean run prints `in sync` or naught.

| when… | then… |
|---|---|
| a report prints before the act it reports | 🔴 move it after. report what is, never what is planned |
| a clean run prints a fix for the human | have the system do it, and print one line for the change |
| a block reads the same on every run | it carries no information. cut it, or make it state-dependent |
| a case genuinely needs a human call | ask once, where the human is; never print it on every run |

## .enforcement

- a default path whose clean run prints a defect, a warn, or a fix = **blocker**
- a report read before the act it describes, on the default path = **blocker**
- a hint tree on the default path where the system could act itself = **nitpick**

## .see also

- `rule.require.safe-by-default` (ergonomist) — the easy path is the correct path
- `rule.forbid.surprises` (ergonomist) — a warn on a clean run is a surprise
- `rule.forbid.colons-in-stdout` — the shape the one-line-per-change report takes

---

written by human + beaver 🦫
