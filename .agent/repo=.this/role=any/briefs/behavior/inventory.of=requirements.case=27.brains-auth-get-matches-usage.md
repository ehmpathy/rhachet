# requirement: `rhx brains auth get` shows the windows `brains.auth.usage` shows, per account

part of the [requirements inventory](./inventory.of=requirements._.md).

## .the requirement

for each account stored in the keyrack, `rhx brains auth get` shows every window the dev-env-setup
`brains.auth.usage` read shows — the session window and the week window — each with its used share,
its reset, and the saved resets. the values match that read for the same account at the same time.
the read goes through the brain's own adapter (the BrainCli), not a side command.

## .clamp

built 2026-11-14, under `.behavior/v2026_11_14.feat-brains-auth-use-get-set/`:

- `src/domain.operations/brain/auth/account/getAllBrainAuthUsage.ts` — the grove's signed-in
  account, then each parked account, read through the claude adapter
- `src/domain.operations/brain/auth/account/claude/asBrainAuthUsageFromClaudeReply.ts` — the same
  `five_hour` → session and `seven_day` → week fields and `cedar_ember` grants `brains.auth.usage`
  reads; drift fails loud
- `src/contract/cli/invokeBrainsAuthGet.ts` — tree and `--output json`

partial proof (shape only, no real account): `asBrainAuthUsageFromClaudeReply.test.ts`,
`asBrainAuthUsageTree.test.ts`, `asClaudeReplyStatus.test.ts` — green 2026-11-14.

## .proof

owed — a test against at least two real claude subscriptions that compares `get` per account and
per window with the `brains.auth.usage` read.

## .source

the wisher, 2026-11-14, wish `.behavior/v2026_11_14.feat-brains-auth-use-get-set/0.wish.md`
(task ehmpathy/rhachet#747), `.done when`.
