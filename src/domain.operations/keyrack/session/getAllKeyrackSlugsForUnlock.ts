import { ConstraintError } from 'helpful-errors';

import type { KeyrackHostManifest } from '@src/domain.objects/keyrack/KeyrackHostManifest';
import type { KeyrackRepoManifest } from '@src/domain.objects/keyrack/KeyrackRepoManifest';

import { assertKeyrackEnvIsSpecified } from '../assertKeyrackEnvIsSpecified';
import { assertKeyrackKeyAskSurvivedOrgFilter } from '../assertKeyrackKeyAskSurvivedOrgFilter';
import { filterSlugsByKeyAsk } from '../filterSlugsByKeyAsk';
import { getAllKeyrackSlugsForEnv } from '../getAllKeyrackSlugsForEnv';
import { getAllKeyrackSlugsForOrg } from '../getAllKeyrackSlugsForOrg';
import { getAllMachineWideSlugsForEnv } from '../getAllMachineWideSlugsForEnv';
import { getAllSudoSlugsForKeyAsk } from '../getAllSudoSlugsForKeyAsk';

/**
 * .what = the exact set of slugs one `keyrack unlock` ask sweeps, across all three of its
 *         scopes — sudo, machine-wide-without-a-manifest, and repo ∪ machine-wide
 * .why = the ask reaches the same answer by three routes, and which route it takes is decided
 *        by facts the caller does not spell (is the env `sudo`? did a manifest load?). that
 *        decision is the whole content of "what does this unlock touch", so it earns a name of
 *        its own rather than a position inside a longer procedure
 *
 * ⚠️ .why.extracted = it sits beside its siblings — `getAllKeyrackSlugsForOrg`,
 *        `getAllKeyrackStatusKeysForFilter`, `getAllKeyrackHostsForFilter`,
 *        `getAllKeyrackAttemptsForOrg` — each a named, unit-clamped set-selection. held inline
 *        inside `unlockKeyrackKeys`, this one's three scopes are reachable ONLY through a
 *        daemon-bound async unlock, which makes the branch a human most wants to check the
 *        branch hardest to test. a set-selection that decides what a credential sweep touches
 *        earns the same reachability as its peers
 *
 * ⚠️ .why.pure = it performs NO i/o. both manifests arrive as values and the org filter arrives
 *        already expanded, so every scope is reachable from a unit test with no daemon, no
 *        socket, and no temp repo. that is the property the extraction exists to buy
 *
 * .note = the org filter is expanded by the CALLER, above the branch, and applied on all three
 *         scopes here. a filter computed per-branch is silently dropped on the others, and the
 *         drop is a WRONG ANSWER rather than a failure — `--org @this` from a non-repo cwd would
 *         yield every machine-wide key, the opposite provenance to the one asked for
 */
