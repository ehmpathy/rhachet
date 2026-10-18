# F9 — the fix lines this change touches name every flag they need

## .the fork

two fix lines this change touches carried shapes a human may trip on:

- the `get` absent fix line for a declared key (`getKeyrackKeyGrant.ts`) read `rhx keyrack set --key K --env E[ --org O]` — no `--vault`, which `set` requires
- the transient-fault retry tip (`asKeyrackErroredKeyTip.ts`) read `rhx keyrack unlock --env E[ --org O]` — no `--key`, so it re-ran the whole sweep

should this route repair both shapes, or add only the `--org` its wish needs?

## .taken — repair both shapes here

a vault-less fix line sits on the member path this change routes humans down, so the friction lands on the allowlist's own users:

- every `set` fix line carries `--vault`: the host entry's own vault for a `lost` or `remote` key, else `inferKeyrackVaultFromKey`, else a `<vault>` placeholder the human fills
- the retry tip carries `--key <name>` and `--owner`, so a transient fault re-runs one key, never the whole sweep

## .rework — clean

each repair is a one-segment edit at one site plus a resnap of the suites that pin it. no caller hardens against the current shape.

## .confidence — 85%, and why it is not higher

the `--vault` repair changes the default `get` absent render, so every suite that snaps an absent `get` moves with it. a wisher who wants the diff bounded to the allowlist's own files could prefer the repair in its own pr.

## .where

- `src/domain.operations/keyrack/getKeyrackKeyGrant.ts` (the absent fix line)
- `src/domain.operations/keyrack/cli/asKeyrackErroredKeyTip.ts` (the retry tip)

## .verdict

repaired here.
