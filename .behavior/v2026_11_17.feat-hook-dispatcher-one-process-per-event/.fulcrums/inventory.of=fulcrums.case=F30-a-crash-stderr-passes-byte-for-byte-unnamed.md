# F30 — a rule's crash stderr passes byte for byte, with no rule name added

## .the fork

peer review 5.3 i003 r011 nitpick.2: a rule that crashes with stderr (`[t2]`, `[t3]`, `[t30]`)
shows a bare `boom`. claude labels only the dispatcher, so with several rules on one event a human
cannot tell which rule crashed.

- **(a)** prefix or suffix each crash stderr with the rule's name
- **(b)** pass the rule's stderr byte for byte, as the rule wrote it; name the rule only where the
  rule wrote no stderr (`[t9]`) or timed out (`[t12]`)

## .taken

(b). the wish binds every rule to decide exactly as before, and each stdout and stderr a hook test
pins to still hold. a rule's stderr is part of that: the parity suites compare the dispatcher's
stderr against the rule run alone, byte for byte. a crash with stderr already says what failed, in
the rule's own words. a crash with none, and a timeout, say naught on their own, so the dispatcher
names those rules. `RHACHET_HOOKS_DISPATCH_TRACE` names every rule that ran and its exit, which
places any crash.

## .rework

clean. one printf per crash in `bin/hooks.dispatch.sh`, and the parity asserts would compare all but
that line.

## .confidence

85%. a name on each crash is more legible on a busy event. it breaks the byte parity the wish asks
for, and the trace already answers "which rule".

## .where

`bin/hooks.dispatch.sh` (the crash branch); `blackbox/cli/hooks.dispatch.acceptance.test.ts`
[t2] [t3] [t30]

## .verdict

open, best-guessed.
