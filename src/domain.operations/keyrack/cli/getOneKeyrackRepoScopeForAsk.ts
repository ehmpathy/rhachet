import { ConstraintError } from 'helpful-errors';
import type { PickOne } from 'type-fns';

import type { KeyrackRepoManifest } from '@src/domain.objects/keyrack/KeyrackRepoManifest';
import { getOneKeyrackRepoManifestForAsk } from '@src/domain.operations/keyrack/getOneKeyrackRepoManifestForAsk';
import { isKeyrackAskMachineWide } from '@src/domain.operations/keyrack/isKeyrackAskMachineWide';
import { getGitRepoRootOrNull } from '@src/infra/git/getGitRepoRootOrNull';

/**
 * .what = fetch the repo artifacts an ask needs — and skip both when the ask needs none
 * .why = three cli verbs (`set`, `del`, `unlock`) each derived the same three-step decision
 *        inline: look the gitroot up, ask whether the ask is machine-wide, load the manifest
 *        only if both say so. a rule spelled three times is a rule that drifts — the exact
 *        class this wish closes (`rule.forbid.maintenance-hazards`)
 *
 * ⚠️ .why.gitroot = a machine-wide ask tolerates a NULL gitroot rather than demands one. an
 *                 `@all` key belongs to the box's own namespace, is declared in the HOST
 *                 manifest, and no repo can speak to it — so the ask is well-formed from a cwd
 *                 that is not a repo at all. a strict gitroot there is an incidental refusal
 * .note = the gitroot is still RETURNED for a machine-wide ask when one happens to be found,
 *         because `--at` names a repo-relative path and needs it. what changes is that its
 *         ABSENCE stops to be fatal
 * .note = the manifest is skipped for a machine-wide ask even when a gitroot IS found — the
 *         ask never consults it, and a load it never consults inherits every way that load can
 *         fail (ehmpathy/rhachet#467)
 */
export const getOneKeyrackRepoScopeForAsk = async (input: {
  /**
   * .what = the scope the ask names — one key, the whole repo, or unstated
   * .why = a keyed ask can name a machine-wide key by its `@all.` prefix alone, with no
   *        `--org` flag at all, so the org read must see BOTH spellings or a fix serves one
   *        and not the other
   */
  for: PickOne<{ keys: string[]; repo: true }> | null;

  /**
   * .what = the `--org` value the caller named, or null when the flag was omitted
   * .why = the second of the two ways an ask names its provenance
   */
  org: string | null;

  /** .what = where the repo search begins */
  from: string;

  /**
   * .what = what an ABSENT gitroot means for THIS verb — refuse the ask, or narrow it
   * .why = the shared rule ("is a manifest owed?") is identical on every verb; the
   *        CONSEQUENCE of no repo is not, and it turns on the verb's arity:
   *
   *        | arity | verb | no repo means |
   *        |---|---|---|
   *        | a keyed MUTATION | `set`, `del` | `refuse` — it names one repo key, and there is no repo to declare it |
   *        | a SWEEP | `unlock` | `tolerate` — it narrows to what it can reach, which is the machine-wide set |
   *
   *        spelled at the call site, never defaulted, because a wrong default is silent: a
   *        mutation that tolerated would proceed against a manifest it never had, and a sweep
   *        that refused would break a credential path that works today
   */
  onNoRepo: 'refuse' | 'tolerate';
}): Promise<{
  gitroot: string | null;
  repoManifest: KeyrackRepoManifest | null;
}> => {
  const isAskMachineWide = isKeyrackAskMachineWide({
    for: input.for,
    org: input.org,
  });

  // ⚠️ .why = ONE lookup, tolerant, then a NAMED refusal — never a strict lookup that throws.
  //         the strict form raises a raw `BadRequestError: Not inside a Git repository`, which
  //         reaches the top-level catch and prints a node stack trace plus a `Node.js v22.x`
  //         footer. a human who ran `keyrack set` from their home directory got a crash report
  //         where they needed one sentence that names the fix
  //         (`rule.require.errors-name-the-fix`, `rule.forbid.surprises`)
  // .note = the REFUSAL is unchanged — a repo-scoped ask still cannot be served without a repo.
  //         what changes is that it now reads as a refusal (exit 2, caller-must-fix) rather than
  //         a malfunction (exit 1, a stack trace) — `rule.require.exit-code-semantics`
  const gitroot = await getGitRepoRootOrNull({ from: input.from });
  if (!gitroot && !isAskMachineWide && input.onNoRepo === 'refuse')
    throw new ConstraintError(
      'this keyrack ask names a repo key, but the cwd is not a git repo',
      {
        note: 'a repo key is declared by the repo keyrack.yml, so it can be named only from inside that repo',
        fix: 'run from inside the repo, or name a machine-wide key with --org @all (it needs no repo at all)',
        cwd: input.from,
      },
    );

  // .note = delegated rather than spelled inline, so this site cannot drift from the two other
  //         load sites (the get-context builder, and the unlock-escalation second pass). the
  //         predicate is re-read there rather than threaded in — it is pure and cheap, and to
  //         pass a precomputed boolean would re-open the very seam the extraction closes
  const repoManifest = await getOneKeyrackRepoManifestForAsk({
    gitroot,
    for: input.for,
    org: input.org,
  });

  return { gitroot, repoManifest };
};
