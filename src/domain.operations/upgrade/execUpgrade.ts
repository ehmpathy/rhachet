import { HelpfulError } from 'helpful-errors';

import type { BrainSupplierSlug } from '@src/domain.objects/BrainSupplierSlug';
import type { ContextCli } from '@src/domain.objects/ContextCli';
import type { RoleSupplierSlug } from '@src/domain.objects/RoleSupplierSlug';
import { syncHooksForLinkedRoles } from '@src/domain.operations/init/hooks/syncHooksForLinkedRoles';
import { initRolesFromPackages } from '@src/domain.operations/init/roles/link/initRolesFromPackages';
import { asThrownValueText } from '@src/utils/asThrownValueText';

import type { NpmInstallFailureKind } from './asNpmInstallFailureKind';
import { asNpmInstallFailureKindFromError } from './asNpmInstallFailureKindFromError';
import { detectInvocationMethod } from './detectInvocationMethod';
import { execNpmInstallGlobal } from './execNpmInstallGlobal';
import { execNpmInstallLocal } from './execNpmInstallLocal';
import { expandRoleSupplierSlugs } from './expandRoleSupplierSlugs';
import { getGlobalRhachetVersion } from './getGlobalRhachetVersion';
import { getLocalRefDependencies } from './getLocalRefDependencies';
import { resolveBrainsToPackages } from './resolveBrainsToPackages';
import {
  buildRoleSpecifiers,
  determineUpgradeScope,
  getSkippedPackages,
  getUpgradedBrains,
  getUpgradedRoles,
} from './transformers';

/**
 * .what = result of upgrade operation
 * .why = provides structured summary of what was upgraded
 */
export interface UpgradeResult {
  upgradedSelf: {
    local: boolean;
    global: { upgraded: boolean; error?: string } | null;
  };
  upgradedRoles: RoleSupplierSlug[];
  upgradedBrains: BrainSupplierSlug[];
}

/**
 * .what = builds list of packages to install at @latest
 * .why = combines self (rhachet) with role and brain packages for npm install
 */
const buildInstallList = (input: {
  self: boolean;
  rolePackages: string[];
  brainPackages: string[];
  exclude: Set<string>;
}): string[] => {
  const list: string[] = [];

  // add rhachet if self upgrade requested (and not excluded)
  if (input.self && !input.exclude.has('rhachet')) {
    list.push('rhachet');
  }

  // add role packages (exclude local refs)
  for (const pkg of input.rolePackages) {
    if (!input.exclude.has(pkg)) {
      list.push(pkg);
    }
  }

  // add brain packages (exclude local refs)
  for (const pkg of input.brainPackages) {
    if (!input.exclude.has(pkg)) {
      list.push(pkg);
    }
  }

  return list;
};

type WhichTarget = 'local' | 'global';

/**
 * .what = determines which upgrade targets based on input and invocation method
 * .why = npx invocation defaults to local only, global invocation defaults to both
 */
const getWhichTargets = (input: {
  which?: 'local' | 'global' | 'both';
}): WhichTarget[] => {
  if (input.which === 'local') return ['local'];
  if (input.which === 'global') return ['global'];
  if (input.which === 'both') return ['local', 'global'];
  // default based on invocation method
  const method = detectInvocationMethod();
  if (method === 'npx') return ['local'];
  return ['local', 'global'];
};

/**
 * .what = a clause with exactly one terminator on its end
 *
 * ⚠️ it ADDS one, never strips — a clause that closes on `?` or `!` keeps it. an appended
 *   period renders `failed..` on every clause that terminates itself
 *   (`rule.forbid.snapshot-visual-blemishes`).
 */
const asSentenceTerminated = (input: { words: string }): string =>
  /[.?!]$/.test(input.words) ? input.words : `${input.words}.`;

/**
 * .what = the LINE a human reads when a global upgrade fails — what broke, then what
 *   to do about it
 *
 * 🚨 `.redact(['metadata'])`, never a bare `.message` — a `HelpfulError`'s message APPENDS
 *   its serialized metadata, and `output` there carries the package manager's whole
 *   captured log. the structured fields stay on the error for whoever needs them.
 *
 * 🚨 the hint is read BY NAME, so it never has to be inlined into the sentence to survive
 *   this path. an inline copy renders TWICE on the local path, where `asCliErrorFrame`
 *   already appends `metadata.hint` as its own line.
 *
 * ⚠️ the hint is OPTIONAL by shape — a `HelpfulError` may carry none, and this must then
 *   render the sentence alone rather than a trailing separator with no clause after it.
 *
 * ⚠️ the two fallback rows each carry real weight: a thrown value need not be a
 *   `HelpfulError`, nor even an `Error`, so each rung down names what it can still read.
 *
 * 🚨 the LAST rung is `asThrownValueText`, never a bare `String(error)`. this composes the
 *   report inside `execUpgrade`'s warn-and-continue catch, and that catch protects TWO
 *   things: the failure report, and the local upgrade that follows it. so a render fault
 *   here does not degrade the report — it escapes the catch, `execUpgrade` itself throws,
 *   and the human gets neither. the trigger is an object whose own `toString` throws; the
 *   shared transformer reaches no user code, so it cannot
 *   (raised by the r009 `behavior-friction-hazards` lane at i076).
 */
