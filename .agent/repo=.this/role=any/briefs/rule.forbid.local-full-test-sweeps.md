# rule.forbid.local-full-test-sweeps

## .what

never run a full, unscoped test tier locally. **no `--thorough`.**

the full sweep is **cicd's job**. you are not cicd.

## .the tool already does the work

`git.repo.test` selects the impacted files for you. that is its default behavior — it matches the
files your change touched and runs those suites. it even shows you the match before it runs:

```sh
rhx git.repo.test --what unit                 # plan — shows the matched files
rhx git.repo.test --what unit --mode apply    # runs exactly those
```

⇒ you do **not** need to reason about blast radius, grep for importers, or hand-assemble a scope.
the tool bounds it. `--scope` is there to narrow **further** when you want a faster loop, never to
reconstruct a bound the tool already computed.

`--thorough` is the flag that **discards** that work and runs everything. that is the one thing
you do not want.

## .why

- **cicd already runs the full sweep, and runs it better** — every tier, every push, clean
  checkout. a local full sweep is a worse copy: it inherits your machine state, your daemons,
  your unlocked credentials
- **it costs minutes per tier for zero new information** — integration alone is ~3min, acceptance
  longer. those minutes buy a result cicd produces anyway, unasked
- **it steals the human's time** — a driver that idles on a redundant sweep is a driver that has
  stopped

## .the trap this rule exists to close

⚠️ a driver invents a **self-imposed "staleness guard"** — *"the last act before arrival must be
an unscoped run over the whole tree"* — and then honors it with the most expensive flag it has.

no route stone asks for that. no rule asks for that. it is a private ritual that wears the costume
of rigor and spends the human's minutes to buy reassurance. if a stone's guard wants proof, it
names the proof it wants.

the tell: the reach for `--thorough` almost always follows a change you have *already seen* — you
read the diff, you ran the scoped suites, they were green. the full run adds no fact. it adds
delay.

## .enforcement

- `--thorough` on a local run = **blocker**
- a whole-tier run assembled by hand to dodge this rule = **blocker**
- a self-imposed guard that mandates a full local sweep = **blocker** (delete the guard)

## .see also

- `howto.run-jest-tiers-locally.[lesson].md` — the tier flags and the `--scope` patterns
- `rule.forbid.blanket-resnap-after-rebase` — its peer: do not resnap wider than you verified
