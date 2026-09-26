/**
 * .what = whether a graphical (X11 or Wayland) session is present, so the mandated
 *         gnome passphrase dialog has somewhere to render
 * .why  = the dialog is a local-desktop feature (vision q2). on a headless box —
 *         ci, or a plain ssh session with no display — it cannot pop, and
 *         SSH_ASKPASS_REQUIRE=force makes ssh-add fail with the SAME non-zero exit
 *         as a wrong or cancelled passphrase. so `setSshKeyIntoAgent` cannot tell
 *         the three apart AFTER the fact; this probe tells them apart BEFORE, so
 *         the headless case gets its own distinct fail-fast guidance (the vision's
 *         edgecase table promises "headless / ci / over ssh → fail fast with
 *         guidance"), never the merged three-cause message
 *
 * .note = pure over an injected `base` env (default `process.env`), so it is
 *         unit-testable with no real display
 * .note = present iff `DISPLAY` (X11/XWayland) OR `WAYLAND_DISPLAY` (native
 *         Wayland) is set to a non-empty value — the same two vars ssh-add's
 *         askpass path keys on. a set-but-empty value counts as absent, since an
 *         empty display is no display
 */
export const isGraphicalSessionPresent = (input?: {
  base?: NodeJS.ProcessEnv;
}): boolean => {
  const base = input?.base ?? process.env;
  const hasNonEmpty = (value: string | undefined): boolean =>
    typeof value === 'string' && value.length > 0;
  return hasNonEmpty(base.DISPLAY) || hasNonEmpty(base.WAYLAND_DISPLAY);
};
