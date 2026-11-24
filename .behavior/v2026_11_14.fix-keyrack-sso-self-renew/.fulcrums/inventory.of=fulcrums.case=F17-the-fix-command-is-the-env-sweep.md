# F17 — the status fix command fits the key's scope

## .the fork

the fix a marked key renders was `rhx keyrack unlock --owner <o> --env <e>`, with no `--key`, so it is refused for a sudo key (`sudo credentials require --key`).

- **a** — render `--key <full slug>` in every fix
- **b** — keep the env sweep for every scope
- **c** — keep the env sweep, and add `--key <key name>` for a sudo key alone

## .taken

c. a full slug in `--key` must match the repo manifest's org (`rule.require.full-slug-key-input`), so (a) breaks the fix for a machine-wide key of another org, which the sweep cures. (b) hands a sudo key a command that is refused. a sudo unlock takes the bare key name (`--env sudo --key <keyname>`, the cli's own hint), so (c) cures the sudo key and leaves every other scope's fix byte for byte.

## .rework

clean: one transformer (`asFixCommand`) and its unit snapshot.

## .confidence — 90%, why not higher

a machine-wide sso key of another org rests on the sweep; no test holds that scope's render apart.

## .where

- `src/domain.operations/keyrack/cli/asKeyrackStatusKeyBranch.ts`
- `src/domain.operations/keyrack/cli/asKeyrackStatusKeyBranch.test.ts` [case9]

## .verdict

taken in i003, on r009 blocker.1; open to the commander at the pr.
