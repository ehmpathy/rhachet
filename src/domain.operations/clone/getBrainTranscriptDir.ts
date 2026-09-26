import type { BrainSlug } from '@src/domain.objects/BrainSlug';

import { join } from 'node:path';
import { asClaudeProjectSlug } from './asClaudeProjectSlug';

/**
 * .what = the on-disk dir where a brain writes its transcripts for one cwd, or
 *   null for a brain we have no observe adapter for
 * .why =
 *   - a clone's history LINKS to the brain-cli's OWN transcripts (zero-copy); to
 *     find them we must know where the brain writes them. that location is a
 *     per-brain fact — claude uses `<configDir>/projects/<cwd-slug>/` — so this is a
 *     per-brain adapter, null for any brain without a known transcript layout
 *   - a null return is the "no observe adapter" signal, NOT an error: the clone
 *     still spawns and works, its history is simply empty (get reads no output)
 *
 * .note = the brain dir is the one its ACTOR owns, set by the
 *   spawn env — never the parent's env; see asCloneBrainDir for the one route
 */
export const getBrainTranscriptDir = (input: {
  brain: BrainSlug;
  brainDir: string;
  cwd: string;
}): string | null => {
  const isClaude = input.brain === 'claude' || input.brain === 'claude-code';
  if (!isClaude) return null;
  return join(
    input.brainDir,
    'projects',
    asClaudeProjectSlug({ cwd: input.cwd }),
  );
};