const asUpgradeFailureMessage = (input: { error: unknown }): string => {
  if (input.error instanceof HelpfulError) {
    const sentence = input.error.redact(['metadata']).message;
    const hint = (input.error as { metadata?: { hint?: unknown } }).metadata
      ?.hint;
    return typeof hint === 'string' && hint.length > 0
      ? `${asSentenceTerminated({ words: sentence })} ${asSentenceTerminated({ words: hint })}`
      : sentence;
  }
  if (input.error instanceof Error) return input.error.message;
  return asThrownValueText(input.error);
};

/**
 * .what = the kind a failure header may render, given the kind a caught error carried
 * .why  = the two types differ by one member: `asNpmInstallFailureKindFromError` reads an
 *   arbitrary error so must admit `build-gate-blocked`; the header forbids it.
 *
 * ⚠️ that row guards a case that cannot arrive — `execNpmInstallGlobal` absolves
 *   `build-gate-blocked` and returns, so it never throws. `unclassified` is the honest
 *   degrade if it somehow does; the full message still prints beneath.
 */
const asGlobalUpgradeFailureHeaderKind = (input: {
  kind: NpmInstallFailureKind;
}): Exclude<NpmInstallFailureKind, 'build-gate-blocked'> =>
  input.kind === 'build-gate-blocked' ? 'unclassified' : input.kind;

/**
 * .what = the one-line header printed above a failed global upgrade
 *
 * 🚨 it tests the ONE member that means *"we could not name a cause"*, never an
 *   enumeration of the known kinds. an enumeration is a hand-kept copy of a union it does
 *   not own, so a new member drifts into the else and the header claims ignorance of a
 *   cause the very next line names (`rule.forbid.failhide`).
 *
 * ⚠️ the default direction is deliberate: an unrecognized kind lands on "failed", which is
 *   true of every branch that reaches this catch, never on "unclassified", which would be
 *   a claim about our own knowledge we cannot make about a kind we did not anticipate.
 */
const asGlobalUpgradeFailureHeader = (input: {
  kind: Exclude<NpmInstallFailureKind, 'build-gate-blocked'>;
}): string =>
  input.kind === 'unclassified'
    ? '⚠️ rhachet upgrade globally exited nonzero — cause unclassified'
    : '✗ rhachet upgrade globally failed';

/**
 * .what = executes upgrade of rhachet, role packages, and/or brain packages
 * .why = enables `npx rhachet upgrade` workflow
 *
 * .note = defaults to upgrade all when no flags provided
 * .note = re-initializes roles after upgrade (link + init)
 * .note = which='both' upgrades local and global installs
 * .note = global failure does not block local upgrade (per criteria usecase.3)
 */
