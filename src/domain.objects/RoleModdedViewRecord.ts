import { DomainLiteral } from 'domain-objects';

/**
 * .what = one published source dir of a role's kind dir, as `roles link` mounted it
 * .why = a modded view replaces the per-dir link with per-file links, so the link that named
 *        the source is gone; the record keeps it, so the view can be rebuilt or undone
 *
 * .note = `at` is the mount point under the kind dir: '' for a single-dir link (the kind dir
 *   itself), or the entry name for an array-dir link
 * .note = `target` is relative to the role dir, through the package's own path (never the
 *   store realpath), so an upgrade that moves the store keeps the record true
 */
export interface RoleModdedViewSource {
  at: string;
  target: string;
}

/**
 * .what = what a view's hook check was made against: the installed version of the role's package
 * .why = a hook ships with the package, so a bump can add a hook over a `not`ed skill while the
 *        file set stays as it was; a view whose basis moved is stale, so the check runs again
 *
 * .note = `version` is null where the package names no version
 */
export interface RoleModdedViewHookBasis {
  version: string | null;
}

/**
 * .what = the record a modded role dir carries at `.modded.json`
 * .why = the view's own provenance: which sources it was built over, and, where the last
 *        render refused the mod, the refusal — so a boot that cannot re-derive the refusal
 *        (a hook conflict needs the package) still fails loud, and only for this role
 *
 * .note = `refusal.paths` is the plan's link paths when the render refused; a boot whose plan
 *   differs knows the mod moved since, so it names the render rather than the stale refusal
 * .note = `paths` is the plan's link paths when the view was last built, sorted; a rebuild
 *   whose plan matches them is a repair of the disk (a relink cleared it), never a mod change
 * .note = `hookBasis` is null where the mod `not`s no skill, so no hook check was owed
 */
export interface RoleModdedViewRecord {
  sources: {
    briefs: RoleModdedViewSource[];
    skills: RoleModdedViewSource[];
  };
  paths: string[];
  hookBasis: RoleModdedViewHookBasis | null;
  refusal: {
    message: string;
    metadata: Record<string, unknown>;
    paths: string[];
  } | null;
}
export class RoleModdedViewRecord
  extends DomainLiteral<RoleModdedViewRecord>
  implements RoleModdedViewRecord {}
