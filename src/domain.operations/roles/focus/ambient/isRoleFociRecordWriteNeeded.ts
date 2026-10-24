/**
 * .what = whether the ambient role foci record must be written
 * .why = the write is idempotent: only a changed record is written, and an empty record is
 *        never written to a file that does not exist yet
 *
 * .note = records compare by role, so a role re-added at the same focus (which moves its key)
 *         reads as unchanged
 * .note = pure transformer — no i/o, deterministic; the caller probes the file
 */
export const isRoleFociRecordWriteNeeded = (input: {
  fociPrior: Record<string, string[]>;
  foci: Record<string, string[]>;
  isFileExtant: boolean;
}): boolean => {
  // an unchanged record needs no write
  if (asFociRecordKey(input.foci) === asFociRecordKey(input.fociPrior))
    return false;

  // a changed record is written where a file holds it, or where it holds any focus
  return input.isFileExtant || Object.keys(input.foci).length > 0;
};

/**
 * .what = a record's comparison key, with its roles in sorted order
 */
const asFociRecordKey = (foci: Record<string, string[]>): string =>
  JSON.stringify(
    Object.entries(foci).sort(([left], [right]) => left.localeCompare(right)),
  );
