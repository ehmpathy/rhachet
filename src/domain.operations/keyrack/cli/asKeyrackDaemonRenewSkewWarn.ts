/**
 * .what = the warn for keys a daemon from a prior build will not renew
 * .why = the unlock succeeds and status names no halt, so without this line the key dies
 *        at its first upstream expiry with no cause named — the overnight dark tunnel the
 *        renew exists to end. the fix is a prune, so the next unlock spawns a fresh daemon
 *
 * .note = pure, so the render is snapped; the write is the caller's
 */
export const asKeyrackDaemonRenewSkewWarn = (input: {
  slugs: string[];
  owner: string | null;
}): string[] => {
  const flagOwner = input.owner ? ` --owner ${input.owner}` : '';
  return [
    `🟡 the keyrack daemon is from an older build and will not renew ${input.slugs.length === 1 ? 'this key' : `these ${input.slugs.length} keys`}`,
    // each slug sits above the `fix` leaf, so every slug line is a mid branch
    ...input.slugs.map((slug) => `   ├─ ${slug}`),
    '   └─ fix',
    `      ├─ rhx keyrack daemon prune${flagOwner}`,
    '      └─ then unlock again — the prune drops every key the daemon holds',
    // .why = an os.daemon key lives only in the daemon's memory, so no unlock restores it
    '         └─ a key kept only in the daemon will not come back',
  ];
};
