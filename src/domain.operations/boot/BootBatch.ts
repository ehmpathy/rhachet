/**
 * .what = one addressable run of the body — a say resource, or a whole ref roster
 * .why = the unit an author can ACT on. every budget remedy (`catalogize` · `condense` ·
 *        `reference` · `eliminate`) operates on exactly one of these, so a cost report
 *        ranked by batch names what the author would edit.
 */
export interface BootBatch {
  /**
   * what it is — a resource's labeled path, or the roster block's tag
   */
  slug: string;

  /**
   * whether it is resident content, or a roster of addressable paths
   */
  kind: 'say' | 'ref';

  lines: string[];
}
