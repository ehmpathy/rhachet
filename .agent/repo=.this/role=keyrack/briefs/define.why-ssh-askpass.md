# define.why-ssh-askpass

## .what

keyrack prompts for an ssh-key passphrase through a **graphical askpass dialog**
(`ssh-askpass` / `gcr-ssh-askpass` / `ksshaskpass`), forced via
`SSH_ASKPASS_REQUIRE=force`, rather than the terminal `Enter passphrase for <key>:`
line.

## .why — keylogger mitigation (the core reason)

the passphrase unlocks the ssh key that, via sign-as-kdf, unlocks the entire host
manifest. so **where** the human types it matters:

- **terminal prompt** — the passphrase is typed into the tty, where a terminal keylogger
  or a compromised shell can capture the keystrokes.
- **askpass dialog** — the passphrase is typed into a separate graphical window the
  terminal never sees, so tty-level capture is defeated.

that single property — keep the passphrase off the tty — is worth the mandate on its own.

## .context — where the prompt comes from

keyrack unlock derives its wrap key from an ssh-agent **signature** (sign-as-kdf). the
passphrase prompt appears when `ssh-add` loads the key into keyrack's **ephemeral,
per-owner agent** on a cache miss. that load step is the one moment a human types the
passphrase — so it is the step the dialog must own.

## .scope — Wayland-only, and a Wayland-native dialog

the classic ssh-askpass risk is snoop over a **forwarded X11** connection — out of scope
for a local session. but note a subtler local risk: X11 has **no input isolation between
clients**, so any X11 dialog (e.g. `x11-ssh-askpass`) that draws via XWayland can be
snooped by another local X11 app on the shared XWayland server — which partially forfeits
the keylogger mitigation. a **Wayland-native** dialog (GTK/Qt) avoids this: the compositor
isolates its input, so no other app can read the keystrokes. so keyrack targets both a
local Wayland session **and** a Wayland-native dialog. see `.detection order`.

## .supported dialog — `ssh-askpass-gnome` only (for now)

v1 supports exactly one askpass: the standalone gnome gtk dialog `gnome-ssh-askpass`
(from `ssh-askpass-gnome`, see `.install`). it is safe + official (part of openssh),
wayland-native (the compositor isolates its input), and works standalone. keyrack looks
for it on PATH and at `/usr/lib/openssh/gnome-ssh-askpass`; if absent, it fails fast with
the install command (see `.fail-fast`).

**not supported (for now), each for a concrete reason:**

- `gcr-ssh-askpass` — refuses a direct run (`gcr-ssh-askpass: this program is not meant
  to be run directly`); a private part of `gcr-ssh-agent`, not a general `SSH_ASKPASS`.
  seen fail 2026-07-23 on the wisher's box.
- `x11-ssh-askpass` (the plain `ssh-askpass` package) — draws via XWayland, where another
  local X11 app could snoop the keystrokes (see `.scope`).
- `ksshaskpass` / `lxqt-openssh-askpass` — sound qt dialogs; deferred until a kde/lxqt
  user needs them.

## .install — recommended: `ssh-askpass-gnome`

on GTK desktops (COSMIC / gnome / pop):

```
sudo apt install ssh-askpass-gnome
```

**safe + official.** it is part of the OpenSSH source package — split out of
`openssh-client` only so the base client need not depend on GTK+. same OpenSSH
maintainers, distributed via the official debian/ubuntu repositories. it installs the
standalone GTK dialog `gnome-ssh-askpass` (`/usr/lib/openssh/gnome-ssh-askpass`), which
`ssh-add` calls to prompt — the wayland-native, standalone dialog the detection order
wants, and the one keyrack recommends by default. (kde desktops: `ksshaskpass`.)

## .override — `KEYRACK_ASKPASS` escape hatch

when auto-detection cannot find the mandated dialog — a non-gnome desktop, or a dialog
installed outside the standard paths — set `KEYRACK_ASKPASS` to the absolute path of a
gnome-compatible askpass dialog:

```
KEYRACK_ASKPASS=/path/to/your-ssh-askpass rhx keyrack unlock --owner ehmpath --env test
```

a set `KEYRACK_ASKPASS` is **authoritative**: it becomes the only candidate, so detection
never falls through to a host dialog the operator did not pick. an override that points at
an absent path fails fast and names that path (never a silent drop to the tty). the same seam
is the documented fix on non-Linux platforms, where v1 ships no native dialog. it is also
surfaced in `keyrack unlock --help`.

## .boundary — dialog yes, persistent agent no

keyrack uses the dialog **only** to render the prompt. it keeps its own throwaway
per-invocation agent. it must **not** hand the key to the persistent `gcr-ssh-agent`,
which would hold the key from login onward and defeat per-invocation unlock.

## .fail-fast when absent

if no dialog is installed, keyrack fails loud with the exact fix — it never silently
falls back to the tty prompt (that would forfeit the keylogger mitigation this whole
choice exists for):

```
⛈️  no ssh-askpass dialog is installed — keyrack needs it to prompt safely.
   fix: install a wayland-native gtk dialog, then retry —
     sudo apt install ssh-askpass-gnome   # gtk dialog, wayland-native
   why: the dialog keeps your passphrase out of the terminal, where a
        keylogger could capture it — and a wayland-native one keeps it
        away from x11 snoopers too.
```

## .defense-in-depth

keyrack does NOT pass `ssh-add -c` (confirm-each-use). the ephemeral-agent design
(vision q5/q7) already gives the confirm-each-use guarantee by construction: the agent is
spawned per invocation, signs exactly once, and is torn down — there is no persistent agent
to hijack, so a second `-c` confirm is redundant. `-c` is a knob for the persistent-agent
variants only; the ephemeral teardown IS the anti-hijack defense here.

## .sources

- ssh-add(1) — `SSH_ASKPASS_REQUIRE=force`, `-c`: https://www.man7.org/linux/man-pages/man1/ssh-add.1.html
- graphical prompt for ssh key passphrase — Baeldung: https://www.baeldung.com/linux/ssh-key-passphrase-graphical-prompt
- ssh-askpass for agent confirmation — End Point Dev: https://www.endpointdev.com/blog/2022/11/ssh-askpass-on-mac-os-for-agent-confirmation/
- ssh key management in COSMIC — pop-os/cosmic-epoch#417: https://github.com/pop-os/cosmic-epoch/issues/417
