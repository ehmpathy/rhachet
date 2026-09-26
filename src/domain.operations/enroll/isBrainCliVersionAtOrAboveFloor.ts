import type { BrainCliVersion } from './asBrainCliVersion';

/**
 * .what = whether a version is at or above a floor, compared part by part
 * .why = a numeric triple compare needs no semver dependency
 */
export const isBrainCliVersionAtOrAboveFloor = (input: {
  version: BrainCliVersion;
  floor: BrainCliVersion;
}): boolean => {
  const { version, floor } = input;
  if (version.major !== floor.major) return version.major > floor.major;
  if (version.minor !== floor.minor) return version.minor > floor.minor;
  return version.patch >= floor.patch;
};
