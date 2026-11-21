# F17 — a token held in memory across a kill window

## .the fork

`use` holds two refresh tokens only in memory for a moment each: the target's rotated token from
mint to install, and the prior account's token from install to stow. a throw in either window is
caught (the target is refiled, the stow fault names the lost login). a kill (SIGTERM, OOM, a cron
timeout) is not caught, and leaves one account to log in again.

- **A — keep the one-holder order.** each token has one holder at every step; a kill in a window
  costs one re-login, named by the next `get` as `dead` with the `set` fix
- **B — write ahead, under a slot mutex.** park the rotated target token and stow the prior one
  before the install, and hold a brain-auth slot mutex across `use` and every `get` slot read, so
  no peer spends a token the grove runs on

## .taken

A. the windows are each one local file write wide, and their worst case is a re-login that `get`
names with its fix. B makes every `get` wait on a box-wide mutex that a stuck `use` holds, and
reopens the order the vision settled (case=9: a token has one holder).

## .rework

dirty: B rewrites the order of `use`, adds a mutex every `get` slot read must take, and removes
`withBrainAuthSlotTokenRefiledOnAbort` and `isHeldByNewHolder`.

## .confidence

75% — the cost of a kill is small and loud, but a pool loop that runs `use` hourly from cron meets a
timeout kill more often than a human does.

## .where

`src/domain.operations/brain/auth/account/setBrainAuthAccountInUseAtGrove.ts`, steps 3–5;
raised by r11 nitpick.2 in review i004.

## .verdict

disputed — for the council.
