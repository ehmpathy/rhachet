import { RoleRegistry } from '@src/contract/sdk';
import { EXAMPLE_REGISTRY } from './example.echoRegistry';

/**
 * .what = a config whose registry list holds the SAME registry twice, so every role
 *   slug in it collides with itself
 * .why = `assureUniqueRoles` raises a `ConstraintError` on a duplicate slug, from `invoke`'s
 *   body rather than from inside `program.parseAsync`. so this fixture is a CLASSIFIED fault
 *   on the surface where `invoke.unclassifiedThrow.integration.test.ts` `[case1]` raises an
 *   unclassified one — with no credential, no network, and no brain
 *
 * .note = it serves `[case3]`. a duplicate slug is the caller's to settle — they chose which
 *   registries to link — so it exits 2. the unclassified case is `[case1]`, whose specimen is
 *   `example.rhachet.use.plainThrow.ts`.
 *
 * .why the same registry TWICE rather than two registries that share a slug = the
 *   collision is then a property of this file alone. two registries would put the
 *   trigger in a second asset, where an unrelated edit to either one could silently
 *   retire the case (`rule.require.clamp-edge-cases`)
 */
export const getRoleRegistries = async (): Promise<RoleRegistry[]> => {
  return [EXAMPLE_REGISTRY, EXAMPLE_REGISTRY];
};
