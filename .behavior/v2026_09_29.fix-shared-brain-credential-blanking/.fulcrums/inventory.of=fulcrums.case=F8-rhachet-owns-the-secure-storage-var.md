# F8 — rhachet owns the secure-storage var

## .the fork

when the caller env already sets `CLAUDE_SECURESTORAGE_CONFIG_DIR`: (a) keep the caller's value; (b) set `""` after the caller env, over it.

## .taken, and why at the time

(b). a stray value splits the store and restores the race silently; `CLAUDE_CONFIG_DIR` is already set the same way. claude-code's own teammate spawn sets the var unconditionally too.

## .rework

clean — a per-subscription store (S2) would change the value rhachet sets, not the ownership.

## .confidence, and why it is low

75%. a human who set the var on purpose loses it in clones with no warn.

## .where

case 1 `[t0]`; `asBrainCliSpawnEnv`.
