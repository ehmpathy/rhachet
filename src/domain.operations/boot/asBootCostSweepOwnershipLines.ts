import type { BootSpecCost } from '@src/domain.operations/boot/getAllRepoBootSpecCosts';

/**
 * .what = the note that says what a `(linked)` row means, printed only where one exists
 * .why = the tag on a row is a MARKER; a marker with no sense is a puzzle. this states the
 *        consequence a reader acts on — the budget on that spec is another repo's to raise,
 *        so no remedy the reader can run will move it.
 *
 * 🔴 .note = the report holds the same ownership split the gate does: the gate warns rather
 *   than halts on a foreign spec, so the roster marks a foreign row and names what the reader
 *   can act on.
 *
 * .note = it returns `[]` where every spec is ours, so a repo with no linked roles pays no
 *   lines for a distinction it does not have. a legend that fires unconditionally teaches a
 *   tag the reader will never see (`rule.forbid.rambles`).
 * .note = a `(linked)` spec this repo mods is partly the reader's: the mod's shadows and adds
 *   are in its payload, and a shadow that drops a `.md.min` is the common cause of an overrun.
 *   so a modded linked row earns a second note that names the part the reader can trim
 */
export const asBootCostSweepOwnershipLines = (input: {
  costs: BootSpecCost[];
  pathsToSpecModded: string[];
}): string[] => {
  const foreign = input.costs.filter((one) => one.isForeign);
  if (foreign.length === 0) return [];
  const foreignModded = foreign.filter((one) =>
    input.pathsToSpecModded.includes(one.pathToSpec),
  );

  const linesLinked = [
    `   .note = a \`(linked)\` spec is owned by another repo — not yours to trim. its budget is`,
    `           that repo's to raise, so \`roles boot\` warns on it rather than halts. upgrade`,
    `           the package, or raise it upstream. (${foreign.length} of ${input.costs.length} here)`,
  ];
  const linesModded =
    foreignModded.length === 0
      ? []
      : [
          `   .note = a \`(linked)\` spec marked \`[~] modded\` carries your mod's shadows and adds,`,
          `           and those are yours to trim in .agent/repo=.mods/. a shadow with no \`.md.min\``,
          `           beside it boots at full size. (${foreignModded.length} of ${foreign.length} linked here)`,
        ];
  return [...linesLinked, ...linesModded, ``];
};
