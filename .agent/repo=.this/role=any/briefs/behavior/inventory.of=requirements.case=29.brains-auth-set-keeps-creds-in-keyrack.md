# requirement: `rhx brains auth set` keeps the credential in the keyrack, never printed or committed

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

`rhx brains auth set` stores a brain account's credential in the keyrack for later use. no verb of
`rhx brains auth` prints a credential value to stdout or stderr, and none writes one to a file under
the repo.

## .clamp

built 2026-11-14, under `.behavior/v2026_11_14.feat-brains-auth-use-get-set/`:

- `src/domain.operations/brain/auth/account/setBrainAuthAccount.ts` — login in a temp
  `CLAUDE_CONFIG_DIR`, removed after; the token goes to the keyrack only
- `src/domain.operations/brain/auth/account/slot/setBrainAuthSlotToken.ts` — the token reaches the
  vault through the mech's `question` seam, never stdin, argv or a log
- `src/domain.operations/keyrack/adapters/mechanisms/mechAdapterReplica.ts` — honors that seam;
  clamp `mechAdapterReplica.test.ts` [case3], red without the fix and green with it, 2026-11-14
- every render (`asBrainAuthUsageTree`, the set and use trees) reads domain objects that hold no token
- `src/domain.operations/keyrack/setKeyrackHostManifestHosts.ts` — every host entry is filed under
  the host mutex over a fresh read, so a token one process files is never dropped by a peer's write;
  clamp `setKeyrackKeyHost.integration.test.ts` [case12], red on the stale read, green with the fix

## .proof

owed — a test that runs `set`, `get`, and `use` and asserts no token value appears in their output
or in any file under the repo, and that the credential is readable from the keyrack afterward.

partial, held today:

- `src/domain.operations/brain/auth/account/slot/setBrainAuthSlotToken.integration.test.ts` — a
  token filed at an account's reach reads back whole from the real keyrack in a temp home, and a
  re-filed one replaces it
- `src/domain.operations/brain/auth/account/setBrainAuthAccount.integration.test.ts` and
  `getAllBrainAuthUsage.integration.test.ts` — the ops over a fake provider; the token lands in the
  keyrack, and the snapped trees and json carry no token label

## .source

the wisher, 2026-11-14, wish `.behavior/v2026_11_14.feat-brains-auth-use-get-set/0.wish.md`
(task ehmpathy/rhachet#747), `.done when`.
