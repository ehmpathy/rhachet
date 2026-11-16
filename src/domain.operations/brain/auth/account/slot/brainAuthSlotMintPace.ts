/**
 * .what = the pace of the slot mint's retries: the racer re-reads and the park retries
 * .why = one place holds the knobs, so the ops read as narrative and the tests assert the same values
 * .note = a peer that won a mint race parks its successor within moments; 3 × 500ms covers it
 * .note = `racerHops` bounds how many successors in a row are chased, so a slot a peer rewrites
 *   without pause cannot hold a read in a loop
 */
export const BRAIN_AUTH_SLOT_MINT_PACE = {
  rereads: 3,
  rereadGapMs: 500,
  racerHops: 3,
  parkTries: 3,
  parkGapMs: 500,
} as const;
