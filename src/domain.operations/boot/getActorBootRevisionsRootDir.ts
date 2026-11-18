import { join } from 'node:path';

/**
 * .what = the dir that holds every boot revision of an actor: `<actor>/boots/`
 * .why = the drift sweep enumerates it; one owner keeps the name in one place
 */
export const getActorBootRevisionsRootDir = (input: {
  actorDir: string;
}): string => join(input.actorDir, 'boots');
