# rule.forbid.reads-outside-the-repo

## .what

every read stays **inside the repo**. do not read host state — `/proc/loadavg`, `free`,
`~/.config`, ambient machine config — even when the read is trivially harmless and even
when it would inform a reasonable decision.

## .why

the boundary is enforced as a **line, not a risk assessment**. a line with no exceptions
holds; a line that admits harmless cases erodes one harmless case at a time, and each
erosion is individually defensible. the human declined a `/proc/loadavg` read on exactly
this ground, and named the boundary rather than the danger:

> *"not because it is dangerous (it is three numbers), but because it reads outside the
> repo, and the babysit safety test draws that line without exceptions so it does not erode
> one harmless case at a time."*

so the question to ask is never *"is this read dangerous?"* — a robot that asks that will
talk itself past the line every time. the question is *"is this path inside the repo?"*

## .the test

"does this path start inside the repo?"

- yes → read it
- no → do not, regardless of how harmless it looks

## .what to do instead — scope, do not measure

the common temptation is a host-load check before a heavy suite. there is no sanctioned
host-load check, and none is needed. when a suite feels slow, **narrow it**:

```bash
# 👎 measure the box
cat /proc/loadavg

# 👍 narrow the work
rhx git.repo.test --what acceptance --scope 'path://keyrack.session.acceptance'
rhx git.repo.test --what unit --scope 'name://case4'
```

a narrower scope is the remedy for a heavy suite. a capacity check is not — it reports that
the box is busy, and your work is no cheaper for it.

## ⚠️ .what this supersedes

an earlier practice told a robot to read host load (`/proc/loadavg`, zram fullness, swap
used vs total) before a heavy suite, and to decline the run when the box was saturated. the
**judgment** in that practice survives — weigh cost-of-run against value-of-run, and when a
run is declined, call it *"declined for machine safety"* rather than *"skipped"*. the
**measurement** does not. do not read host state to reach that judgment; scope the run
instead.

if a prior note, memory, or artifact still prescribes a loadavg/zram/swap check, it predates
this rule and this rule wins.

## .the one exception

there is none. if a genuine need arises, **ask** rather than read.

## .enforcement

- a read of any path outside the repo = **blocker**
- a host-capacity check (loadavg, free, swap) used to gate a test run = **blocker** —
  scope the run instead

## .see also

- `rule.forbid.node-modules-bin-rhx` — the companion boundary, on which binary to invoke
- `howto.test-local-rhachet.md` — why the bare form runs a published build, not your branch
- `rule.forbid.grepsafe-path-globs` — the safe-read tools that keep reads repo-scoped
