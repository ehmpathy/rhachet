/**
 * .what = whether the stop sweep holds: any owned drift the clone can repair here
 * .why = an owned boot past its cap, an owned content defect, or a mod pin past its role each
 *        hold the stop; a linked defect never does (`rule.forbid.content-checks-that-halt-enroll`)
 */
export const isRoleCostHookHeld = (input: {
  over: unknown[];
  defects: unknown[];
  drifts: unknown[];
}): boolean =>
  input.over.length > 0 || input.defects.length > 0 || input.drifts.length > 0;
