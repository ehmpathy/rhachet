/**
 * .what = the smallest grid a clone screen can be READ at
 * .why =
 *   - `@xterm/headless` clamps a Terminal to its own minimum (2 cols x 1 row) rather than
 *     refuse a degenerate size. a grid that small renders no input box, so
 *     `computeCloneInputState` classifies every probe `focus: 'unrecognized'` and
 *     `computeCloneDispatchPrecheck` withholds every say — permanently, for that clone's life
 *   - ⇒ so the floor is a READABILITY floor, never a cosmetic default. 80x24 is the
 *     historical terminal default and the size every test host already declares
 */
export const PTY_GEOMETRY_FLOOR = { cols: 80, rows: 24 } as const;

/**
 * .what = clamp a host-reported terminal size to a geometry a screen read can survive
 *
 * .why = `process.stdout.columns` is `undefined` on a pipe AND `0` on a tty whose winsize
 *   was never set. a `??` fallback catches only the first, so the second reaches the pty and
 *   the emulator as a real `0` — and `0` is not an absent value the caller can notice, it is
 *   a number that silently produces an unreadable clone (`rule.forbid.failhide`).
 *
 * .note = the two degenerate classes are treated DIFFERENTLY, and the split is the point:
 *   - a value that names no grid — absent, NaN, Infinity — is REPLACED by the floor. there is
 *     no number in it to preserve
 *   - a value that names a grid imprecisely — `120.7` — is TRUNCATED, then clamped. it carries
 *     real geometry, and to replace it would discard 40 columns to repair a fractional part
 *   ⇒ so the floor only ever RAISES an axis. it never lowers one that was already readable.
 *
 * @example
 *   asPtyGeometry({ cols: 120, rows: 40 })            // { cols: 120, rows: 40 } — untouched
 *   asPtyGeometry({ cols: 0, rows: 0 })               // { cols: 80, rows: 24 } — the defect
 *   asPtyGeometry({ cols: undefined, rows: 40 })      // { cols: 80, rows: 40 } — per axis
 *   asPtyGeometry({ cols: 120.7, rows: 40.2 })        // { cols: 120, rows: 40 } — truncated, kept
 */
export const asPtyGeometry = (input: {
  cols: number | undefined | null;
  rows: number | undefined | null;
}): { cols: number; rows: number } => {
  const asReadableAxis = (
    value: number | undefined | null,
    floor: number,
  ): number => {
    // a non-number (a pipe's `undefined`, a null) has no geometry to read at all
    if (typeof value !== 'number') return floor;

    // NaN and Infinity name no grid, so neither can be truncated toward one
    if (!Number.isFinite(value)) return floor;

    // 🔴 TRUNCATE, never reject. a fractional axis is a host that measured imprecisely, not a host
    // with no geometry — `120.7` plainly means ~120 columns, and to send it to the floor would
    // DISCARD 40 real columns to repair a fractional part. only the clamp below may lower an axis
    const whole = Math.trunc(value);

    return whole < floor ? floor : whole;
  };

  return {
    cols: asReadableAxis(input.cols, PTY_GEOMETRY_FLOOR.cols),
    rows: asReadableAxis(input.rows, PTY_GEOMETRY_FLOOR.rows),
  };
};
