import { DomainLiteral } from 'domain-objects';

/**
 * .what = what a mod does to its role, per file, by role-relative path
 * .why = one plan feeds every reader: the view writer links by it, the boot tags by it,
 *        the notice and the cost row count it, and the pester lists it
 *
 * .note = every path is relative to the role dir (`briefs/rule.require.x.md`), the same key
 *   the role's own `boot.yml` globs use
 * .note = `minsDropped` holds each published `.md.min` a `.md` shadow hides. the boot prefers
 *   `.min` for content, so a shadow that left it live would render the original
 */
export interface RoleModPlan {
  shadows: string[];
  adds: string[];
  nots: string[];
  minsDropped: string[];
}
export class RoleModPlan
  extends DomainLiteral<RoleModPlan>
  implements RoleModPlan {}
