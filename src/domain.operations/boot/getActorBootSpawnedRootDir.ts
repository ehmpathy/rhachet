import { join } from 'node:path';

/**
 * .what = the dir that holds every clone's spawn boot of an actor: `<actor>/boots/`
 * .why = the drift sweep enumerates it; one owner keeps the name in one place
 */
export const getActorBootSpawnedRootDir = (input: {
  actorDir: string;
}): string => join(input.actorDir, 'boots');
