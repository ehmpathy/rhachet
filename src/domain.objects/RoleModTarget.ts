import { DomainLiteral } from 'domain-objects';

/**
 * .what = the role a mod is over, as its `of:` key names it
 * .why = a mod names its role by `repo/role`, and optionally the version its files were
 *        made against — the version drives the onStop pester
 *
 * .note = `repo: null` is a bare slug (`of: mechanic`). it is legal only while one linked
 *   repo ships that slug; the lookup refuses it otherwise (usecase 6)
 * .note = `version: null` means the author opted out of the version pester
 */
export interface RoleModTarget {
  repo: string | null;
  role: string;
  version: string | null;
}
export class RoleModTarget
  extends DomainLiteral<RoleModTarget>
  implements RoleModTarget {}
