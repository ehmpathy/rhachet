# F23 — the per-call file names stay pid-keyed, under noclobber

## .the fork

noclobber stops a planted symlink at a predictable name (r011 blocker.1). the same predictable
name means a file left behind by a SIGKILLed dispatcher refuses one later call that reuses its pid.

- **(a)** keep `$$`-keyed names under noclobber; a stale file costs one refused call, with the fix
  named
- **(b)** add a random part to the name (`$$.${RANDOM}${RANDOM}`), so a stale file never collides

## .taken

(b), at the i007 review. each name is `$$.${RANDOM}${RANDOM}.`, still under noclobber; a create
that fails takes a fresh name, and three failures refuse with the fix named. it costs no fork. a
stale file, or a pid reused across namespaces, never meets a later call's name.

## .rework

clean: drop the random part and the retry loop in `bin/hooks.dispatch.sh`; `[t20]` then asserts the
refusal again.

## .confidence

95%. `[t20]` plants a symlink at the pid-keyed name: the dispatcher takes its own name, runs the
rule, and leaves the victim and the planted entry untouched. `[t19]` still covers the refusal.

## .where

`bin/hooks.dispatch.sh` (`__rhx_dispatch_base`, `set -C`, the three-try loop).

## .verdict

taken (b), per peer review i007 r011 nitpick.6; the dream that held (b) is closed.
