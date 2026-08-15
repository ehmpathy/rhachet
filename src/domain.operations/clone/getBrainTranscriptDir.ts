import type { BrainSlug } from '@src/domain.objects/BrainSlug';

import { homedir } from 'node:os';
import { join } from 'node:path';
import { asClaudeProjectSlug } from './asClaudeProjectSlug';

/**
 * .what = the on-disk dir where a brain writes its transcripts for one cwd, or
 *   null for a brain we have no observe adapter for
 * .why =
 *   - a clone's history LINKS to the brain-cli's OWN transcripts (zero-copy); to
 *     find them we must know where the brain writes them. that location is a
 *     per-brain fact — claude uses `<config>/projects/<cwd-slug>/` — so this is a
 *     per-brain adapter, null for any brain without a known transcript layout
 *   - a null return is the "no observe adapter" signal, NOT an error: the clone
 *     still spawns and works, its history is simply empty (get reads no output)
 *
 * .note = claude's config root honors $CLAUDE_CONFIG_DIR (else ~/.claude), so a
 *   test points it at a temp dir and the stub brain writes its transcript there —
 *   the same seam a human's real claude uses
 */
export const getBrainTranscriptDir = (input: {
  brain: BrainSlug;
  cwd: string;
}): string | null => {
  const isClaude = input.brain === 'claude' || input.brain === 'claude-code';
  if (!isClaude) return null;

  const configDir =
    process.env['CLAUDE_CONFIG_DIR'] ?? join(homedir(), '.claude');
  return join(configDir, 'projects', asClaudeProjectSlug({ cwd: input.cwd }));
};
