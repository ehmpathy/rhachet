# F10 — where the api-billed notice prints, the no-login hint is held back

## .the fork
- (a) with a key in the env and no shared login, print the api-billed notice alone
- (b) print both lines, as before: the notice, and `ℹ no claude login … run /login`
- (c) print both, with the no-login line reworded to say a login only helps once the key is unset

## .taken
(a). claude code ranks the key above a login, so `/login` changes naught about the bill; the two lines read as two fixes where one is the fix. the notice already names the one move, `unset ANTHROPIC_API_KEY, then enroll again`, and the next enroll, keyless, prints the no-login hint if no login exists then.

## .what (a) gives up
a seat that unsets the key learns of its absent login one enroll later.

## .rework
clean: one guard in `invokeEnroll.ts`, and two `then`s in `enroll.acceptance` [case2f].

## .confidence = 85%
(c) may read better to a human who means to keep the key for this clone and log in for the next.

## .where
`src/contract/cli/invokeEnroll.ts` (the absent-line gate); proof `blackbox/cli/enroll.acceptance.test.ts` [case2f], red with the guard off.
