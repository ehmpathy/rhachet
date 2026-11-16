# F5 — `use` with no `--scope` refuses

## .the fork

- A. refuse, and list the three scopes
- B. default to `grove`, the common case

## .taken

A — the scopes differ in blast radius by orders of magnitude; a guess on the widest one is the
unsafe default (`rule.require.safe-by-default`). B is a one-line change if the wisher prefers it.

## .confidence — 65%

`rule.prefer.defaults-match-common-case` pulls toward B.

## .where

`1.vision.yield.md` → contract, q3
