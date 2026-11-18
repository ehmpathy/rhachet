# F14 — a rule's crash keeps its non-block verdict; only the dispatcher's own fault fails closed

## .the fork

a PreToolUse rule crashes (exit 1) or times out (124). what does the dispatcher exit?

- **(a)** the rule's own code: a non-block, as claude reads that rule's crash today; the dispatcher's
  OWN fault (absent manifest) exits 2
- **(b)** exit 2 on any rule crash, per the PreToolUse clause of `rule.require.qualified-error-headers`

## .taken

(a). the wish's outcome is that every rule decides exactly as it does today, each exit code a hook
test pins included. under claude each rule is its own hook, and a rule that crashes exits 1: claude
permits the call and shows the hook error. the dispatcher keeps that verdict per rule, and keeps the
crash visible (stderr; json `systemMessage` beside a decision; after the blockers beside a block).

`rule.require.qualified-error-headers` governs a hook's OWN malfunction, so a hook author cannot fail
their gate open. the dispatcher honors it for its own faults: an absent manifest exits 2. a rule's
crash is that rule's verdict, which the dispatcher carries, never one it invents. to fold every rule
crash to 2 would also turn one broken rule into a block on every Bash call, for every seat — a
change in behavior the wish rules out, and one a role author can already choose inside the rule.

## .rework

clean: one branch in the merge (`exit 2` where `exit "$__rhx_dispatch_crashed"` stands), plus the
`[t2]` and `[t3]` expectations.

## .confidence

88%. the rule's text reads as a hook-author rule; if the director reads it as one that governs a
dispatcher of other hooks too, (b) is the clean rework above.

## .where

`bin/hooks.dispatch.sh` (merge); `blackbox/cli/hooks.dispatch.acceptance.test.ts` `[t2]`, `[t3]`

## .verdict

open, for the director at the pr.
