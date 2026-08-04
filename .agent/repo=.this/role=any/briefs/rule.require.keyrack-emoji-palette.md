# rule.require.keyrack-emoji-palette

## .what

keyrack cli output has a **signature domain glyph** — the lock `🔐` — that roots **all** of
its output, both **success / operation** (`keyrack set`, `keyrack firewall`, `keyrack` list,
the set summary) AND **blocked / error** (`getKeyrackBlockedReport`,
`getKeyrackInfraInitErrorReport`). `🔐` is keyrack **domain vocabulary**: it is deliberately
**not** the generic treestruct shell-root `🐚` and **not** any rhachet role mascot (the
mechanic seaturtle `🐢`, the driver owl `🦉`, the dreamer moon `🌙`, etc.).

when you read a keyrack snapshot — success OR blocked — and see `🔐` where the generic
treestruct spec would show `🐚` (or where the shared failure grammar would show a `🐢`
mascot header), that is **correct and intended** — not a blemish. keyrack owns its root glyph
across every output mode.

**both output modes root on `🔐`, by design:**

| mode | root | example |
|------|------|---------|
| **success / operation** | `🔐 {command}` (keyrack signature — no vibe header) | `🔐 keyrack set …`, `🔐 keyrack list`, `🔐 keyrack firewall`, `🔐 keyrack infra init` |
| **blocked / error** | `🔐 {command}` + `└─ ✋ blocked: …` (keyrack signature — no seaturtle header) | `getKeyrackBlockedReport`, `getKeyrackInfraInitErrorReport` |

**every** keyrack output roots directly on `🔐 {command}` — no `🐢 cowabunga!`/`🐢 righteous!`
success vibe header, and no `🐢 bummer dude…` blocked vibe header. a keyrack line that opens
with any `🐢` mascot header **diverges** from this convention and is a defect. keyrack is a
credential **domain**, not a rhachet **role**, so no role mascot belongs in its output — the
fresh-vs-found / blocked signal belongs in the leaf phrases (`✨ created` / `👌 already found`
/ `✋ blocked`), not a mascot at the root.

the blocked path keeps the shared **`✋ blocked: {message}`** node and the fix-naming **`hint`**
leaves (the repo-wide ergonomist recovery grammar, `rule.require.errors-name-the-fix`) — only
the **root** is keyrack's own `🔐`, in place of the shared `🐢 bummer dude…`/`🐚` header. so
`🐢` never appears in keyrack output at all.

## .why

- **keyrack is a credential domain.** a lock `🔐` reads instantly as "secrets / vault /
  credential setup." that recognizability is worth more, in this one domain, than
  conformance to the generic shell-root glyph or the shared mascot failure header.
- **domain glyphs are a feature, not drift.** the same way each rhachet role has a mascot
  that flavors its voice, keyrack — a domain, not a role — flavors its cli with a lock.
  the glyph tells the human *which tool speaks* before they read a word.
- **no mascot leak, success or blocked.** a role mascot (the mechanic `🐢`) at the root of a
  credential-domain tool blurs which thing speaks. keyrack's root is its own lock, uniformly,
  so a human never mistakes a keyrack failure for a mechanic-role message.
- **the confusion this rule prevents.** the generic treestruct rubric
  (`ergonomist/briefs/cli/rule.require.treestruct-output.md`) reserves `🐢` for the vibe
  header and `🐚` for the shell root. a reviewer who applies that rubric to a keyrack
  snapshot mis-reads keyrack's `🔐` root as "wrong emoji for the shell-root slot." it is
  not wrong — keyrack is exempt from the generic root glyph **by this rule**. keyrack's
  `🔐` is its shell root, in both success and blocked output.

## .the palette

| glyph | slot | denotes |
|-------|------|---------|
| `🔐` | **root** (keyrack's own, in place of `🐚` / a `🐢` mascot header) | a keyrack credential operation OR a keyrack failure (`keyrack set`, `keyrack firewall`, a blocked report, …) |
| `✋` | blocked leaf | the blocked node under the `🔐` root on a failure (`✋ blocked: {message}`) |
| `🔑` | status leaf | a granted key / access confirmed |
| `🔗` | value leaf | an auth url the human must visit |
| `🚫` | status leaf | access blocked |
| `💥` | status leaf | a per-key **malfunction** in a batch unlock — a live fault (throttle, network, decrypt-denied, no-identity) that was isolated so the batch continued (the shared `MalfunctionError` glyph; distinct from `🚫` access-blocked and `🫧` absent) |
| `🫧` | status leaf | credential absent / not yet filled |
| `👌` | confirm leaf | input received / choice accepted |
| `✓` / `✗` | status leaf | step succeeded / failed (shared with the generic spec) |
| `├─` `└─` `│` | branches | tree structure (shared with the generic spec) |

## .the boundary — keyrack glyphs vs rhachet glyphs

| you might confuse… | but it is… |
|--------------------|------------|
| `🔐` (keyrack root, success OR blocked) | keyrack's **domain** glyph — NOT the treestruct `🐚`, NOT a mascot |
| `🐢 cowabunga!` (a role's success header) | a **rhachet** role vibe — never a keyrack root (keyrack uses `🔐`) |
| `🐢 bummer dude…` (a role's failure header) | a **rhachet** role vibe — never a keyrack root (keyrack uses `🔐`) |
| `🦉` `🌙` etc. (role mascots) | **rhachet role** flavor — never in keyrack output |

the disjointness that matters: keyrack's root is `🔐` and only `🔐` — never a role mascot,
never `🐢 cowabunga!`, never `🐢 bummer dude…`, in success or in a blocked report. do not read
the `🔐` root as a treestruct violation; do read any `🐢` header in keyrack output as a defect.

## .where

- all keyrack cli output: `src/domain.operations/keyrack/**`
- success roots: `vaultAdapterOsSecure.ts`, `vaultAdapter1Password.ts`,
  `vaultAdapterGithubSecrets.ts`, `setupAwsSsoWithGuide.ts`, `getKeyrackFirewallOutput.ts`,
  `asKeyrackListTreestruct.ts`
- blocked roots: `getKeyrackBlockedReport.ts`, `getKeyrackInfraInitErrorReport.ts`

## .enforcement

`🔐` as the keyrack root — success AND blocked — is the **established, repo-wide keyrack
convention**. therefore:

- a flag on keyrack's `🔐` root (success or blocked) as a treestruct blemish = **not a defect**
  (mis-applied generic rubric; keyrack owns its root by this rule).
- a `🐢` mascot header (`🐢 cowabunga!` on success, `🐢 bummer dude…` on a blocked report) in
  keyrack output = **a defect** — keyrack roots on `🔐`, no role mascot.
- conversion of a single keyrack vault's `🔐` root to `🐢`/`🐚` = **a defect** — it diverges
  that one vault from the others and breaks the keyrack-wide convention. such a change is a
  keyrack-wide UX decision (wisher scope), not a per-behavior edit.

## .see also

- `ergonomist/briefs/cli/rule.require.treestruct-output.md` — the generic treestruct spec
  this rule carves keyrack's root glyph out of.
