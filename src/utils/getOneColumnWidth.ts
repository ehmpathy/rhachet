/**
 * .what = the width of a text column — the length of its widest cell
 * .why = every aligned render pads its column to one width. a width computed inline at each
 *        render drifts between them, so the arithmetic has one owner
 *
 * .note = an empty column has width 0, never `-Infinity` (what `Math.max()` of no args yields)
 */
export const getOneColumnWidth = (input: { cells: string[] }): number =>
  input.cells.reduce((widest, cell) => Math.max(widest, cell.length), 0);
