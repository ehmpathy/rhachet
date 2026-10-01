# F14 — older errno checks converge as they are touched, not in this diff

## .the fork

this route adds `isErrnoEexist` beside `isErrnoEnoent` in `src/infra/filesystem/`. about fifteen older call sites elsewhere in the repo still read `error.code` through an ad-hoc cast. the route may (a) use the named checks in its own code and leave the older sites, or (b) sweep every older site onto the named checks in this diff.

## .taken, and why at the time

(a).

- the older sites sit in files this change does not otherwise touch; a sweep widens the diff into unrelated modules and their reviewers
- the wish is the shared-login blank; the errno idiom is unrelated to it
- the named checks exist and are tested, so each older site converges cheaply the next time its file is opened

## .rework

clean — each site is a one-line swap; a later sweep via `sedreplace` touches no contract.

## .confidence, and why it is low

85%. two idioms for one check coexist until the sweep lands; a council may prefer to pay it now.

## .where

`src/infra/filesystem/isErrnoEexist.ts`, `isErrnoEnoent.ts`; review i006 r011 point.3.
