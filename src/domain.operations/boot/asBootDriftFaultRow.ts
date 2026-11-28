import { basename } from 'node:path';
import type { BootDriftFault } from './BrainDirBootRender';

/**
 * .what = one drift fault as a row: the dir it sits in, marked as a path, then the reason
 * .why = a bare basename such as `clones` reads as a verb before the reason; `in clones/,` reads
 *        as a place. one owner, so the enroll stderr and the init readout draw the same row
 */
export const asBootDriftFaultRow = (input: { fault: BootDriftFault }): string =>
  `✗ in ${basename(input.fault.path)}/, ${input.fault.reason}`;
