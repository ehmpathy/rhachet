import { join } from 'node:path';

/**
 * .what = the dir of one boot revision of an actor: `<actor>/boots/sha256=<hash>/`, or the
 *         root that holds every revision when no hash is given
 * .why = a clone spawns on the boot bytes of one instant; those bytes, and the drift a
 *        compaction reads beside them, belong to the actor (they derive from its roles), so
 *        every clone that spawned on the same bytes refers to the one dir by its hash
 *        (`rule.forbid.per-clone-config`)
 */
export const getActorBootRevisionDir = (input: {
  actorDir: string;
  hash: string | null;
}): string =>
  input.hash === null
    ? join(input.actorDir, 'boots')
    : join(input.actorDir, 'boots', `sha256=${input.hash}`);
