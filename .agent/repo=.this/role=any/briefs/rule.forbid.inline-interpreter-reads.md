# rule.forbid.inline-interpreter-reads

> **never reach for `node -e` to read a file, count rows, or tally a table. the dedicated tool exists,
> and it is the one a human can review.**

an **inline interpreter read** is any `-e` / `-c` one-liner handed to a runtime — `node -e`,
`python -c`, `perl -e` — whose whole job is to inspect repo state that `Read`, `Grep`, or `Glob`
already answers.

## .why — the tool is not chosen for capability, it is chosen for REVIEWABILITY

the repo already made this argument for `sed`, `cat`, and `grep`: a dedicated tool is what lets a human
see and approve the operation at a glance, and that is why `rmsafe`/`grepsafe`/`globsafe` exist at all.
an inline one-liner defeats that by construction:

- **it is opaque** — a human reads a line of program text rather than a named operation with named args
- **it leaves no artifact** — the logic is gone the moment the command returns, so a figure it produced
  cannot be re-derived or audited
- **it sidesteps every guard** — the safe wrappers bound reads to the repo (`rule.forbid.reads-outside-the-repo`);
  a runtime with a filesystem does not
- 🔴 **it produces a number with no checkable provenance.** a tally computed inline reads as a
  measurement and is a claim — the exact shape `rule.require.read-the-record-not-the-correlate` and
  `rule.require.refute-a-premise-with-a-measurement` grade

## .the test

> **would a dedicated tool answer this?**

yes → use it. there is no second question.

| when… | then… |
|---|---|
| you would `node -e` to read a file | 🔴 the strongest cue. `Read` |
| you would count matches | `Grep` with `output_mode: count` |
| you would find files by name | `Glob` |
| you would tally a markdown table's rows | `Read` it and count by hand — a table small enough to write is small enough to count |
| you would pipe two tools and the pipe does not compose | that is a **skill** (`rule.always.enskill-the-tactics-you-discover`), never a one-liner |
| the figure is needed on every round | the same answer, more so. a repeated read earns pavement |
| a tool refused you and the one-liner would work | the refusal is the signal. fix the invocation, or author the skill |

## .the boundary — a RUN is not a READ

the ban targets **inspection**, never execution:

| a violation | not a violation |
|---|---|
| `node -e` to read, count, or tally repo state | `npm run build`, `npx jest` — a declared command |
| `node -e` to grep a file a tool globs | a committed `.js` tool under `.agent/`, invoked by path |
| a one-liner that computes a figure for a claim | a test that asserts the same figure |

⇒ **the line that parts them: does the command inspect the repo, or does it run the repo's own
declared work?** inspect → a tool owns it. run → it is a command, and it stays.

🟡 a committed tool file is the sanctioned form of a computation too large to do by hand — it is
reviewable, re-runnable, and citable by path, which is every property the inline form lacks.

## .enforcement

blocker: `node -e` / `python -c` / any `-e` one-liner used to read a file, count matches, glob paths, or
compute a figure a claim then cites.
false positive: a declared command (`npm run *`, `npx jest`) · a committed tool invoked by path · a
runtime one-liner a human explicitly asked for.

## .see also

- `rule.always.enskill-the-tactics-you-discover` (bhrain/learner) — where a repeated read belongs
- `rule.forbid.reads-outside-the-repo` — the bound a safe wrapper enforces and a runtime does not
- `rule.require.read-the-record-not-the-correlate` — why an unciteable figure is a weak claim
- `rule.forbid.node-modules-bin-rhx` — its peer: reach the tool the way a consumer reaches it
