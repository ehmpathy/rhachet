import { asSecondsFromEtime } from './asSecondsFromEtime';

/**
 * .what = the count of this checkout's brain stubs, in a `ps -eo etime=,args=` table, older
 *   than any stub of today could be
 * .why = a stub younger than the cap may belong to a live run; one older predates the cap, so it
 *   is residue an earlier run left
 */
export const asStubResidueCount = (input: {
  psTable: string;
  stubPath: string;
  stubAgeMinSeconds: number;
}): number =>
  input.psTable
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.includes(input.stubPath))
    .filter(
      (line) =>
        asSecondsFromEtime({ etime: line.split(/\s+/)[0] ?? '' }) >= input.stubAgeMinSeconds,
    ).length;
