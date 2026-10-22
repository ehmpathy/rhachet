import type { RoleFocusChange } from './asRoleFocusChanges';

/**
 * .what = the receipt block that names each focus change and each `always` shed
 * .why = a `+role::subject` delta narrows, moves, or widens by what was held (F6), and a
 *        subject may shed `always`. both change what the clone boots, so neither is silent
 *
 * .note = naught renders where no focus was touched, so an unfocused enroll prints as it did;
 *         a focus re-typed as held renders as `unchanged` (E2), so a no-op reads as one
 * .note = pure transformer — no i/o, deterministic
 */
export const asRoleFocusReceiptLines = (input: {
  changes: RoleFocusChange[];
  alwaysShed: string[];
}): string[] => {
  const leaves = [
    ...input.changes.map(asRoleFocusChangeLeaf),
    ...input.alwaysShed.map(
      (role) => `${role} sheds its always block, as its focus declares`,
    ),
  ];
  // no focus touched → no block, so an unfocused call prints as it did
  if (leaves.length === 0) return [];

  return [
    '🧢 focus',
    ...leaves.map(
      (leaf, index) =>
        `   ${index === leaves.length - 1 ? '└─' : '├─'} ${leaf}`,
    ),
  ];
};

/**
 * .what = one change as a leaf — the role, the verb, and the focus it lands on
 */
const asRoleFocusChangeLeaf = (change: RoleFocusChange): string => {
  const asFocus = (subjects: string[] | null): string =>
    subjects === null ? 'the whole role' : `::${subjects.join(',')}`;
  if (change.kind === 'given')
    return `${change.role} focused at ${asFocus(change.to)}`;
  if (change.kind === 'narrow')
    return `${change.role} narrowed to ${asFocus(change.to)}`;
  if (change.kind === 'widen')
    return `${change.role} widened to ${asFocus(change.to)}`;
  if (change.kind === 'unchanged')
    return `${change.role} unchanged at ${asFocus(change.to)}`;
  return `${change.role} moved from ${asFocus(change.from)} to ${asFocus(change.to)}`;
};
