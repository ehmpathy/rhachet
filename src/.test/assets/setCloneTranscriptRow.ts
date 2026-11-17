import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * .what = append one transcript row to a clone's linked history, as the brain-cli would write it
 * .why = the boot cache gate reads a lead's progress off its history; a test seeds that progress
 *   with this one shape, from the integration and the acceptance grain alike
 * .note = `seeded.jsonl`, a name no brain-cli transcript takes (those are `<exid>.jsonl`), so a
 *   real enroll's history relink never collides with the seed
 */
export const setCloneTranscriptRow = (input: {
  cloneDir: string;
  type: 'user' | 'assistant';
}): void => {
  const historyDir = join(input.cloneDir, 'history');
  mkdirSync(historyDir, { recursive: true });
  appendFileSync(
    join(historyDir, 'seeded.jsonl'),
    `${JSON.stringify({ type: input.type, message: { content: 'x' } })}\n`,
  );
};
