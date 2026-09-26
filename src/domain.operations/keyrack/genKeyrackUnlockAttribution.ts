import { getOneGitBranchName } from '@src/infra/git/getOneGitBranchName';
import type { KeyrackUnlockAttribution } from '@src/infra/ssh/asUnlockPromptMessage';
import { genUnlockCode } from '@src/infra/ssh/genUnlockCode';

import { basename } from 'node:path';

/**
 * .what = build the per-invocation prompt attribution (org/tree/env/reach/code) the
 *         attributed unlock dialog renders, with a fresh visual-match code
 * .why  = the unlock prompt must name every in-scope dimension + a code the CLI also
 *         prints, so the human authorizes with full knowledge and can confirm the
 *         dialog belongs to THIS command (rule.forbid.contextless-unlock-prompt)
 *
 * .note = tree and branch are DISTINCT git dimensions, each its own field. tree is
 *         the worktree/checkout dir (basename of the gitroot — `getGitRepoRoot`
 *         resolves to the WORKTREE root, so a worktree reads its own dir name, e.g.
 *         `rhachet.vlad.keyrack-identity-unlock`, never the bare repo). branch is the
 *         git branch, or null on a detached HEAD. a null gitroot → tree `(no repo)`,
 *         branch null
 * .note = the code is minted here (once per invocation) with a crypto-strong nonce
 *         via genUnlockCode; it is printed to stderr at the prompt choke point and
 *         rendered in the dialog by the shim — the two must match
 * .note = env/reach are the caller's cli opts. env is always shown (default `all`
 *         for a whole-manifest read like `list`); reach is shown only when it applies
 */
export const genKeyrackUnlockAttribution = (input: {
  org: string;
  env: string;
  reach: string | null;
  gitroot: string | null;
}): KeyrackUnlockAttribution => ({
  org: input.org,
  tree: input.gitroot ? basename(input.gitroot) : '(no repo)',
  branch: input.gitroot
    ? getOneGitBranchName({ gitroot: input.gitroot })
    : null,
  env: input.env,
  reach: input.reach,
  code: genUnlockCode(),
});
