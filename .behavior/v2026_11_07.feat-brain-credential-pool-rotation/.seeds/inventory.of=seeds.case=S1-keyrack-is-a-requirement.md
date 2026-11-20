# seed S1 — keyrack is a requirement

source: ehmpathy/rhachet#575, comment by uladkasach, 2026-10-04

## .said

> - 🔴 every credential in a pool is pulled from **keyrack**. the pool (e.g. `.agent/.actor/*/brain/creds.yml`, plus custom pool sets) declares which keyrack keys it draws on; keyrack holds and serves the values. no credential lives in the pool file, an env var, or a side store of its own
> - done when: every credential in a pool is fetched from keyrack, and a pool that names a key keyrack does not hold fails loud with the `keyrack set` that fills it
> - the open question narrows to: which vault and key shape hold a long-lived token, and how a headless grove unlocks it with no human present

## .settled

a pool names keyrack keys and holds no secret. keyrack is the only store. an unfilled key is a loud
refusal that prints the exact `keyrack set` to fill it.

## .landed

- `1.vision.yield.md` — the pool shape and the absent-key refusal
- `1.vision.experience.case=_.md` — the absent-key cell
