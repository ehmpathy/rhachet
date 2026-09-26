# define.unlock-prompt-invariants

## .what

the invariants the keyrack passphrase prompt MUST hold. the prompt is the single highest-value
authorization moment in keyrack — one passphrase derives `K`, and `K` decrypts the ENTIRE host
manifest and every credential sealed beside it. so the prompt is not a mere passphrase field; it
is a human who authorizes a whole-manifest unlock. these invariants exist so that authorization
is informed, attributed, and un-spoofable.

## .the invariants

### 1. off the tty (q2 — extant)

the passphrase is typed into the Wayland-native gnome dialog, never the terminal, where a
keylogger or compromised shell could capture it. this is the vision q2 mandate
(`define.why-ssh-askpass.md`). it is necessary but NOT sufficient — invariants 2 + 3 complete it.

### 2. attributed — the human sees the full scope

the dialog names every scope dimension that narrows the set of keys the unlock covers. each of
these dictates a DIFFERENT set of keys, so all in-scope dimensions must be visible:

| word | what it scopes | always shown? |
|------|----------------|---------------|
| owner | the keyrack identity | yes |
| org | the org whose keys are in scope | yes |
| tree | the worktree (repo + branch) that minted the request | yes |
| env | the target env (`test`/`prep`/`prod`/`sudo`/`all`) | yes |
| reach | `@this` vs `@all` | when it applies |
| key | the ssh key path the passphrase is for | when known |

use **tree**, not repo: a tree contains the repo AND the branch, so it names the exact checkout.
the same passphrase, under a different owner/org/tree/env/reach, authorizes a different unlock —
so a prompt that hides any in-scope dimension asks the human to authorize blind.

### 3. un-spoofable — the visual-match code

the CLI prints a fresh per-invocation code to its terminal, and the dialog shows the SAME code.
the human confirms they match before they type. a spoofed/background dialog cannot know the code
(minted fresh, printed only to the real command's terminal), so it shows a wrong code or none,
and the mismatch is the tell.

this is **display-only** by necessity: the human COMPARES the codes, they do not type the code
back. gnome-ssh-askpass returns exactly one line (the passphrase), so a type-the-code-back
handshake would need a bespoke dialog and would forfeit the gnome-isolation guarantee of q2. the
visual match gets the anti-spoof value while it keeps the sanctioned dialog.

### 4. one prompt, per invocation, then gone (q5 — extant)

the ephemeral agent means the dialog pops once per invocation and the key dies with the process.
no persistent agent, no reusable socket, zero cross-invocation reuse (vision q5).

## .how these compose

off-the-tty (1) keeps the secret off a keylogger surface. attribution (2) tells the human WHAT
they authorize. the code (3) proves the dialog is the real one. ephemerality (4) ensures the
grant cannot outlive the command. drop any one and the guarantee collapses:

- no (1) → keylogger reads the passphrase off the tty
- no (2) → the human authorizes an unlock whose scope they cannot see
- no (3) → a malicious dialog harvests the passphrase at an expected-unlock moment
- no (4) → a loaded agent becomes a reusable master key

## .the mechanism (shim)

keyrack points `SSH_ASKPASS` at a keyrack-owned shim in its private 0700 dir, not at
`gnome-ssh-askpass` directly. the shim rewrites the stock `argv[1]` prompt into the attributed
message (all scope words + code, known to keyrack at invocation), then calls the real dialog.
the `KEYRACK_ASKPASS` override still names the REAL dialog; keyrack wraps it in the shim, so a
custom dialog path is honored AND attributed. shim + code live only for the one invocation, in
the 0700 dir the extant ephemeral lifecycle reaps.

## .see also

- `rule.forbid.contextless-unlock-prompt.md` — the enforceable rule these invariants back
- `define.why-ssh-askpass.md` — invariant 1 (q2, dialog over tty)
- the keyrack-identity-unlock vision q5 (ephemeral, per-invocation agent) — invariant 4
- `rule.require.os-secure-seals-to-host-manifest.md` — why one passphrase unlocks EVERYTHING
  beside the manifest, the reason the prompt is the highest-value authorization moment
