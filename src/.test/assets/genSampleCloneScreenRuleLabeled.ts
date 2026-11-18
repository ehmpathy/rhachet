/**
 * .what = a sample input-box top rule that carries an agent name
 * .why = claude code draws a clone's agent name into the box's top rule; this is the shape
 *   measured in ehmpathy/rhachet#655 (`────────────────────────────── mechanic ─`), shared so
 *   every screen test clamps the one measured geometry
 */
export const genSampleCloneScreenRuleLabeled = (
  input: { label: string } = { label: 'mechanic' },
): string => `${'─'.repeat(30)} ${input.label} ─`;
