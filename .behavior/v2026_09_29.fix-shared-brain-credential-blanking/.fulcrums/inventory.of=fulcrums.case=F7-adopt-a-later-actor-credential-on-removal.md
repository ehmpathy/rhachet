# F7 — adopt an actor credential on removal, only into a dead or absent shared login

## .the fork

when enroll removes a 1.48.0 brain-dir credential that is a real file: (a) discard it; (b) adopt it into `~/.claude` if its `expiresAt` is later; (c) adopt it always; (d) adopt it only when the shared login is dead or absent and the brain-dir login is live.

## .taken, and why

(d). a real file in a brain dir may be a refresh winner's — the only live token on the box, while `~/.claude` holds the spent one. (a) throws that token away. (b) and (c) write over a LIVE shared login with no lock, and a peer clone on another actor may refresh that login at the same instant: the unlocked write rolls its refresh back, and the rolled-back refresh token is already spent — the very blank this route cures. (d) writes only where no peer refreshes: a dead login (`refreshToken: ''`) is never refreshed, and an absent one has no reader to race. a live shared login is left alone, whatever its expiry; the brain-dir login is then removed.

adopt runs only once no clone of the actor lives, so no pre-cure process still refreshes the brain-dir file.

## .rework

clean.

## .confidence, and why it is not higher

85%. (d) can discard a live brain-dir login when the shared one is also live, even where the brain-dir token is the newer. that costs at most one `/login`, and only if the shared login later dies; a race-free write is worth that. a file from a different account is still adoptable into a dead or absent store. no value is ever logged.

## .where

case 3 `[t2]`; `isBrainDirAuthAdoptable`.