export const execUpgrade = async (
  input: {
    self?: boolean;
    roleSpecs?: string[];
    brainSpecs?: string[];
    which?: 'local' | 'global' | 'both';
  },
  context: ContextCli,
): Promise<UpgradeResult> => {
  // determine upgrade targets
  const whichTargets = getWhichTargets({ which: input.which });

  // determine what to upgrade (default = --self --roles * --brains *)
  const { upgradeSelf, roleSpecs, brainSpecs } = determineUpgradeScope({
    self: input.self,
    roleSpecs: input.roleSpecs,
    brainSpecs: input.brainSpecs,
  });

  // expand role specs to packages and linked roles
  const roleExpanded = await expandRoleSupplierSlugs(
    { specs: roleSpecs },
    context,
  );

  // resolve brains to package names
  const brainPackages = await resolveBrainsToPackages(
    { specs: brainSpecs },
    context,
  );

  // detect local ref dependencies to exclude (file: or link:)
  const localRefDeps = getLocalRefDependencies({ cwd: context.cwd });

  // log skipped packages
  if (localRefDeps.size > 0) {
    const skipped = getSkippedPackages({
      rolePackages: roleExpanded.packages,
      brainPackages,
      upgradeSelf,
      localRefDeps,
    });
    if (skipped.length > 0) {
      console.log(`🫧 skip (local refs): ${skipped.join(', ')}`);
    }
  }

  // build npm install command
  const installList = buildInstallList({
    self: upgradeSelf,
    rolePackages: roleExpanded.packages,
    brainPackages,
    exclude: localRefDeps,
  });

  // execute local npm install (fail fast)
  //
  // .why lifecycleHooks 'skip' = this is the ONE site that knows what `installList`
  //   holds — rhachet itself, role packages, and brain packages — so it is the site that
  //   can weigh the opt-out per dependency class:
  //     - role packages are pure CONTENT (briefs and shell skills). they declare no
  //       lifecycle hook, so `skip` takes none from them
  //     - rhachet carries node-pty, whose hook only ever CHECKS for a prebuild and exits
  //       0 when one is present. since the bump that prebuild ships in the tarball on
  //       every platform we support, so the hook is a no-op and `skip` is a no-op with
  //       it. that is MEASURED, not inferred — see `[case7]` in
  //       getPtyModuleOrNull.consumer.integration.test.ts
  //     - brain packages are third-party and their hooks are UNSURVEYED. `skip` is
  //       retained for them only because it is the extant behavior and a change here
  //       belongs to its own drive with its own evidence, never to a rider on this one
  //   ⚠️ so the value is `skip` today for a reason that holds today. it is written here,
  //     beside the list it governs, precisely so a future package added to that list
  //     forces a reader past this note rather than inherits it unseen
  if (whichTargets.includes('local') && installList.length > 0) {
    execNpmInstallLocal(
      { packages: installList, lifecycleHooks: 'skip' },
      context,
    );
  }

  // global upgrade (if requested) — happens right after local, before roles
  // .note = per criteria usecase.3, global failure should NOT block local upgrade
  // .note = this is intentional warn-and-continue, NOT fail-hide:
  //         - error is logged visibly
  //         - error is returned in result.upgradedGlobal.error
  //         - caller can inspect and act on the failure
  //
  // ⚠️ composed by an IIFE that RETURNS the outcome, never a `let` a branch reassigns.
  //   a mutable slot lets a later branch shadow an earlier assignment with no type error
  //   and no red test, where each `return` below is exhaustive by construction
  //   (`rule.require.immutable-vars`)
  const upgradedGlobal = ((): {
    upgraded: boolean;
    error?: string;
  } | null => {
    if (!whichTargets.includes('global')) return null;

    // no global rhachet is installed, so there is none to upgrade — never a failure
    const globalVersion = getGlobalRhachetVersion();
    if (globalVersion === null) return null;

    try {
      return execNpmInstallGlobal({ packages: ['rhachet'] });
    } catch (error) {
      // warn and continue (criteria usecase.3: exits with success sothat local not blocked)
      const message = asUpgradeFailureMessage({ error });
      // .why = the header branches on the STRUCTURED kind the installer classified,
      //   never on a text match against prose this orchestrator did not produce. a
      //   read of someone else's message is a contract nobody declared: the prior
      //   `message.includes('EACCES')` check could never match, because the install
      //   ran with `stdio: 'inherit'` and so the package manager's stderr was never
      //   in the message to find. it looked live and was dead
      //   (rule.forbid.decode-friction-in-orchestrators).
      const kind = asNpmInstallFailureKindFromError({ error });
      // the one member the header's type forbids is bridged by its own transformer, which
      // owns why that row exists and why it degrades rather than throws
      const kindHeader = asGlobalUpgradeFailureHeaderKind({ kind });
      // 🚨 both branches print the FULL message, and the hint with it. the sentence the
      //   installer composed is the sentence a human gets — a bare literal on one branch
      //   would throw the fix away on the one path `rule.require.errors-name-the-fix` is
      //   most about
      // .note = `└─`, never `└──`. this row is a LONE detail under a header, which is the
      //   shape every error frame in this repo renders with `└─` (`asCliErrorFrame`,
      //   `fillKeyrackKeys`). `└──` is the SIBLING-LIST connector — it pairs with `├──`
      //   rows, as in `printPnpmPresenceUnreadableNotice` and `getAvailableBrainsInWords`
      console.log('');
      console.log(asGlobalUpgradeFailureHeader({ kind: kindHeader }));
      console.log(`   └─ ${message}`);
      console.log('');
      return { upgraded: false, error: message };
    }
  })();

  // re-init only linked roles (not all roles in upgraded packages)
  if (whichTargets.includes('local') && roleExpanded.linkedRoles.length > 0) {
    const specifiers = buildRoleSpecifiers({
      linkedRoles: roleExpanded.linkedRoles,
    });
    await initRolesFromPackages({ specifiers }, context);

    // sync hooks for linked roles (always on for upgrade)
    await syncHooksForLinkedRoles({}, context);
  }

  // extract slugs from brain packages for result
  const upgradedBrains = getUpgradedBrains({ brainPackages, localRefDeps });

  // filter role slugs for packages that were actually upgraded (not excluded)
  const upgradedRoles = getUpgradedRoles({
    roleSlugs: roleExpanded.slugs,
    localRefDeps,
  });

  // report success
  return {
    upgradedSelf: {
      local: whichTargets.includes('local') ? upgradeSelf : false,
      global: upgradedGlobal,
    },
    upgradedRoles: whichTargets.includes('local') ? upgradedRoles : [],
    upgradedBrains: whichTargets.includes('local') ? upgradedBrains : [],
  };
};
