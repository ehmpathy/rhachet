/**
 * .what = CloneSerialHuman — a clone's serial projected to its FIRST uuid segment (the
 *   first 8 hex chars), the short, human-legible form of the address
 * .why =
 *   - a full uuid serial (`49b41f88-2b5b-4c50-b69e-b18d2d50dfda`) is unusable at a human
 *     keyboard; the first segment (`49b41f88`) is enough to recognize and to type, exactly
 *     as git shows a short sha
 *   - this is a LOSSY, display-only projection — the twin of IsoPriceHuman: the human form
 *     is for READS, the full serial is kept internally (the json/machine view, the
 *     `.serials/` index, the on-disk dir) and remains the canonical identity
 *   - it CAN collide when two clones in one repo share a first-8-hex prefix — vanishingly
 *     unlikely, and the ergonomic win is worth it. reach handles a collision loud: an
 *     abbreviated address that matches more than one clone fails with the candidates named
 *     (getOneCloneByRef), never a silent wrong-clone
 */
export type CloneSerialHuman = string & { _brand: 'CloneSerialHuman' };

/**
 * .what = cast a full serial (uuid) into its human form — the first uuid segment
 * .why = one owner of the "short serial" rule, so the list view and any future human
 *   render show the SAME prefix; the reach path (getOneCloneByRef) resolves that same
 *   prefix back to the full serial (git-style unique-prefix match)
 * .note = pure: a plain string slice; the full serial is never mutated or lost
 */
export const asCloneSerialHuman = (input: {
  serial: string;
}): CloneSerialHuman => input.serial.split('-')[0]! as CloneSerialHuman;
