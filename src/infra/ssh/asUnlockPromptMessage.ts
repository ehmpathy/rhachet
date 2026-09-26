/**
 * .what = the full scope a keyrack unlock covers — every dimension that narrows
 *         the set of keys the passphrase authorizes
 * .why  = each field dictates a DIFFERENT set of keys, so the human cannot judge
 *         what they authorize unless every in-scope one is shown. owner/org/tree/
 *         env/code are always present; reach/key are shown only when they apply
 *         (rule.forbid.contextless-unlock-prompt)
 *
 * .note = tree, branch, and repo are THREE distinct git dimensions, each its own
 *         row: repo is the project (`rhachet`), tree is the worktree/checkout dir
 *         (`rhachet.vlad.keyrack-identity-unlock`), branch is the git branch
 *         (`vlad/keyrack-identity-unlock`). a tree is not a repo, and neither is a
 *         branch — never glue them into one field
 */
export interface KeyrackUnlockScope {
  /** the keyrack identity the unlock is for (e.g. `ehmpath`) */
  owner: string;
  /** the org whose keys are in scope (e.g. `ehmpathy`) */
  org: string;
  /** the worktree/checkout dir that minted the request (e.g. `rhachet.vlad.keyrack-identity-unlock`) */
  tree: string;
  /** the git branch that minted the request (e.g. `vlad/keyrack-identity-unlock`), or null when detached/none */
  branch: string | null;
  /** the target env whose keys are in scope (e.g. `test`) */
  env: string;
  /** the reach scope, when one applies (e.g. `@this` vs `@all`) */
  reach: string | null;
  /** the ssh key path the passphrase applies to, when known (e.g. `~/.ssh/ehmpath`) */
  key: string | null;
  /** the per-invocation visual-match code the CLI ALSO prints */
  code: string;
}

/**
 * .what = the scope minus the two fields each prompt site already holds — owner
 *         (threaded everywhere) and key (the keyPath the site is about to load)
 * .why  = this is the shape the CLI computes ONCE and threads down to the prompt
 *         sites; each site composes the full scope from its own owner + key plus
 *         this. so the CLI-computed org/tree/env/reach/code travels as one object,
 *         and no site re-derives them (rule.forbid.io-as-interfaces: a shared shape)
 */
export type KeyrackUnlockAttribution = Omit<
  KeyrackUnlockScope,
  'owner' | 'key'
>;

/**
 * .what = render the attributed dialog prompt from an unlock scope
 * .why  = the shim feeds this text to the gnome dialog as its prompt, so the human
 *         sees WHO and WHAT they authorize plus the visual-match code that proves
 *         this dialog belongs to THIS command — never a bare, contextless
 *         `Enter passphrase for …:` (rule.forbid.contextless-unlock-prompt)
 *
 * .note = pure: it renders text only; it opens no dialog and reads no env, so it
 *         is unit-testable in full
 * .note = owner/org/tree/env/code always render; branch/reach/key render only when
 *         set, so a scope that does not apply is omitted rather than shown empty
 * .note = rendered as a treestruct — each row a `├─` branch under the header, the
 *         last a `└─` terminator, with the label column padded so values align. a
 *         scannable tree a human reads at a glance (treestruct-output)
 */
export const asUnlockPromptMessage = (input: {
  scope: KeyrackUnlockScope;
}): string => {
  const { scope } = input;

  // owner/org/tree/env are ALWAYS shown; branch/reach/key only when they apply. each
  // row is [label, value]; a null value drops the row entirely (never an empty field).
  // tree, branch are DISTINCT git dimensions on their own rows — never glued together
  const rows: [string, string | null][] = [
    ['owner', scope.owner],
    ['org', scope.org],
    ['tree', scope.tree],
    ['branch', scope.branch],
    ['env', scope.env],
    ['reach', scope.reach],
    ['key', scope.key],
    ['code', scope.code],
  ];

  // drop absent rows FIRST, so the branch glyphs are computed over only the rows
  // that actually render — the last present row gets `└─`, never a mid-tree `├─`
  const shown = rows.filter((row): row is [string, string] => row[1] !== null);

  // pad the label column so values align; `branch:` is the widest at 7 cols. the last
  // row terminates the tree with `└─`, the rest branch with `├─` (treestruct-output)
  const lines = shown.map(([label, value], index) => {
    const glyph = index === shown.length - 1 ? '└─' : '├─';
    return `   ${glyph} ${`${label}:`.padEnd(7)} ${value}`;
  });

  return ['🔐 keyrack unlock', ...lines].join('\n');
};
