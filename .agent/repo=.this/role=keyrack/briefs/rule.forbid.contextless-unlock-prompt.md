# rule.forbid.contextless-unlock-prompt

## .what

a keyrack passphrase dialog MUST name the full scope of what it unlocks and who for. each
scope dimension narrows a DIFFERENT set of keys, so the human cannot judge what they authorize
unless every one is shown. the dialog MUST show:

- **owner** — the keyrack identity the unlock is for (e.g. `ehmpath`)
- **org** — the org whose keys are in scope (e.g. `ehmpathy`)
- **tree** — the worktree that minted the request, as repo + branch (e.g.
  `rhachet · vlad/keyrack-identity-unlock`). use **tree**, not repo: a tree already contains the
  repo AND the branch, so it names the exact checkout, not just the project
- **env** — the target env whose keys are in scope (e.g. `test`, `prep`, `prod`, `sudo`, `all`)
- **reach?** — the reach scope, WHEN one applies (e.g. `@this` vs `@all`)
- **key?** — the ssh key path the passphrase applies to, WHEN known (e.g. `~/.ssh/ehmpath`)
- **code** — a per-invocation visual-match code the CLI ALSO prints, so the human can confirm
  THIS dialog belongs to THIS command

owner, org, tree, env, and the code are ALWAYS shown. reach and key are shown when they apply
(a `?` field). the five scope words matter because each dictates a different set of keys: the
same passphrase, under a different owner/org/tree/env/reach, authorizes a different unlock —
so all in-scope dimensions must be visible before the human commits the passphrase.

a bare `Enter passphrase for /path/to/key:` — the stock ssh-add/ssh-keygen prompt — is
**forbidden**. the human must never be asked to type the passphrase that unlocks the whole
manifest without knowing what they authorize.

## .why

the passphrase unlocks the key that derives `K`, and `K` decrypts the ENTIRE host manifest —
every credential beside it. so the prompt is the single highest-value authorization moment in
keyrack. a contextless prompt turns it into a **confused-deputy / phishing** hole:

- **no what** — the human cannot tell an `ehmpath` unlock from a `foreman` unlock, a `test`
  unlock from a `prod` one. they authorize blind.
- **no who** — a malicious or compromised process on the box can pop a lookalike
  `gnome-ssh-askpass` dialog at the moment a real unlock is expected, harvest the passphrase,
  and unlock the whole manifest. the human, primed to type, types.
- **no proof-of-origin** — with no anchor tying the dialog to a command the human ran, ANY
  dialog is indistinguishable from the real one.

the vision's whole q2 mandate (dialog over tty) exists to keep the passphrase off a
keylogger-reachable surface. that guarantee is HALF the story — keeping the secret off the tty
is worthless if the human hands it to a spoofed dialog instead. attribution + a visual-match
code closes the other half.

## .the visual-match code

the CLI prints a short per-invocation code to stderr, and the SAME code renders in the dialog:

```
$ rhx keyrack unlock --owner ehmpath
🔐 unlock code: 7Q2F   (confirm this matches the dialog before you type)
```

```
🔐 keyrack unlock
   owner: ehmpath
   org:   ehmpathy
   tree:  rhachet · vlad/keyrack-identity-unlock
   env:   test
   reach: @this
   key:   ~/.ssh/ehmpath
   code:  7Q2F

   passphrase: [________]
```

(`reach` and `key` lines appear only when they apply; owner, org, tree, env, and code are
always present.)

the human eyeballs the two codes before they type. a spoofed dialog cannot know the code (it is
freshly minted, only printed to the terminal of the real command), so it shows a wrong code or
none — and the mismatch is the tell. this is **display-only** defense (the human compares; they
do not type the code back), which is why it works with `gnome-ssh-askpass`, whose single return
line is the passphrase.

## .how

keyrack points `SSH_ASKPASS` at a keyrack-owned **shim** it writes into its private 0700 dir,
not at `gnome-ssh-askpass` directly. the shim rewrites the stock `argv[1]` prompt into the
attributed message above (owner/org/tree/env/reach?/key?/code — all known to keyrack at
invocation), then calls the real dialog with it. the shim + code live only for the one
invocation, in the 0700 dir the extant ephemeral lifecycle already reaps.

the `KEYRACK_ASKPASS` override still points at the REAL dialog; keyrack wraps it in the shim, so
an operator's custom dialog path is honored AND attributed.

## .enforcement

- a keyrack passphrase dialog that renders the stock `Enter passphrase for …:` (no owner, no
  org, no tree, no env) = **blocker**
- a dialog that omits any ALWAYS-shown scope word (owner, org, tree, env) — or drops a reach/key
  that DID apply to the invocation = **blocker** (a partial scope misleads worse than none)
- an unlock that prompts with no per-invocation visual-match code printed to the CLI = **blocker**
- a dialog whose code does not match the code the CLI printed = **blocker** (a wiring defect that
  defeats the whole check)
- a new prompt path that bypasses the shim and calls `gnome-ssh-askpass` directly = **blocker**
  (it would render the stock contextless prompt)

## .see also

- the keyrack-identity-unlock vision q2 (`define.why-ssh-askpass.md`) — the dialog-over-tty
  mandate this rule completes: off-the-tty is half; attributed + code-matched is the other half.
- `rule.require.os-secure-seals-to-host-manifest.md` — why one passphrase unlocks EVERYTHING
  beside the manifest, which is why the prompt is the highest-value authorization moment.
