# F26 — `status` is the renew's surface; unlock and get cues wait

## .the fork

i002 r010 blocker.2 and nitpick.2: `unlock` prints `expires in: Nm` with no renew cue, so a human reads the role session's life as the key's; and a `get` after a lapse reads as a never-unlocked key, with no lapse cue.

- **a** — add a renew leaf to the unlock render (`renew = on`, or `at its cap, ends at expiry`) and a lapse cue to the `get` refusal, in this pr
- **b** — keep the renew's state on `keyrack status`, the one surface the wish names ("`keyrack status` shows the renew and any lapse"), and add the unlock and get cues in a pr of their own

## .taken

b. the wish names one surface, and status carries every renew state, snapped at unit and acceptance grain. an unlock cue changes `src/contract` renders and every sso unlock snapshot, and a get cue changes the consumer's refusal, which other tools parse; each deserves its own review. the unlock render already reads true after F7: `expires in` is the role creds' real expiry, which is what the key holds at that moment.

## .rework

clean: one leaf in the unlock's `unlocked` arm from the daemon's `renewable` reply and `expiresAtCap`; one lapse line in the get refusal from the renew record.

## .confidence — 75%, why not higher

with a role session near 12h above the 9h cap (F1), a human may unlock and never learn the key will not renew unless they read status.

## .where

- `src/domain.operations/keyrack/cli/emitKeyrackKeyBranch.ts`
- `src/domain.operations/keyrack/session/unlockKeyrackKeys.ts`

## .verdict

open — to the commander at the pr.
