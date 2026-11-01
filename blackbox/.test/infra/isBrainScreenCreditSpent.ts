/**
 * .what = true when a brain's screen or reply says the anthropic api credit is spent
 * .why = a tier-2 run on a spent credit otherwise fails as a bare `landed: false` after its
 *   poll; the claude cli prints this cause on screen, so a reader of the failure sees it named
 */
export const isBrainScreenCreditSpent = (input: { text: string }): boolean =>
  /credit balance (is )?too low/i.test(input.text);
