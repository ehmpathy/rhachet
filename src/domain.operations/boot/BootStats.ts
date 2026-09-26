/**
 * .what = the census of one boot corpus — what it says, what it refs, and its size
 * .why = the per-role render, the summed corpus, the `roles boot` header and the
 *        render-time census line all read one shape
 *
 * .note = chars counts only `say` content, since only that content spends tokens
 */
export type BootStats = {
  roles: number;
  files: number;
  briefsSay: number;
  briefsRef: number;
  skillsSay: number;
  skillsRef: number;
  chars: number;
};

/**
 * .what = the zero census, the identity for a sum
 */
export const BOOT_STATS_ZERO: BootStats = {
  roles: 0,
  files: 0,
  briefsSay: 0,
  briefsRef: 0,
  skillsSay: 0,
  skillsRef: 0,
  chars: 0,
};
