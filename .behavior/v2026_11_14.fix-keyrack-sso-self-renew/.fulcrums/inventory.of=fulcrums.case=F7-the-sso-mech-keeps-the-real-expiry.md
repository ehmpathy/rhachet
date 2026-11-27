# F7 — the sso mech keeps the cli's real expiry, cast from its `+HH:MM` form

## .the fork

the aws cli writes `AWS_CREDENTIAL_EXPIRATION` with an offset suffix, `<date>T<time>+HH:MM` (measured, `rhx aws.export.probe`). `mechAdapterAwsSso.deliverForGet` gated it on `isIsoTimeStamp`, which accepts only the `Z` form (measured, `asIsoTimeStampFromAwsExpiration.test.ts` case1). so on a real host every sso grant stored a guess, now+55m, and the renew's "re-read the expiry" read the guess.

- **a** — leave the mech; the renew works off the guess (each renew moves the guess 55m out)
- **b** — cast the real value to `Z` form; keep the guess only where the value is absent or unparseable

## .taken

b. the vision's renew step is "re-read the expiry from the cli"; a guess is no read. `keyrack status` now shows the true life of the role creds.

## .rework

clean: one transformer (`asIsoTimeStampFromAwsExpiration`) and one call site. revert = restore the `isIsoTimeStamp` gate.

## .confidence — 88%, why not higher

it changes what unlock stores for every sso key, renew or not: a key may now read `expires in 20m` where it read `55m`. the cli re-derives at ~15m left, so an unlock never stores under ~15m; the daemon's renew moves it before the 5m line. a host with no daemon renew (an older daemon under version skew) would see the shorter, true number.

## .where

- `src/domain.operations/keyrack/adapters/mechanisms/aws.sso/asIsoTimeStampFromAwsExpiration.ts`
- `src/domain.operations/keyrack/adapters/mechanisms/aws.sso/mechAdapterAwsSso.ts`

## .verdict

open — to the commander at the pr.
