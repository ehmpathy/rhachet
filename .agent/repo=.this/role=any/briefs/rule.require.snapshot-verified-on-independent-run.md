# rule.require.snapshot-verified-on-independent-run

## .what

a `--resnap` followed by a green run does **not** verify a snapshot. resnap writes what it
just observed, so the immediate re-run compares each value against itself and passes — even a
value that changes every run.

**a snapshot is verified only by a SECOND, INDEPENDENT run with no `--resnap`.**

## .why

a snapshot with volatile content is green exactly once — on the run that wrote it — and red
for everyone after. that is a flake shipped as a clamp: it looks like protection, and its
first act is to fail a colleague's CI on a change they did not make.

the trap is that the usual care ritual (resnap, then re-run to confirm) **cannot** catch it.
the confirm-run is not independent. so the discipline has to be explicit, because diligence
alone does not produce it.

> lived: a `keyrack status --json` snapshot passed its resnap+verify, then went red on the
> next independent run. `ttlLeftMs` is a live countdown and `socketPath` carries a per-daemon
> hash; neither was redacted. it surfaced only by luck — an unrelated dogfood's restore-run
> happened to be a second independent run.

## .the volatile fields to scan for

before you snap any payload, read it for values that differ per run:

| kind | examples seen in this repo |
|------|----------------------------|
| live countdowns | `ttlLeftMs`, `expires in` |
| per-process ids | pids, daemon socket hashes (`keyrack.4.<hash>.sock`) |
| paths | temp dirs, `/run/user/...`, home dirs |
| wall-clock | `createdAt`, `updatedAt`, `expiresAt`, `addedAt` |
| terminal noise | ansi/osc escapes, `\r`, width-dependent end-of-line pad |

`asSnapshotSafe` covers iso stamps and some paths — it does **not** cover bare-integer
countdowns, nor paths outside home / Users / runner-work. do not assume it is enough; read
the payload.

## .how

1. **check for a peer suite first.** if another suite already snaps this command, it has
   likely already solved the volatility. reuse its redaction rather than author a new one — a
   fresh attempt both duplicates and tends to miss a field.
2. **redact by parsed object, not by string scrub.** mutate `parsed.socketPath = '__REDACTED__'`
   rather than regex the text. a field rename then shows up as a visible diff instead of a
   silently-unredacted value.
3. **resnap, then run again without it.** the second run is the verification.
4. **prefer the dogfood cycle** (revert the code → snapshot red → restore → green). it proves
   the clamp bites (`rule.require.clamp-edge-cases`) *and* its restore-run is independent, so
   it catches this class for free.

## .enforcement

- a new snapshot claimed verified from a `--resnap` run alone = **blocker**
- a snapshot that carries an unredacted volatile field = **blocker**
- a new redaction authored where a peer suite already had one = **nitpick**

## .see also

- `rule.require.clamp-edge-cases` (mechanic) — the dogfood cycle this leans on
- `rule.require.snapshots.[lesson]` (mechanic) — why snapshots earn their place at all
- `blackbox/.test/infra/invokeRhachetCliBinary.ts` — `asSnapshotSafe`, `asPtySnapshotSafe`,
  and `asKeyrackStatusSnapshotSafe`, each with the reason for every replacement it makes
