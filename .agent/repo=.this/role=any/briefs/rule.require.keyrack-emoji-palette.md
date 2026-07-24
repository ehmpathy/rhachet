# rule.require.keyrack-emoji-palette

## .what

keyrack cli output has a **signature domain glyph** — the lock `🔐` — that roots its
**success / operation** output (`keyrack set`, `keyrack firewall`, `keyrack` list, the
set summary). `🔐` is keyrack **domain vocabulary**: it is deliberately **not** the
generic treestruct shell-root `🐚` and **not** any rhachet role mascot (the mechanic
seaturtle `🐢`, the driver owl `🦉`, the dreamer moon `🌙`, etc.).

when you read a keyrack **success** snapshot and see `🔐` where the generic treestruct
spec would show `🐚`, that is **correct and intended** — not a blemish. keyrack owns its
success root glyph.

**the one coexistence rule — success vs blocked.** keyrack does *not* claim `🔐` for
*every* line. its two output modes root differently, by design:

| mode | root | example |
|------|------|---------|
| **success / operation** | `🔐 {command}` (keyrack signature — no vibe header) | `🔐 keyrack set …`, `🔐 keyrack list`, `🔐 keyrack firewall`, `🔐 keyrack infra init` |
| **blocked / error** | `🐢 bummer dude…` + `🐚 {command}` (shared ergonomist standard) | `getKeyrackBlockedReport`, `getKeyrackInfraInitErrorReport` |

**every** keyrack success roots directly on `🔐 {command}` — no `🐢 cowabunga!`/`🐢 righteous!`
vibe header. this is the verified, uniform prior convention: `🔐 keyrack list`
(`asKeyrackListTreestruct.ts:12`), `🔐 keyrack firewall` (`getKeyrackFirewallOutput.ts:50`),
`🔐 keyrack set …` (every vault adapter). a keyrack success that opens with a `🐢` vibe header
**diverges** from this convention and is a defect — the fresh-vs-found signal a vibe header
might carry belongs in the leaf status phrases (`✨ created` / `👌 already found`), not the root.

the blocked path **intentionally** uses the repo-wide ergonomist blocked-output standard
(`rule.require.treestruct-output`: blocked → `🐢 bummer dude...`) so keyrack failures read
the same as every other tool's failures. so `🐢`/`🐚` in a keyrack **blocked report** is
**correct** — it is the shared failure grammar, not a mascot leak. only the **success**
root is keyrack's own (`🔐`).

## .why

- **keyrack is a credential domain.** a lock `🔐` reads instantly as "secrets / vault /
  credential setup." that recognizability is worth more, in this one domain, than
  conformance to the generic shell-root glyph.
- **domain glyphs are a feature, not drift.** the same way each rhachet role has a mascot
  that flavors its voice, keyrack — a domain, not a role — flavors its cli with a lock.
  the glyph tells the human *which tool speaks* before they read a word.
- **the confusion this rule prevents.** the generic treestruct rubric
  (`ergonomist/briefs/cli/rule.require.treestruct-output.md`) reserves `🐢` for the vibe
  header and `🐚` for the shell root. a reviewer who applies that rubric to a keyrack
  snapshot mis-reads keyrack's `🔐` root as "wrong emoji for the shell-root slot." it is
  not wrong — keyrack is exempt from the generic root glyph **by this rule**. keyrack's
  `🔐` is its shell root.

## .the palette

| glyph | slot | denotes |
|-------|------|---------|
| `🔐` | **success root** (keyrack's own, in place of `🐚`) | a keyrack credential operation (`keyrack set`, `keyrack firewall`, …) |
| `🐢 bummer dude…` + `🐚` | **blocked root** (shared ergonomist standard) | a keyrack failure report (`getKeyrackBlockedReport`, …) |
| `🔑` | status leaf | a granted key / access confirmed |
| `🔗` | value leaf | an auth url the human must visit |
| `🚫` | status leaf | access blocked |
| `🫧` | status leaf | credential absent / not yet filled |
| `👌` | confirm leaf | input received / choice accepted |
| `✓` / `✗` | status leaf | step succeeded / failed (shared with the generic spec) |
| `├─` `└─` `│` | branches | tree structure (shared with the generic spec) |

## .the boundary — keyrack glyphs vs rhachet glyphs

| you might confuse… | but it is… |
|--------------------|------------|
| `🔐` (keyrack **success** root) | keyrack's **domain** success glyph — NOT the treestruct `🐚`, NOT a mascot |
| `🐢 bummer dude…` + `🐚` (keyrack **blocked** root) | the **shared ergonomist** failure grammar — correct in keyrack, not a mascot leak |
| `🐢 cowabunga!` (a role's success header) | a **rhachet** role vibe — never a keyrack **success** root (keyrack uses `🔐` there) |
| `🦉` `🌙` etc. (role mascots) | **rhachet role** flavor — never in keyrack output |

the disjointness that matters: keyrack's **success** root is `🔐` and only `🔐` — never a
role mascot, never `🐢 cowabunga!`. keyrack's **blocked** root is the shared
`🐢 bummer dude…`/`🐚` failure grammar, same as every other tool. do not read the shared
blocked grammar as a mascot leak, and do not read the `🔐` success root as a treestruct
violation.

## .where

- all keyrack cli output: `src/domain.operations/keyrack/**`
- established across every vault + mechanism today (see .enforcement)

## .enforcement

`🔐` as the keyrack **success** root is the **established, repo-wide keyrack convention** —
it roots the success/operation output across every keyrack vault snapshot:

- `blackbox/cli/__snapshots__/keyrack.vault.awsIamSso.acceptance.test.ts.snap`
- `blackbox/cli/__snapshots__/keyrack.vault.1password.acceptance.test.ts.snap`
- `blackbox/cli/__snapshots__/keyrack.vault.osSecure.githubApp.acceptance.test.ts.snap`
- `blackbox/cli/__snapshots__/keyrack.vault.githubSecrets.acceptance.test.ts.snap`
- `blackbox/cli/__snapshots__/keyrack.sudo.acceptance.test.ts.snap`
- source of truth (success): `vaultAdapterOsSecure.ts`, `vaultAdapter1Password.ts`,
  `vaultAdapterGithubSecrets.ts`, `setupAwsSsoWithGuide.ts`, `getKeyrackFirewallOutput.ts`
- source of truth (blocked): `getKeyrackBlockedReport.ts`, `getKeyrackInfraInitErrorReport.ts`
  — these use `🐢 bummer dude…`/`🐚` **by design** (the shared ergonomist failure grammar)

therefore:

- a flag on keyrack's `🔐` **success** root as a treestruct blemish = **not a defect**
  (mis-applied generic rubric; keyrack owns its success root by this rule).
- a flag on `🐢 bummer dude…`/`🐚` in a keyrack **blocked** report as a "mascot leak" =
  **not a defect** (that is the shared ergonomist failure grammar, correct in keyrack).
- conversion of a single keyrack vault's `🔐` **success** root to `🐢`/`🐚` = **a defect** —
  it diverges that one vault from the other four and breaks the keyrack-wide convention.
  such a change is a keyrack-wide UX decision (wisher scope), not a per-behavior edit.

## .see also

- `ergonomist/briefs/cli/rule.require.treestruct-output.md` — the generic treestruct spec
  this rule carves keyrack's root glyph out of.