export const getAllKeyrackSlugsForUnlock = (input: {
  /** .what = the env the ask names, or null when it named none */
  env: string | null;

  /** .what = the key the ask names, or null for a full sweep of the env */
  keyAsk: string | null;

  /** .what = the repo manifest, or null when the cwd has none (or the ask skipped its load) */
  repoManifest: KeyrackRepoManifest | null;

  /** .what = the host manifest — always present; it is what makes a machine-wide key readable */
  hostManifest: KeyrackHostManifest;

  /** .what = the already-expanded `--org` filter, or null for "no filter" */
  orgFilter: string | null;
}): string[] => {
  // scope 1 — a sudo ask. a sudo key is named, never swept, so the key is required
  if (input.env === 'sudo') {
    if (!input.keyAsk)
      // ⚠️ .why.hint = the remedy rides `hint`, NOT `note`. the blocked renderer maps `note` to a
      //    `why:` leaf (a CAUSE) and `hint`/`fix` to the leaf that closes the branch (the FIX)
      //    — so under `note` this imperative rendered as `why: run: rhx keyrack unlock …`, a
      //    command labelled as a rationale (`rule.forbid.ambiguous-labels`). its twin one verb
      //    over, `source`, already rides `hint` — same guard, one render
      //    (`rule.require.errors-name-the-fix`)
      // .note = worded to match the cli-boundary guard in `invokeKeyrack` byte for byte, so a
      //         human meets ONE sentence no matter which of the two fires
      throw new ConstraintError('sudo credentials require --key flag', {
        hint: 'run: rhx keyrack unlock --env sudo --key <keyname>',
      });

    const sudoSlugsHeld = getAllSudoSlugsForKeyAsk({
      keyAsk: input.keyAsk,
      repoOrg: input.repoManifest?.org ?? null,
      hostManifest: input.hostManifest,
    });
    const sudoSlugs = getAllKeyrackSlugsForOrg({
      slugs: sudoSlugsHeld,
      org: input.orgFilter,
    });

    // a keyed ask emptied by the FILTER is a filter miss, never an absent key — say so, before
    // the not-found below can claim otherwise
    assertKeyrackKeyAskSurvivedOrgFilter({
      keyAsk: input.keyAsk,
      orgFilter: input.orgFilter,
      slugsBeforeFilter: sudoSlugsHeld,
      slugsAfterFilter: sudoSlugs,
    });

    // ⚠️ .why.fix = the remedy rides `fix`, NOT `note` — the same split the guard above obeys.
    //    the blocked renderer maps `note` to a `why:` leaf (a CAUSE) and `hint`/`fix` to the
    //    leaf that closes the branch (the FIX), so a command under `note` renders as
    //    `why: run: rhx keyrack set …` — an imperative labelled as a rationale
    //    (`rule.forbid.ambiguous-labels`). the key ask is spelled into both halves, so the
    //    line a human copy-pastes names THEIR key rather than a placeholder `X`
    if (sudoSlugs.length === 0)
      throw new ConstraintError(`sudo key not found: ${input.keyAsk}`, {
        note: `no sudo-env key named ${input.keyAsk} is declared on this rack`,
        fix: `rhx keyrack set --key ${input.keyAsk} --env sudo --vault <vault>`,
      });

    return sudoSlugs;
  }

  // scope 2 — no repo manifest → the MACHINE-WIDE bootstrap path. an `@all` key belongs to the
  // box itself (its own namespace), so it must unlock with NO repo manifest at all: the
  // bootstrap-to-clone credential path, where the github-app install token is vaulted under
  // `@all` precisely so it can be fetched before any repo is cloned
  if (!input.repoManifest) {
    // env comes from the ask directly, since there is no manifest to default it from
    // .note = a ConstraintError, never a parent word — an absent --env is the caller's to fix,
    //         so it owes a blocked render + exit 2 rather than a stack trace (term=blocked)
    if (!input.env)
      throw new ConstraintError(
        'unlock without a repo manifest requires --env',
        {
          note: 'no keyrack.yml found; only machine-wide @all keys are unlockable, and --env names their scope',
          fix: 'run: rhx keyrack unlock --env <env> [--key <key>]  (or add a repo .agent/keyrack.yml)',
        },
      );

    // .why.filter-here-too = the filter is applied on this path as well, never only on the
    //        manifest branch. `--org` names one provenance; here the swept set is entirely
    //        `@all`, so a filter for a real org honestly selects an empty set rather than a
    //        silent yield of every machine-wide key under that org's name
    const machineWideSlugsHeld = getAllMachineWideSlugsForEnv({
      env: input.env,
      keyAsk: input.keyAsk,
      hostManifest: input.hostManifest,
    });
    const machineWideSlugs = getAllKeyrackSlugsForOrg({
      slugs: machineWideSlugsHeld,
      org: input.orgFilter,
    });

    // a keyed ask emptied by the FILTER is a filter miss, never an absent key
    assertKeyrackKeyAskSurvivedOrgFilter({
      keyAsk: input.keyAsk,
      orgFilter: input.orgFilter,
      slugsBeforeFilter: machineWideSlugsHeld,
      slugsAfterFilter: machineWideSlugs,
    });

    // fail-fast when a specific machine-wide key was asked but is absent from the host manifest
    if (input.keyAsk && machineWideSlugs.length === 0)
      throw new ConstraintError(`machine-wide key not found: ${input.keyAsk}`, {
        env: input.env,
        note: `no @all.${input.env}.${input.keyAsk} key in the host manifest (and no repo keyrack.yml to declare a repo-scoped one)`,
        fix: `rhx keyrack set --key ${input.keyAsk} --env ${input.env} --org @all --vault ...`,
      });

    return machineWideSlugs;
  }

  // scope 3 — a repo manifest loaded, so the swept set is the repo's keys UNION the box's
  const resolvedEnv = assertKeyrackEnvIsSpecified({
    manifest: input.repoManifest,
    env: input.env,
  });

  const repoSlugsForEnv = filterSlugsByKeyAsk({
    slugs: getAllKeyrackSlugsForEnv({
      manifest: input.repoManifest,
      env: resolvedEnv,
    }),
    keyAsk: input.keyAsk,
  });

  // ALSO include machine-wide `@all` keys held in the host manifest — an `@all` key is the box's
  // own namespace, always unlockable for its env regardless of the repo manifest. this is what
  // makes `@all` keys unlock WITH a manifest present too, IGNORING the manifest org (a
  // machine-wide key is never scoped to the tree). deduped by slug below
  const machineWideSlugsForEnv = getAllMachineWideSlugsForEnv({
    env: resolvedEnv,
    keyAsk: input.keyAsk,
    hostManifest: input.hostManifest,
  });

  // `--org` FILTERS this union; absent, there is no filter and the union stands
  // .note = the filter is ONE segment comparison over the whole union — the same mechanism
  //         `keyrack list` and `keyrack status` apply, never a bespoke branch per sigil. it
  //         lands on the three answers the prescribed asks want, because every repo slug carries
  //         `manifest.org` as its segment (getAllKeyrackSlugsForEnv.ts) and every
  //         machine-wide slug carries `@all`:
  //           `@this` -> the manifest's org -> exactly repoSlugsForEnv
  //           `@all`                        -> exactly machineWideSlugsForEnv
  //         and it answers a FOURTH ask honestly, where a per-sigil branch could not: a real org
  //         name that is not this repo's selects an empty set rather than a silent yield of this
  //         repo's keys under another org's name
  const slugsForEnvHeld = [
    ...new Set([...repoSlugsForEnv, ...machineWideSlugsForEnv]),
  ];
  const slugsForEnvFiltered = getAllKeyrackSlugsForOrg({
    slugs: slugsForEnvHeld,
    org: input.orgFilter,
  });

  // a keyed ask emptied by the FILTER is a filter miss, never an absent key
  assertKeyrackKeyAskSurvivedOrgFilter({
    keyAsk: input.keyAsk,
    orgFilter: input.orgFilter,
    slugsBeforeFilter: slugsForEnvHeld,
    slugsAfterFilter: slugsForEnvFiltered,
  });

  // fail-fast when a specific key was asked but found in neither the repo manifest nor as a
  // machine-wide `@all` key
  // ⚠️ .note.env = every leaf below reads `resolvedEnv`, NEVER `input.env`. the two diverge on a
  //        bare ask: `assertKeyrackEnvIsSpecified` yields a real env (e.g. `all`) while
  //        `input.env` stays null. to mix them renders `for env=null … @all.all.FOO` — one
  //        sentence that names TWO envs — and a `--env null` a human cannot paste back
  //        (`rule.require.errors-name-the-fix`)
  if (input.keyAsk && slugsForEnvFiltered.length === 0)
    throw new ConstraintError(`key not found in manifest: ${input.keyAsk}`, {
      env: resolvedEnv,
      note: `key '${input.keyAsk}' is not declared in keyrack.yml for env=${resolvedEnv} (nor as a machine-wide @all.${resolvedEnv}.${input.keyAsk})`,
      fix: `rhx keyrack set --key ${input.keyAsk} --env ${resolvedEnv}`,
    });

  return slugsForEnvFiltered;
};
