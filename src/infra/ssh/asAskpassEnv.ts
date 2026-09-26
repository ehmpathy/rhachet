/**
 * .what = build the env that forces ssh-add to prompt via the gnome dialog
 * .why  = `SSH_ASKPASS` names the dialog and `SSH_ASKPASS_REQUIRE=force` makes
 *         ssh-add use it even with a tty attached — so the passphrase is typed
 *         into the Wayland-native dialog, never the terminal (vision q2)
 *
 * .note = pure: it only shapes env vars over a base (default `process.env`), so
 *         it is unit-testable without a real dialog or an agent
 * .note = `DISPLAY` / `WAYLAND_DISPLAY` pass through from the base unchanged; an
 *         absent display makes ssh-add fail loud rather than fall to the tty
 */
export const asAskpassEnv = (input: {
  dialog: string;
  base?: NodeJS.ProcessEnv;
}): NodeJS.ProcessEnv => ({
  ...(input.base ?? process.env),
  SSH_ASKPASS: input.dialog,
  SSH_ASKPASS_REQUIRE: 'force',
});
