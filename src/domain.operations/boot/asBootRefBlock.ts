/**
 * .what = the longest directory prefix every path shares, slash included
 * .why = the base a ref block hoists. a shared prefix emitted once costs its own length; the
 *        same prefix emitted per line costs it N times, and a path string is the densest text
 *        a boot emits (measured 3.16 chars/token, against 4.01 for prose)
 *
 * .note = it compares by SEGMENT, never by character, so two siblings that merely share a
 *   name stem (`term=absent…` / `term=accrual…`) hoist naught — a character-wise prefix would
 *   cut `term=a` and leave a base no reader could open.
 */
const getOneCommonDirPrefix = (input: { paths: string[] }): string => {
  if (!input.paths.length) return '';

  const dirsAll = input.paths.map((path) => path.split('/').slice(0, -1));
  const shared = getAllSegmentsShared({ dirsAll });
  return shared.length ? `${shared.join('/')}/` : '';
};

/**
 * .what = the lead dir segments every path agrees on, in order
 * .why = the segment walk is the one step a reader must simulate, so it sits behind a name
 *        and the prefix above reads as "split, share, join"
 */
const getAllSegmentsShared = (input: { dirsAll: string[][] }): string[] => {
  const [dirsFirst, ...dirsRest] = input.dirsAll;
  if (!dirsFirst) return [];

  // the first segment position where any path departs from the first; past it, naught is shared
  const indexFirstDiff = dirsFirst.findIndex((segment, index) =>
    dirsRest.some((dirs) => dirs[index] !== segment),
  );
  return indexFirstDiff === -1 ? dirsFirst : dirsFirst.slice(0, indexFirstDiff);
};

/**
 * .what = the roster of paths a reader may dereference, as one block under one base
 * .why = 🔴 a ref is EMITTED, so it occupies context and the budget counts it. measured
 *        2026-09-22 on this repo's own boot, the roster was 276 lines = 8,404 tokens — 57%
 *        of the payload, and more than every resident document combined.
 *
 *        the `<brief.ref path="…"/>` tag and the full role prefix are constant across the set,
 *        so both hoist into the header and the lines carry names alone.
 *
 * .note = an empty roster emits no block, never an empty one — a header that advertises a set
 *   with no members is chrome a reader must read to learn it says naught
 *   (`define.invariant.empty-render-names-its-cause`).
 */
export const asBootRefBlock = (input: {
  tag: 'briefs.ref' | 'skills.ref';
  paths: string[];
  indent: string;
}): string[] => {
  if (!input.paths.length) return [];

  const indent = input.indent;
  const base = getOneCommonDirPrefix({ paths: input.paths });

  return [
    `${indent}<${input.tag} base="${base}">`,
    ...input.paths.map((path) => `${indent}${path.slice(base.length)}`),
    `${indent}</${input.tag}>`,
    '',
  ];
};
