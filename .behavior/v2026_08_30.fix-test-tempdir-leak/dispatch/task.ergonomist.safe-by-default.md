## the ask

add a brief to `role=ergonomist` that states the rule plainly:

> **safe by default, never safe by expense.**
>
> a guarantee that costs the caller an extra act is a guarantee that decays. folks skip the
> expense — not from carelessness, but because the expense is separable from the thing they came
> to do. over time, every separable step gets skipped.

the ergonomist already carries `rule.require.safe-by-default` ("the easy path must be the correct
path"), grounded in the pit of success. this ask **sharpens** it with a distinction that rule does
not yet name:

| shape | what it asks of the caller | what happens over time |
|---|---|---|
| **safe by default** | no extra act — the safe outcome is what the bare call produces | holds forever |
| **safe by expense** | one extra act, remembered every time | decays to unsafe |

`rule.require.safe-by-default` today reads mostly about **destructive** acts — gate the delete,
confirm the overwrite. the gap is the **constructive** case: an allocation whose reclaim is a
second call, a resource whose close is a second call, a registration whose deregistration is a
second call. each is "safe if you also do X", and each rots.

so this may land as a sharpening of the extant rule, or as its own
`rule.forbid.safety-by-expense` beside it — the ergonomist's call.

## the test to offer

> **can a caller get the unsafe outcome by doing less?**
>
> - yes → the safety is an expense; fold it into the default
> - no → the safety is structural

the corollary that makes it actionable: **fold the guarantee into the act that creates the
obligation.** if allocation creates the obligation to reclaim, the allocator owns the reclaim.
a caller who never sees the allocation is never asked to see the reclaim.

## the worked example that motivated this

filed from `ehmpathy/rhachet` behavior `v2026_08_30.fix-test-tempdir-leak` (see
`ehmpathy/rhachet#488`).

a test fixture allocated a temp dir and left the reclaim to "the OS". its doc comment asserted:

```
*   - OS handles cleanup (no manual teardown needed)
```

that premise was false. the measured result on one dev box, ~9 months on: **12,901** abandoned
fixture dirs against 2,484 of all else — ~84% of `/tmp`. costs, in the order they bit: a boot that
stalled for minutes while `systemd-tmpfiles-setup` walked `/tmp`; a ripgrep that blew a 20s timeout
on directory count alone; inodes never returned.

the near-miss worth recording: the first fix proposed was

```ts
const path = genTempDir({ slug });
setTempDirPrunable({ path });   // <-- the expense
```

two calls. the second is skippable, and the first is the one a caller actually wants — so the
second is exactly the kind of step that gets dropped on the next fixture someone writes. it is
**safe by expense**.

the shape it became instead:

```ts
const path = genTestTempDir({ slug });   // allocated ⇒ owned ⇒ reclaimed
```

one call. prunable is not an option the caller elects; it is what a test temp dir **is**. there is
no lesser act that reaches the unsafe outcome, so the safety cannot decay.

## why it deserves a brief, not just a code review comment

the expense form is seductive because it **reads** responsible — an explicit
`setTempDirPrunable(...)` looks like care, and a reviewer nods at it. the decay is invisible at
review time and only measurable in months. a named rule is what lets a reviewer flag the shape
before the first skip, rather than after the twelve-thousandth.

## suggested placement

`.agent/repo=ehmpathy/role=ergonomist/briefs/fundamentals/`, beside `rule.require.safe-by-default`,
with a `.see also` link in each direction. grounds in the same canon already cited in
`ref.ergonomics.fundamentals` — the pit of success, and norman's constraints.
