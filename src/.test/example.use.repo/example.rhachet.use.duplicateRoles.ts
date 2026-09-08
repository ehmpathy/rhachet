import { RoleRegistry } from '@src/contract/sdk';
import { EXAMPLE_REGISTRY } from './example.echoRegistry';

/**
 * .what = a config whose registry list holds the SAME registry twice, so every role
 *   slug in it collides with itself
 * .why = `assureUniqueRoles` throws a PLAIN `Error` on a duplicate slug, and it throws
 *   from `invoke`'s body rather than from inside `program.parseAsync`. so this one
 *   fixture reaches BOTH halves of the unclassified-throw defect at once — an error the
 *   cli cannot classify, raised on the path the cli's own catch never covered — with no
 *   credential, no network, and no brain
 *
 * .why the same registry TWICE rather than two registries that share a slug = the
 *   collision is then a property of this file alone. two registries would put the
 *   trigger in a second asset, where an unrelated edit to either one could silently
 *   retire the case (`rule.require.clamp-edge-cases`)
 */
export const getRoleRegistries = async (): Promise<RoleRegistry[]> => {
  return [EXAMPLE_REGISTRY, EXAMPLE_REGISTRY];
};
