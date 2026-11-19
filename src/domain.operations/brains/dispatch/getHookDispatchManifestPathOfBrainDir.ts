import { join } from 'node:path';
import { HOOK_DISPATCH } from './constants';

/**
 * .what = the path of a brain dir's dispatch manifest (`<brainDir>/hooks.dispatch.manifest`)
 * .why = the sync, the enroll derive and the actor tally each locate the manifest; one getter
 *   keeps them on one path, so a move of the manifest is one change
 */
export const getHookDispatchManifestPathOfBrainDir = (input: {
  brainDir: string;
}): string => join(input.brainDir, HOOK_DISPATCH.manifest);
