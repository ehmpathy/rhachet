/**
 * .what = the message shown when a Variant A unlock is attempted on a headless box
 *         — no graphical session for the mandated gnome passphrase dialog to render
 * .why  = the vision's edgecase table promises "headless / ci / over ssh (no
 *         display) → fail fast with guidance". without this, a headless run falls
 *         through to ssh-add and surfaces the merged three-cause message (wrong /
 *         cancelled / no-display), which misdirects the human. this names the ONE
 *         real cause — no display — and points at the two real fixes: run on a
 *         local desktop, or drop the passphrase so no dialog is needed
 *
 * .note = pure (a string builder), so it is unit-testable with no display
 * .note = names WHAT + the fixes in the human's own words, never the internal
 *         labels ("Variant A" / "sign-as-kdf"), which are opaque to an invoker
 * .note = the passphrase dialog is a local-desktop feature by design (vision q2), so
 *         the message names the two fixes it actually offers — run on a local desktop,
 *         or use a passphrase-less key. it does NOT reference the daemon cache: the
 *         cache only holds a grant AFTER a successful unlock, which a headless
 *         passphrased key cannot reach — so a mention here would misdirect the human
 */
export const asHeadlessSessionMessage = (input: {
  owner: string | null;
}): string => {
  const ownerFlag = input.owner === null ? '' : ` --owner ${input.owner}`;
  return [
    'this keyrack manifest needs a graphical passphrase dialog, but this session has no display',
    '   ├─ why: your ssh key has a passphrase, so unlock pops a desktop dialog to',
    '   │       enter it — and this looks like a headless session (ci, or ssh with',
    '   │       no display), where no dialog can appear',
    '   └─ fix: run this on your local desktop session, or use a passphrase-less key —',
    `           e.g. rhx keyrack unlock${ownerFlag} --prikey ~/.ssh/id_ed25519`,
  ].join('\n');
};
