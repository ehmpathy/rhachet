/**
 * .what = how many blocks a boot delta changed, added, and removed
 * .why = the delta, the clone drift, and the readout each count blocks; one named shape keeps them
 *        in step
 */
export type BootDeltaCounts = {
  changed: number;
  added: number;
  removed: number;
};
