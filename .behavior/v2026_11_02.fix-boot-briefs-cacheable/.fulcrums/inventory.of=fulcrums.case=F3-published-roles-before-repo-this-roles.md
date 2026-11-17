# F3 — published roles render before repo=.this roles, split by the boundary line

## .the fork
keep today's order (by role slug alone; `.this/any` renders first) or put every published role before
every `repo=.this` role, with a `__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__` line between them.

## .taken, why
published first, split by the line. published bytes change only on upgrade; local briefs change on any
branch. claude splits a system prompt at that line into two blocks, each with its own breakpoint
(documented, v2.1.275+), so a local edit re-writes only the tail. PR #398's wish asked for this order too.

## .rework
clean: one sort key in `asRoleRefsInEnrollmentOrder`, one line in the render; the boot snapshot moves once.

## .confidence, why low
80%. the split's breakpoint count is unmeasured; the api allows four, and the measure shows two in the
system block already plus one on the last message (open question 2). without a split, the reorder is still
harmless.

## .where
`1.vision.yield.md` · `1.vision.experience.case=5.*`

## .verdict
ruled yes by the wisher at the `1.vision` approval, 2026-11-02 (seed S1). built in `5.1.execution`.
